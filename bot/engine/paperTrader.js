/**
 * Paper Trade Tracker v2 — Self-Learning Paper Trading System
 *
 * PURPOSE:
 * - Records every opportunity the scanner recommends with full signal data
 * - AUTOMATICALLY checks if paper-traded markets have resolved via Polymarket API
 * - When markets resolve, calculates hypothetical P&L
 * - Feeds signal-level outcomes back to probabilityModel for adaptive weights
 * - Feeds strategy-level outcomes to strategyLearner for threshold tuning
 * - Provides comprehensive performance metrics: win rate, Sharpe, ROI, by-strategy
 *
 * DATA FLOW:
 *   Scanner → recordScanResults() → paper trades stored with signal snapshots
 *   checkResolutions() [every 60s] → queries Polymarket for resolved markets
 *   → resolveMarket() → hypothetical P&L calculated → signal feedback
 *   → probabilityModel.recordResolution() → adaptive signal weights
 *   → strategyLearner.recordOutcome() → strategy threshold tuning
 *
 * SELF-LEARNING LOOP:
 *   Record → Observe outcome → Measure accuracy → Adjust weights/thresholds → Repeat
 */

const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');
const fees = require('./fees');

// Lazy-load to avoid circular deps
let client = null;
let probabilityModel = null;
let strategyOptimizer = null;

function getClient() {
  if (!client) client = require('../polymarket/client');
  return client;
}
function getProbModel() {
  if (!probabilityModel) probabilityModel = require('./probabilityModel');
  return probabilityModel;
}
function getOptimizer() {
  if (!strategyOptimizer) {
    try { strategyOptimizer = require('./strategyOptimizer'); } catch { /* optional */ }
  }
  return strategyOptimizer;
}

const DATA_FILE = path.join(__dirname, '../logs/paper-trades.json');
const LEARNING_FILE = path.join(__dirname, '../logs/learning-state.json');
const MAX_HISTORY = 2000;
// DEDUP FIX (2026-03-11): Changed from 5-min window to per-market-lifetime.
// Old 5-min window caused same market to be bet 7.4x on average (726 trades on 128 markets).
// Now: one paper trade per (conditionId, strategy, side) for the lifetime of the market.
const DEDUP_WINDOW_MS = Infinity;        // Per-market lifetime — never re-bet same position
const ARB_DEDUP_WINDOW_MS = Infinity;    // Per-market lifetime for arbs too
const RESOLUTION_CHECK_MS = 60000;      // Check resolutions every 60 seconds
const MAX_RESOLUTION_BATCH = 15;        // Max API calls per resolution check cycle (rate limit friendly)
const DEFAULT_PAPER_BANKROLL = 50;      // $50 starting simulated bankroll
const MIN_HOURS_TO_CLOSE = 12;          // Minimum time until market closes (prevents "expired without resolving")
const MAX_DAYS_HORIZON = 30;            // Block trades resolving > 30 days out
const MEDIUM_HORIZON_DAYS = 7;          // 8-30 days requires higher score
const MEDIUM_HORIZON_MIN_SCORE = 60;    // Score threshold for 8-30 day markets
const MAX_OPEN_POSITIONS = 50;          // Hard cap on concurrent open trades
const CAPITAL_RESERVE_PCT = 0.05;       // Keep 5% bankroll as reserve (never allocate 100%)
const DISABLED_STRATEGIES = new Set(['NO_BETS']); // Strategies permanently disabled from paper trading

let paperTrades = [];
let resolvedTrades = [];
let signalSnapshots = {};
let resolutionCheckInterval = null;

// ─── Simulated Bankroll ──────────────────────────────────────────────
let simBankroll = DEFAULT_PAPER_BANKROLL;
let simBankrollHistory = [];    // { timestamp, bankroll, event }
let simBusted = false;          // Circuit breaker: true if bankroll hit $0
let startingBankrollOverride = null; // Set when user calls setSimBankroll

// ─── Notification Callback ───────────────────────────────────────────
let _onNotify = null;  // (event, data) => void — set via setNotifyCallback

// ─── Capital Tracking Helpers ────────────────────────────────────────
/**
 * Get total capital locked in open positions (only trades with costDeducted).
 * Under the new system, simBankroll already reflects deductions, so this
 * is mainly for reporting.
 */
function getLockedCapital() {
  return paperTrades
    .filter(t => !t.resolved && t.costDeducted)
    .reduce((sum, t) => sum + (t.kellySize || 0), 0);
}

function getOpenPositionCount() {
  return paperTrades.filter(t => !t.resolved).length;
}

function getAvailableCapital() {
  // simBankroll already has entry costs deducted for costDeducted trades
  // For legacy trades (no costDeducted), their cost is NOT deducted from bankroll
  // So available = simBankroll minus un-deducted legacy costs
  const legacyLocked = paperTrades
    .filter(t => !t.resolved && !t.costDeducted)
    .reduce((sum, t) => sum + (t.kellySize || 0), 0);
  return Math.max(0, simBankroll - legacyLocked);
}

// ─── Strategy Learning State ─────────────────────────────────────────
// Tracks per-strategy performance and auto-adjusts thresholds
let learningState = {
  strategyPerformance: {},    // strategy → { wins, losses, totalPnL, avgScore, recentResults[] }
  signalAccuracy: {},         // signalName → { correct, total, recentResults[] }
  confidenceAccuracy: {},     // confidence → { correct, total }
  scoreThresholds: {},        // strategy → { learned minScore based on profitability }
  patternPerformance: {},     // "STRATEGY:SIDE" → { wins, losses, totalPnL, streak, recentResults[] }
  blockedPatterns: {},        // "STRATEGY:SIDE" → { reason, blockedAt, winRate, trades, cooldownUntil }
  lastLearningUpdate: null,
  totalResolutions: 0,
  learningVersion: 0,        // Increments each time thresholds are adjusted
};

// ─── Persistence ─────────────────────────────────────────────────────
function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      paperTrades = data.paperTrades || [];
      resolvedTrades = data.resolvedTrades || [];
      signalSnapshots = data.signalSnapshots || {};
      simBankroll = data.simBankroll ?? DEFAULT_PAPER_BANKROLL;
      simBankrollHistory = data.simBankrollHistory || [];
      simBusted = data.simBusted || false;
      startingBankrollOverride = data.startingBankrollOverride ?? null;
      log.info('PAPER_TRADER', `Loaded ${paperTrades.length} paper trades, ${resolvedTrades.length} resolved, bankroll $${simBankroll}`);
    }
  } catch (err) {
    log.warn('PAPER_TRADER', `Failed to load trades: ${err.message}`);
  }

  try {
    if (fs.existsSync(LEARNING_FILE)) {
      const data = JSON.parse(fs.readFileSync(LEARNING_FILE, 'utf8'));
      learningState = { ...learningState, ...data };
      log.info('PAPER_TRADER', `Loaded learning state v${learningState.learningVersion}: ${learningState.totalResolutions} resolutions`);
    }
  } catch (err) {
    log.warn('PAPER_TRADER', `Failed to load learning state: ${err.message}`);
  }

  // One-time migration: backfill costDeducted for legacy pending trades
  migrateCapitalTracking();

  // Sync riskManager peak with actual paper bankroll (fixes false DRAWDOWN HALT)
  try {
    const riskManager = require('./riskManager');
    const peak = riskManager.getPeakBankroll();
    if (peak > simBankroll * 5) {
      riskManager.setPeakBankroll(simBankroll);
      log.info('PAPER_TRADER', `Reset riskManager peak $${peak.toFixed(2)} -> $${simBankroll.toFixed(2)} (was using wrong default)`);
    }
  } catch (e) { /* riskManager optional */ }
}

/**
 * Migrate legacy trades to the capital-tracking system.
 * Legacy trades never had their cost deducted from bankroll on entry.
 * Keep the newest trades that fit within bankroll + position limit,
 * expire the rest.
 */
function migrateCapitalTracking() {
  const pending = paperTrades.filter(t => !t.resolved && !t.costDeducted);
  if (pending.length === 0) return; // Already migrated or no legacy trades

  log.info('PAPER_TRADER', `💰 Migrating ${pending.length} legacy trades to capital tracking (bankroll $${simBankroll})...`);

  // Sort newest first — prefer to keep recent trades
  pending.sort((a, b) => new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0));

  let available = simBankroll;
  let kept = 0;
  let expiredCount = 0;

  for (const trade of pending) {
    const cost = trade.kellySize || 0;
    if (kept < MAX_OPEN_POSITIONS && cost <= available && available > 1) {
      // Keep this trade — deduct cost from available bankroll
      available = r2(available - cost);
      trade.costDeducted = true;
      kept++;
    } else {
      // Can't afford or over position limit — expire
      trade.resolved = true;
      trade.outcome = 'EXPIRED';
      trade.pnl = {
        grossPnL: 0, fee: 0, netPnL: 0, payout: 0,
        hypotheticalShares: 0, won: null, returnPct: 0,
      };
      trade.resolvedAt = new Date().toISOString();
      trade.expireReason = 'Capital migration — insufficient bankroll';
      resolvedTrades.push({ ...trade });
      expiredCount++;
    }
  }

  // Update bankroll to reflect deducted costs
  simBankroll = r2(available);
  log.info('PAPER_TRADER', `💰 Migration complete: kept ${kept} trades, expired ${expiredCount}, available $${simBankroll}`);
  save();
}

function save() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      paperTrades: paperTrades.slice(-MAX_HISTORY),
      resolvedTrades: resolvedTrades.slice(-MAX_HISTORY),
      signalSnapshots,
      simBankroll,
      simBankrollHistory: simBankrollHistory.slice(-500),
      simBusted,
      startingBankrollOverride,
      savedAt: new Date().toISOString(),
    }, null, 2));
  } catch (err) {
    log.warn('PAPER_TRADER', `Failed to save trades: ${err.message}`);
  }
}

function saveLearningState() {
  try {
    fs.mkdirSync(path.dirname(LEARNING_FILE), { recursive: true });
    fs.writeFileSync(LEARNING_FILE, JSON.stringify({
      ...learningState,
      savedAt: new Date().toISOString(),
    }, null, 2));
  } catch (err) {
    log.warn('PAPER_TRADER', `Failed to save learning state: ${err.message}`);
  }
}

// ─── Record Recommendations ──────────────────────────────────────────

/**
 * Extract end date from opportunity or parse from market name.
 * Returns { endDate: Date|null, daysLeft: number|null }
 */
function extractEndDate(opp) {
  // 1. Direct endDate field from strategy
  if (opp.endDate) {
    const d = new Date(opp.endDate);
    if (!isNaN(d.getTime())) {
      return { endDate: d, daysLeft: Math.max(0, (d.getTime() - Date.now()) / 86400000) };
    }
  }

  // 2. Parse YYYY-MM-DD from market name
  const mkt = opp.market || opp.question || '';
  const isoMatch = mkt.match(/20\d{2}-\d{2}-\d{2}/);
  if (isoMatch) {
    const d = new Date(isoMatch[0] + 'T23:59:59Z');
    if (!isNaN(d.getTime())) {
      return { endDate: d, daysLeft: Math.max(0, (d.getTime() - Date.now()) / 86400000) };
    }
  }

  // 3. Check for year-only patterns like "2027" or "2028" (long-term markets)
  const yearMatch = mkt.match(/\b(202[7-9]|203\d)\b/);
  if (yearMatch) {
    const d = new Date(`${yearMatch[1]}-12-31T23:59:59Z`);
    return { endDate: d, daysLeft: Math.max(0, (d.getTime() - Date.now()) / 86400000) };
  }

  return { endDate: null, daysLeft: null };
}

/**
 * Record a batch of opportunities from a scan cycle.
 * Only records the top N to avoid flooding with low-quality noise.
 */
function recordScanResults(opportunities, maxRecord = 20) {
  if (simBusted) {
    log.warn('PAPER_TRADER', 'Bankroll busted — skipping paper trade recording. Reset to continue.');
    return 0;
  }

  const now = Date.now();
  let recorded = 0;
  let blocked = 0;

  // ─── Aggressiveness Ladder ────────────────────────────────────────
  // Phase 1 (0-20 resolutions): Explore — cast wider net, learn fast
  // Phase 2 (20-50 resolutions): Exploit — only bet proven patterns
  // Phase 3 (50+ resolutions): Aggressive exploit — high conviction only
  const totalRes = learningState.totalResolutions;
  let minScore, maxBets;
  if (totalRes < 20) {
    minScore = 40;   // Explore: still selective but not wild
    maxBets = 2;
  } else if (totalRes < 50) {
    minScore = 50;   // Exploit: only decent signals
    maxBets = 2;
  } else {
    minScore = 55;   // Aggressive: high conviction only
    maxBets = 1;
  }

  // ─── Drawdown-Based Scaling ───────────────────────────────────────
  // Reduce bet count when bankroll is in drawdown
  const startBankroll = startingBankrollOverride ?? DEFAULT_PAPER_BANKROLL;
  const drawdownPct = startBankroll > 0 ? (startBankroll - simBankroll) / startBankroll : 0;
  if (drawdownPct > 0.3) {
    maxBets = Math.max(1, Math.floor(maxBets * 0.5)); // 30%+ drawdown: halve bets
  } else if (drawdownPct > 0.15) {
    maxBets = Math.max(1, Math.floor(maxBets * 0.75)); // 15%+ drawdown: reduce by 25%
  }

  // ─── Position Limit Gate ───────────────────────────────────────────
  const openPositions = getOpenPositionCount();
  if (openPositions >= MAX_OPEN_POSITIONS) {
    log.info('PAPER_TRADER', `Position limit reached (${openPositions}/${MAX_OPEN_POSITIONS}) — skipping new trades`);
    return 0;
  }
  const positionsAvailable = MAX_OPEN_POSITIONS - openPositions;

  const topOpps = opportunities
    .filter(o => (o.score || 0) >= minScore)
    .slice(0, Math.min(maxRecord, maxBets, positionsAvailable));

  for (const opp of topOpps) {
    const key = `${opp.conditionId}:${opp.strategy}:${opp.side}`;

    // Dedup: one trade per (conditionId, strategy, side) across lifetime of market
    // Also check resolved trades to avoid re-entering markets we already tracked
    const existingActive = paperTrades.find(t => t.key === key);
    const existingResolved = resolvedTrades.find(t => t.key === key);
    if (existingActive || existingResolved) continue;

    // ─── Disabled Strategy Gate ───────────────────────────────────────
    if (DISABLED_STRATEGIES.has(opp.strategy)) {
      blocked++;
      continue; // Strategy permanently disabled
    }

    // ─── Pattern Learning Gate ────────────────────────────────────────
    // Check if this strategy+side combo has been blacklisted by the learning system
    const patternKey = `${opp.strategy}:${opp.side || 'YES'}`;
    if (isPatternBlocked(opp.strategy, opp.side || 'YES')) {
      // Shadow-track: record what WOULD have happened for blocked patterns
      // so their recentResults can update and patterns can eventually unblock
      shadowTrackBlocked(patternKey, opp);
      blocked++;
      continue;
    }

    // ─── Strategy Optimizer Gate ──────────────────────────────────────
    // Consult Thompson Sampling optimizer — skip if strategy is disabled
    const optimizer = getOptimizer();
    if (optimizer) {
      if (!optimizer.isEnabled(opp.strategy)) {
        blocked++;
        continue; // Strategy disabled by optimizer (30+ trades, <30% win rate)
      }
      // Scale position size by allocation (done below in posSize calc)
    }

    // In exploit mode (20+ resolutions), require pattern to have positive track record
    if (totalRes >= 20) {
      const pp = learningState.patternPerformance[patternKey];
      if (pp && pp.totalTrades >= 3 && (pp.wins / pp.totalTrades) < 0.35) {
        blocked++;
        continue; // Pattern has poor track record — skip
      }
    }

    // ─── Learned Score Threshold Gate ─────────────────────────────────
    // Use the learned profitCutoff if we have enough data — overrides ladder minimum
    const learnedT = getLearnedThreshold(opp.strategy);
    if (learnedT && learnedT.sampleSize >= 5) {
      const effectiveMin = Math.max(minScore, learnedT.profitCutoff);
      if ((opp.score || 0) < effectiveMin) {
        blocked++;
        continue; // Below learned profitable threshold for this strategy
      }
    }

    // ─── Time Horizon Gate ──────────────────────────────────────────
    // Primary (≤7 days): normal thresholds — fast feedback for learning
    // Secondary (8-30 days): require score ≥60 — bigger edges justify wait
    // Block (>30 days): skip entirely — no value in locking up capital
    // Minimum (< 12 hours): skip entirely — will expire before resolution checks
    const { endDate: oppEndDate, daysLeft } = extractEndDate(opp);
    if (daysLeft !== null) {
      if (daysLeft > MAX_DAYS_HORIZON) {
        blocked++;
        continue; // Market too far out — skip
      }
      if (daysLeft > MEDIUM_HORIZON_DAYS && (opp.score || 0) < MEDIUM_HORIZON_MIN_SCORE) {
        blocked++;
        continue; // Medium-term market needs higher conviction
      }
      const hoursLeft = daysLeft * 24;
      if (hoursLeft < MIN_HOURS_TO_CLOSE) {
        blocked++;
        continue; // Market closes too soon — will expire before resolution checks can track it
      }
    }

    // Don't open trades we can't afford (simBankroll reflects available capital after entry deductions)
    if (simBankroll <= 1) continue;
    // Hard position limit check (in case multiple opps in one batch)
    if (getOpenPositionCount() >= MAX_OPEN_POSITIONS) break;

    // Position size: use Kelly-based size relative to simulated bankroll, or a sensible default
    const rawKellySize = opp.positionSize || 0;
    let posSize = rawKellySize > 0 ? Math.min(rawKellySize, simBankroll * 0.05) : Math.min(10, simBankroll * 0.02);
    // Scale by strategyOptimizer allocation (0.3x to 2.0x)
    if (optimizer) {
      const alloc = optimizer.getAllocation(opp.strategy);
      posSize = r2(posSize * Math.min(alloc, 2.0));
    }
    // Scale down during drawdowns — proportional to bankroll health
    // Applied AFTER optimizer so it always caps the final size
    if (drawdownPct > 0.15) {
      posSize = r2(posSize * Math.max(0.3, 1 - drawdownPct));
    }
    // Hard cap: never exceed 5% of current bankroll regardless of optimizer boost
    posSize = Math.min(posSize, simBankroll * 0.05);
    // Reserve 5% bankroll — never go all-in
    const availCap = simBankroll * (1 - CAPITAL_RESERVE_PCT);
    if (posSize > availCap) continue; // Can't afford this trade
    const rawEntryPrice = opp.side === 'NO' ? (opp.noPrice || (1 - (opp.yesPrice || 0.5))) : (opp.price || opp.yesPrice || 0.5);
    // Simulate slippage: larger positions relative to liquidity get worse fills
    const liquidity = opp.liquidity || 50000;
    const slippagePct = fees.estimateSlippage(posSize, liquidity);
    const entryPrice = Math.min(0.99, rawEntryPrice * (1 + slippagePct)); // Slippage worsens entry

    const trade = {
      id: `PT-${now}-${recorded}`,
      key,
      conditionId: opp.conditionId,
      market: opp.market || opp.question || 'Unknown',
      strategy: opp.strategy,
      side: opp.side || 'YES',
      entryPrice: r2(entryPrice),
      rawEntryPrice: r2(rawEntryPrice),
      slippage: r2(slippagePct),
      score: opp.score || 0,
      confidence: opp.confidence || 'UNKNOWN',
      edge: opp.edge || opp.netEdge || 0,
      kellySize: r2(posSize),
      riskLevel: opp.riskLevel || 'UNKNOWN',
      persistence: opp.persistence || null,
      modelData: extractModelData(opp),
      endDate: oppEndDate ? oppEndDate.toISOString() : null,
      daysLeft: daysLeft !== null ? Math.round(daysLeft) : null,
      costDeducted: true,
      source: 'BOT',
      recordedAt: new Date().toISOString(),
      resolved: false,
      outcome: null,
      pnl: null,
    };

    paperTrades.push(trade);

    // Deduct entry cost from bankroll immediately
    simBankroll = r2(simBankroll - posSize);
    simBankrollHistory.push({
      timestamp: trade.recordedAt,
      bankroll: simBankroll,
      event: `ENTRY -$${r2(posSize)} on ${trade.market?.slice(0, 40)}`,
      tradeId: trade.id,
    });

    // Store signal snapshot for resolution feedback
    signalSnapshots[opp.conditionId] = {
      strategy: opp.strategy,
      side: opp.side,
      score: opp.score,
      confidence: opp.confidence,
      signals: extractSignals(opp),
      entryPrice: trade.entryPrice,
      recordedAt: trade.recordedAt,
    };

    recorded++;
  }

  if (recorded > 0) {
    // Trim old trades
    if (paperTrades.length > MAX_HISTORY) {
      paperTrades = paperTrades.slice(-MAX_HISTORY);
    }
    save();
    log.info('PAPER_TRADER', `Recorded ${recorded} paper trades (total: ${paperTrades.length})${blocked > 0 ? ` | ${blocked} blocked by learning` : ''}`);

    // Fire notification for new trades
    if (_onNotify) {
      const newTrades = paperTrades.slice(-recorded);
      try { _onNotify('NEW_TRADES', newTrades); } catch (e) { log.debug('PAPER_TRADER', `Notify error: ${e.message}`); }
    }
  }

  return recorded;
}

// ─── Manual Trade Input ──────────────────────────────────────────────
/**
 * Place a manual paper trade. Separate from bot-generated trades.
 * Manual trades are tracked for P&L but do NOT feed the bot's learning loop.
 *
 * @param {Object} params - { conditionId, market, side, amount, entryPrice }
 * @returns {Object} - The created paper trade
 */
function placeManualTrade({ conditionId, market, side, amount, entryPrice }) {
  if (simBusted) {
    throw new Error('Paper bankroll busted ($0). Reset paper trades to continue.');
  }
  if (!conditionId || !side || !amount || !entryPrice) {
    throw new Error('Missing required fields: conditionId, side, amount, entryPrice');
  }
  if (amount <= 0) throw new Error('Amount must be positive');
  // Check available capital (includes reserve)
  const availCap = simBankroll * (1 - CAPITAL_RESERVE_PCT);
  if (amount > availCap) throw new Error(`Amount $${amount} exceeds available capital $${r2(availCap)} (bankroll $${simBankroll})`);
  if (getOpenPositionCount() >= MAX_OPEN_POSITIONS) throw new Error(`Position limit reached (${MAX_OPEN_POSITIONS})`);
  if (entryPrice <= 0 || entryPrice >= 1) throw new Error('Entry price must be between 0 and 1');

  side = side.toUpperCase();
  if (side !== 'YES' && side !== 'NO') throw new Error('Side must be YES or NO');

  // Simulate slippage for manual trades too
  const slippagePct = fees.estimateSlippage(amount, 50000);
  const adjustedPrice = Math.min(0.99, entryPrice * (1 + slippagePct));

  const trade = {
    id: `MT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    key: `${conditionId}:MANUAL:${side}`,
    conditionId,
    market: market || 'Manual Trade',
    strategy: 'MANUAL',
    side,
    entryPrice: r2(adjustedPrice),
    rawEntryPrice: r2(entryPrice),
    slippage: r2(slippagePct),
    score: null,
    confidence: 'USER',
    edge: null,
    kellySize: r2(amount),
    riskLevel: 'USER',
    persistence: null,
    modelData: {},
    costDeducted: true,
    source: 'MANUAL',
    recordedAt: new Date().toISOString(),
    resolved: false,
    outcome: null,
    pnl: null,
  };

  paperTrades.push(trade);

  // Deduct entry cost from bankroll
  simBankroll = r2(simBankroll - amount);
  simBankrollHistory.push({
    timestamp: trade.recordedAt,
    bankroll: simBankroll,
    event: `MANUAL ENTRY -$${r2(amount)} on ${market?.slice(0, 40)}`,
    tradeId: trade.id,
  });

  // Snapshot for resolution tracking
  signalSnapshots[conditionId] = signalSnapshots[conditionId] || {
    strategy: 'MANUAL',
    side,
    score: null,
    confidence: 'USER',
    signals: {},
    entryPrice: trade.entryPrice,
    recordedAt: trade.recordedAt,
  };

  save();
  log.info('PAPER_TRADER', `Manual trade: ${side} "${market?.slice(0, 50)}" $${amount} @ ${r2(adjustedPrice)} (slip ${r2(slippagePct * 100)}%)`);

  return trade;
}

/**
 * Extract model/signal data from opportunity for storage.
 */
function extractModelData(opp) {
  const data = {};
  if (opp.model) {
    data.trueProb = opp.model.trueProb;
    data.confidence = opp.model.confidence;
    data.signalCount = opp.model.signals ? opp.model.signals.length : 0;
    data.edge = opp.model.edge;
  }
  if (opp.bookmakerData) {
    data.bookmakerConsensus = opp.bookmakerData.consensus;
    data.bookmakerCount = opp.bookmakerData.bookmakerCount;
  }
  if (opp.regime) data.regime = opp.regime;
  if (opp.domainSignal) data.domainSignal = opp.domainSignal;
  if (opp.newsData) data.newsData = opp.newsData;
  return data;
}

/**
 * Extract signal-level data for feedback to probability model.
 */
function extractSignals(opp) {
  const signals = {};

  // From model signals
  if (opp.model && opp.model.signals) {
    for (const sig of opp.model.signals) {
      signals[sig.name] = {
        logLR: sig.scaledLR || sig.logLR || 0,
        weight: sig.weight || 0,
        direction: sig.logLR > 0 ? 'YES' : 'NO',
      };
    }
  }

  // Strategy-specific signals
  if (opp.strategy === 'SPORTS_EDGE') {
    if (opp.regime) signals['Regime'] = { type: opp.regime, direction: opp.side };
    if (opp.domainSignal) signals['Domain'] = { type: opp.domainSignal.type, direction: opp.side };
  }
  if (opp.strategy === 'ARBITRAGE' && opp.type === 'CROSS_PLATFORM') {
    signals['CrossPlatform'] = { divergence: opp.divergence, direction: opp.side };
  }

  return signals;
}

// ─── Resolve Paper Trades ────────────────────────────────────────────
/**
 * When a market resolves, calculate hypothetical P&L for all paper trades on that market.
 * Returns signal-level feedback data for the probability model.
 */
function resolveMarket(conditionId, outcome) {
  const unresolvedTrades = paperTrades.filter(
    t => t.conditionId === conditionId && !t.resolved
  );

  if (unresolvedTrades.length === 0) return null;

  const signalFeedback = {};
  const results = [];

  for (const trade of unresolvedTrades) {
    // Calculate hypothetical P&L
    const hypotheticalSize = trade.kellySize || 10;

    let grossPnL, won, payout, hypotheticalShares;

    if (trade.strategy === 'ARBITRAGE') {
      // ── Arb resolution: multi-leg, NOT single-leg binary ──
      // An arb buys YES on ALL outcomes. Only the conditionId of the first leg
      // is tracked, but the real P&L depends on the combined cost vs $1 payout.
      // The edge.raw tells us the underround/overround gap.
      // Win: first leg resolves YES → payout $1, cost was entryPrice per share → profit on this leg
      // Loss: first leg resolves NO → this leg pays $0, but OTHER legs also paid $0
      //   Real arb P&L on loss = -(total combined cost) since no leg won yet
      //   But we only track one leg, so approximate:
      //   - If outcome=YES for this leg → we won the arb (this leg pays out)
      //   - If outcome=NO for this leg → we lost this leg's cost, but arb isn't fully resolved
      //     (other legs might still win). For sim simplicity, treat as a loss of the
      //     net edge gap (the premium paid above fair value), NOT 100% of position.
      const edgeRaw = (typeof trade.edge === 'object' ? trade.edge.raw : trade.edge) || 0.05;
      hypotheticalShares = hypotheticalSize / (trade.entryPrice || 0.5);

      if (outcome === 'YES' && trade.side === 'YES') {
        // This leg won — arb profit = edge * position
        payout = 1.0;
        grossPnL = (1.0 - trade.entryPrice) * hypotheticalShares;
        won = true;
      } else if (outcome === 'NO' && trade.side === 'YES') {
        // This leg lost — but in a real arb, another leg should win.
        // The loss is the cost of THIS leg only. In multi-outcome arbs,
        // one leg always wins, so the P&L is approximately:
        //   profit ≈ edge * positionSize (if complete arb)
        //   loss ≈ -edge * positionSize (if incomplete/failed arb)
        const riskLevel = trade.riskLevel || 'UNKNOWN';
        if (riskLevel === 'LOW') {
          // Complete arb — the cost of this leg is lost but another leg pays out
          // Net P&L ≈ +(edge * position) across all legs. Since we can't track
          // all legs here, mark as small win (arb profit).
          grossPnL = edgeRaw * hypotheticalSize * 0.5; // Conservative: half the theoretical edge
          won = true;
          payout = 0; // This specific leg lost
        } else {
          // Incomplete arb — real risk of loss, but NOT 100% of position.
          // Max realistic loss ≈ the overround gap (typically 5-15%)
          grossPnL = -Math.min(hypotheticalSize * 0.15, hypotheticalSize * edgeRaw * 2);
          won = false;
          payout = 0;
        }
      } else {
        // Side=NO on arb (unusual) — treat normally
        payout = outcome === 'NO' ? 1.0 : 0.0;
        grossPnL = (payout - trade.entryPrice) * hypotheticalShares;
        won = grossPnL > 0;
      }
    } else {
      // ── Standard single-leg resolution (NO_BETS, SPORTS_EDGE, etc.) ──
      const safeEntryPrice = trade.entryPrice || 0.5; // Guard against 0 entry price (BTC_BOT edge case)
      hypotheticalShares = hypotheticalSize / safeEntryPrice;
      if (trade.side === 'YES') {
        payout = outcome === 'YES' ? 1.0 : 0.0;
      } else {
        payout = outcome === 'NO' ? 1.0 : 0.0;
      }
      grossPnL = (payout - safeEntryPrice) * hypotheticalShares;
      won = grossPnL > 0;
    }

    const fee = grossPnL > 0 ? grossPnL * fees.DEFAULT_FEE_RATE : 0;
    const netPnL = grossPnL - fee;

    trade.resolved = true;
    trade.outcome = outcome;
    trade.pnl = {
      grossPnL: r2(grossPnL),
      fee: r2(fee),
      netPnL: r2(netPnL),
      payout,
      hypotheticalShares: r2(hypotheticalShares),
      won,
      returnPct: r2((netPnL / hypotheticalSize) * 100),
    };
    trade.resolvedAt = new Date().toISOString();

    // ─── Update simulated bankroll ───
    // For trades with costDeducted, the entry cost was already subtracted from bankroll.
    // On resolution, return the TOTAL dollar payout (shares × per-share payout) minus fees.
    // BUG FIX: Previously used raw `payout` (per-share: 0 or 1) instead of total dollar payout.
    // That caused winning trades to return ~$1 instead of shares × $1, draining the bankroll.
    if (trade.costDeducted) {
      const totalPayout = hypotheticalShares * payout; // Dollar payout: shares × $1 (win) or shares × $0 (loss)
      const returnAmount = totalPayout > 0 ? r2(totalPayout - fee) : 0;
      simBankroll = r2(simBankroll + returnAmount);
    } else {
      // Legacy trade — cost was never deducted, use net P&L as before
      simBankroll = r2(simBankroll + netPnL);
    }
    simBankrollHistory.push({
      timestamp: trade.resolvedAt,
      bankroll: simBankroll,
      event: `${won ? 'WIN' : 'LOSS'} $${r2(netPnL)} on ${trade.market?.slice(0, 40)}`,
      tradeId: trade.id,
    });

    // Circuit breaker: stop if bankroll hits $0 or below
    if (simBankroll <= 0) {
      simBankroll = 0;
      simBusted = true;
      log.warn('PAPER_TRADER', '💀 Simulated bankroll busted! Reset to continue paper trading.');
      break; // Stop resolving more trades — we're bust
    }

    resolvedTrades.push({ ...trade });
    results.push(trade);

    log.info('PAPER_TRADER', `Resolved: "${trade.market}" → ${outcome} | ${won ? 'WIN' : 'LOSS'} $${r2(netPnL)} (${trade.strategy})`);
  }

  // ─── Resolve shadow trades FIRST so their data is available for evaluatePattern ───
  resolveShadowTrades(conditionId, outcome);

  // ─── Feed learning state (skip manual trades to avoid polluting bot learning) ───
  for (const trade of results) {
    const won = trade.pnl?.won;
    const netPnL = trade.pnl?.netPnL || 0;
    if (trade.source !== 'MANUAL') {
      recordLearningOutcome(trade, won, netPnL);
    }
  }

  // Build signal-level feedback for probability model learning
  const snapshot = signalSnapshots[conditionId];
  if (snapshot && snapshot.signals) {
    for (const [sigName, sigData] of Object.entries(snapshot.signals)) {
      const predictedDirection = sigData.direction || (sigData.logLR > 0 ? 'YES' : 'NO');
      const wasCorrect = predictedDirection === outcome;

      signalFeedback[sigName] = {
        wasCorrect,
        edgeContribution: Math.abs(sigData.logLR || 0),
        predictedDirection,
        actualOutcome: outcome,
      };

      // Update signal accuracy tracking
      recordSignalOutcome(sigName, wasCorrect);
    }
  }

  // Feed probability model for adaptive weights
  try {
    const probModel = getProbModel();
    if (probModel && probModel.recordResolution) {
      // Use entry price as proxy for market's predicted probability
      const avgEntry = results.length > 0
        ? results.reduce((s, t) => s + t.entryPrice, 0) / results.length
        : 0.5;
      probModel.recordResolution(avgEntry, outcome, signalFeedback);
    }
  } catch (err) {
    log.warn('PAPER_TRADER', `Prob model feedback failed: ${err.message}`);
  }

  // Cleanup old snapshot
  delete signalSnapshots[conditionId];

  // ─── Feed strategy optimizer with trade data ──────────────────────
  try {
    const optimizer = getOptimizer();
    if (optimizer) {
      for (const t of results) {
        if (t.source !== 'MANUAL') {
          optimizer.recordTrade(t.strategy, {
            pnl: t.pnl?.netPnL || 0,
            positionSize: t.kellySize || 10,
            edge: t.edge || 0,
            timestamp: t.resolvedAt,
            resolution: t.outcome,
          });
        }
      }
    }
  } catch (err) {
    log.debug('PAPER_TRADER', `Optimizer feed failed: ${err.message}`);
  }

  // ─── Learn EVERY resolution — not every 10th ──────────────────────
  // The whole point: fast feedback loop. Every outcome teaches something.
  learningState.totalResolutions += results.length;
  runLearningCycle();

  save();
  saveLearningState();

  return {
    conditionId,
    outcome,
    tradesResolved: results.length,
    signalFeedback,
  };
}

// ─── Auto-Resolution Checker ─────────────────────────────────────────
/**
 * Periodically checks Polymarket API for whether any paper-traded markets
 * have resolved. This is the KEY missing loop that makes paper trading work:
 *
 * Without this: paper trades are recorded but never resolved → no learning
 * With this: every paper trade eventually gets a W/L outcome → continuous learning
 */
async function checkResolutions() {
  // Get all unique conditionIds from unresolved paper trades AND shadow trades
  const unresolvedIds = new Set();
  for (const t of paperTrades) {
    if (!t.resolved && t.conditionId) unresolvedIds.add(t.conditionId);
  }
  // Include shadow trade conditionIds so blocked patterns can still resolve
  if (learningState._shadowTrades) {
    for (const shadow of Object.values(learningState._shadowTrades)) {
      if (shadow.conditionId) unresolvedIds.add(shadow.conditionId);
    }
  }

  if (unresolvedIds.size === 0) return { checked: 0, resolved: 0 };

  const cl = getClient();
  let checked = 0;
  let resolved = 0;

  // Check a batch of unresolved trades (rate-limit friendly)
  const idsToCheck = [...unresolvedIds].slice(0, MAX_RESOLUTION_BATCH);

  for (const conditionId of idsToCheck) {
    try {
      checked++;
      const market = await cl.getMarketById(conditionId);
      if (!market) continue;

      // Check actual resolution status first, then fall back to price
      if (!market.closed && !market.resolved) continue;

      let outcome = null;

      // Best: use the resolution/result field from CLOB response
      if (market.resolved && market.resolution) {
        outcome = market.resolution.toUpperCase();
      } else if (market.resolved && market.result) {
        outcome = market.result.toUpperCase();
      }

      // Fallback: check token winner flags
      if (!outcome && market.tokens) {
        const yesToken = market.tokens.find(t => t.outcome === 'Yes');
        if (yesToken?.winner === true) outcome = 'YES';
        else if (yesToken?.winner === false && market.resolved) outcome = 'NO';
      }

      // Fallback: check price extremes (works with both CLOB and Gamma formats)
      if (!outcome) {
        const yesPrice = market.yesPrice ?? (market.outcomePrices ? parseFloat(JSON.parse(market.outcomePrices)[0] || 0.5) : 0.5);
        if (yesPrice >= 0.95) outcome = 'YES';
        else if (yesPrice <= 0.05) outcome = 'NO';
      }

      if (!outcome) continue; // Not fully resolved yet

      // Resolve all paper trades for this market
      const result = resolveMarket(conditionId, outcome);
      if (result && result.tradesResolved > 0) {
        resolved += result.tradesResolved;
        log.info('PAPER_TRADER', `Auto-resolved: "${market.question}" → ${outcome} (${result.tradesResolved} trades)`);
      } else {
        // Even if no real trades, resolve shadow trades for blocked patterns
        resolveShadowTrades(conditionId, outcome);
        saveLearningState();
      }
    } catch (err) {
      // Rate limited or API error — skip and try next cycle
      if (err.message && err.message.includes('429')) {
        log.warn('PAPER_TRADER', 'Rate limited during resolution check — will retry next cycle');
        break;
      }
    }
  }

  if (resolved > 0) {
    log.info('PAPER_TRADER', `Resolution check: ${checked} checked, ${resolved} resolved, ${unresolvedIds.size - resolved} pending`);

    // Fire notification for resolutions
    if (_onNotify) {
      const recentResolutions = resolvedTrades.slice(-resolved).map(t => ({
        question: t.market,
        market: t.market,
        outcome: t.outcome,
        side: t.side,
        strategy: t.strategy,
        pnl: t.pnl?.netPnL || 0,
        won: t.pnl?.won,
        returnPct: t.pnl?.returnPct || 0,
        bankroll: simBankroll,
      }));
      try { _onNotify('RESOLUTIONS', recentResolutions); } catch (e) { log.debug('PAPER_TRADER', `Notify error: ${e.message}`); }
    }
  }

  return { checked, resolved, pending: unresolvedIds.size - resolved };
}

// ─── Stale Trade Expiry ──────────────────────────────────────────────
/**
 * Auto-expire pending trades whose market end date is >30 days out
 * or that have been open >30 days without resolution.
 * Expired trades are marked EXPIRED — they don't affect P&L or learning.
 */
function expireStale() {
  const now = Date.now();
  let expired = 0;

  for (const trade of paperTrades) {
    if (trade.resolved) continue;

    let shouldExpire = false;
    let reason = '';

    // 1. Check if market end date is too far out (>30 days from now)
    if (trade.endDate) {
      const endMs = new Date(trade.endDate).getTime();
      const daysOut = (endMs - now) / 86400000;
      if (daysOut > MAX_DAYS_HORIZON) {
        shouldExpire = true;
        reason = `Market resolves in ${Math.round(daysOut)}d (>${MAX_DAYS_HORIZON}d limit)`;
      }
    }

    // 2. Parse end date from market name for legacy trades without endDate field
    if (!shouldExpire && !trade.endDate) {
      const mkt = trade.market || '';
      const yearMatch = mkt.match(/\b(202[7-9]|203\d)\b/);
      if (yearMatch) {
        shouldExpire = true;
        reason = `Long-term market (${yearMatch[1]}) — no learning value`;
      }
      // Check for specific dates far out
      const isoMatch = mkt.match(/20\d{2}-\d{2}-\d{2}/);
      if (!shouldExpire && isoMatch) {
        const d = new Date(isoMatch[0] + 'T23:59:59Z');
        const daysOut = (d.getTime() - now) / 86400000;
        if (daysOut > MAX_DAYS_HORIZON) {
          shouldExpire = true;
          reason = `Market ${isoMatch[0]} is ${Math.round(daysOut)}d out`;
        }
      }
    }

    // 3. Age-based expiry: open >45 days with no resolution in sight
    if (!shouldExpire && trade.recordedAt) {
      const age = (now - new Date(trade.recordedAt).getTime()) / 86400000;
      if (age > 45) {
        shouldExpire = true;
        reason = `Open ${Math.round(age)}d with no resolution — stale`;
      }
    }

    if (shouldExpire) {
      trade.resolved = true;
      trade.outcome = 'EXPIRED';
      trade.pnl = {
        grossPnL: 0, fee: 0, netPnL: 0, payout: 0,
        hypotheticalShares: 0, won: null, returnPct: 0,
      };
      trade.resolvedAt = new Date().toISOString();
      trade.expireReason = reason;

      // Refund entry cost if it was deducted at entry time
      if (trade.costDeducted) {
        simBankroll = r2(simBankroll + (trade.kellySize || 0));
        simBankrollHistory.push({
          timestamp: trade.resolvedAt,
          bankroll: simBankroll,
          event: `EXPIRED +$${r2(trade.kellySize || 0)} refund — ${reason?.slice(0, 30)}`,
          tradeId: trade.id,
        });
      }

      resolvedTrades.push({ ...trade });
      expired++;
    }
  }

  if (expired > 0) {
    log.info('PAPER_TRADER', `♻️ Expired ${expired} stale trades (no P&L impact)`);
    save();
  }

  return expired;
}

/**
 * Start the auto-resolution loop.
 * Called by scanner.start() so paper trades get resolved automatically.
 */
function startResolutionChecker() {
  if (resolutionCheckInterval) return; // Already running

  // Run stale expiry once on startup to clean existing trades
  try { expireStale(); } catch (e) { log.warn('PAPER_TRADER', `Startup expiry failed: ${e.message}`); }

  resolutionCheckInterval = setInterval(async () => {
    try {
      await checkResolutions();
      // Run stale expiry every cycle too (lightweight — just iterates array)
      expireStale();
    } catch (err) {
      log.warn('PAPER_TRADER', `Resolution checker error: ${err.message}`);
    }
  }, RESOLUTION_CHECK_MS);

  log.info('PAPER_TRADER', 'Auto-resolution checker started (checking every 60s)');
}

function stopResolutionChecker() {
  if (resolutionCheckInterval) {
    clearInterval(resolutionCheckInterval);
    resolutionCheckInterval = null;
  }
  save();
  saveLearningState();
}

// ─── Self-Learning Engine ────────────────────────────────────────────

/**
 * Record the outcome of a paper trade for strategy-level learning.
 */
function recordLearningOutcome(trade, won, netPnL) {
  const strat = trade.strategy || 'UNKNOWN';

  // Strategy performance tracking
  if (!learningState.strategyPerformance[strat]) {
    learningState.strategyPerformance[strat] = {
      wins: 0, losses: 0, totalPnL: 0, totalTrades: 0,
      totalScore: 0, recentResults: [],
      winsByScoreBucket: {},  // score range → { wins, total }
      winsByConfidence: {},   // confidence → { wins, total }
    };
  }
  const sp = learningState.strategyPerformance[strat];
  sp.totalTrades++;
  if (won) sp.wins++; else sp.losses++;
  sp.totalPnL += netPnL;
  sp.totalScore += trade.score || 0;

  // Rolling window of recent results (last 50)
  sp.recentResults.push({ won, pnl: netPnL, score: trade.score, confidence: trade.confidence, ts: Date.now() });
  if (sp.recentResults.length > 50) sp.recentResults.shift();

  // Track win rate by score bucket (0-25, 25-50, 50-75, 75-100)
  const scoreBucket = `${Math.floor((trade.score || 0) / 25) * 25}-${Math.floor((trade.score || 0) / 25) * 25 + 25}`;
  if (!sp.winsByScoreBucket[scoreBucket]) sp.winsByScoreBucket[scoreBucket] = { wins: 0, total: 0, pnl: 0 };
  sp.winsByScoreBucket[scoreBucket].total++;
  if (won) sp.winsByScoreBucket[scoreBucket].wins++;
  sp.winsByScoreBucket[scoreBucket].pnl += netPnL;

  // Track by confidence level
  const conf = trade.confidence || 'UNKNOWN';
  if (!sp.winsByConfidence[conf]) sp.winsByConfidence[conf] = { wins: 0, total: 0, pnl: 0 };
  sp.winsByConfidence[conf].total++;
  if (won) sp.winsByConfidence[conf].wins++;
  sp.winsByConfidence[conf].pnl += netPnL;

  // Global confidence tracking
  if (!learningState.confidenceAccuracy[conf]) learningState.confidenceAccuracy[conf] = { correct: 0, total: 0 };
  learningState.confidenceAccuracy[conf].total++;
  if (won) learningState.confidenceAccuracy[conf].correct++;

  // ─── Pattern-Level Tracking (strategy:side) ───────────────────────
  const patternKey = `${strat}:${trade.side || 'YES'}`;
  if (!learningState.patternPerformance) learningState.patternPerformance = {};
  if (!learningState.patternPerformance[patternKey]) {
    learningState.patternPerformance[patternKey] = {
      wins: 0, losses: 0, totalPnL: 0, totalTrades: 0,
      streak: 0,       // positive = win streak, negative = loss streak
      recentResults: [], // rolling window of 10 (fast learning)
    };
  }
  const pp = learningState.patternPerformance[patternKey];
  pp.totalTrades++;
  if (won) { pp.wins++; pp.streak = pp.streak >= 0 ? pp.streak + 1 : 1; }
  else     { pp.losses++; pp.streak = pp.streak <= 0 ? pp.streak - 1 : -1; }
  pp.totalPnL += netPnL;
  pp.recentResults.push({ won, pnl: netPnL, ts: Date.now() });
  if (pp.recentResults.length > 20) pp.recentResults.shift(); // 20-trade window (was 10 — too small)

  // ─── Temporal Decay ───────────────────────────────────────────────
  // Apply exponential decay to cumulative stats every 25 resolutions
  // so ancient history doesn't dominate. Half-life ≈ 50 resolutions.
  if (learningState.totalResolutions > 0 && learningState.totalResolutions % 25 === 0) {
    applyTemporalDecay();
  }

  // ─── Instant Pattern Killer ───────────────────────────────────────
  // If pattern shows clear losing signal, block it immediately
  evaluatePattern(patternKey, pp);
}

/**
 * Record whether a specific signal correctly predicted the outcome.
 */
function recordSignalOutcome(signalName, wasCorrect) {
  if (!learningState.signalAccuracy[signalName]) {
    learningState.signalAccuracy[signalName] = { correct: 0, total: 0, recentResults: [] };
  }
  const sa = learningState.signalAccuracy[signalName];
  sa.total++;
  if (wasCorrect) sa.correct++;

  sa.recentResults.push(wasCorrect ? 1 : 0);
  if (sa.recentResults.length > 30) sa.recentResults.shift();
}

// ─── Pattern Evaluation & Blacklisting ──────────────────────────────

/**
 * Evaluate a pattern (strategy:side) and auto-block if it's clearly losing.
 * This is the "fast kill" system — learns in 3-5 trades, not 100+.
 *
 * Block triggers:
 * - 3+ consecutive losses (streak <= -3)
 * - 3+ trades with win rate < 25%
 * - 5+ trades with negative average PnL
 *
 * Unblock: patterns get re-evaluated after 15 more resolutions
 */
function evaluatePattern(patternKey, pp) {
  if (!learningState.blockedPatterns) learningState.blockedPatterns = {};

  const winRate = pp.totalTrades > 0 ? pp.wins / pp.totalTrades : 0;
  const avgPnL = pp.totalTrades > 0 ? pp.totalPnL / pp.totalTrades : 0;

  let shouldBlock = false;
  let reason = '';

  // 3+ consecutive losses → instant block
  if (pp.streak <= -3) {
    shouldBlock = true;
    reason = `${Math.abs(pp.streak)} consecutive losses`;
  }
  // 3+ trades with terrible win rate
  else if (pp.totalTrades >= 3 && winRate < 0.25) {
    shouldBlock = true;
    reason = `Win rate ${(winRate * 100).toFixed(0)}% after ${pp.totalTrades} trades`;
  }
  // 5+ trades with losing avg PnL
  else if (pp.totalTrades >= 5 && avgPnL < -0.1) {
    shouldBlock = true;
    reason = `Avg PnL $${avgPnL.toFixed(2)} after ${pp.totalTrades} trades`;
  }

  if (shouldBlock && !learningState.blockedPatterns[patternKey]) {
    learningState.blockedPatterns[patternKey] = {
      reason,
      blockedAt: new Date().toISOString(),
      blockedAtResolution: learningState.totalResolutions,
      winRate: r2(winRate * 100),
      trades: pp.totalTrades,
      totalPnL: r2(pp.totalPnL),
      cooldownUntil: learningState.totalResolutions + 15, // Re-evaluate after 15 more resolutions
    };
    log.warn('PAPER_TRADER', `🚫 BLOCKED pattern "${patternKey}" — ${reason} | P&L: $${r2(pp.totalPnL)}`);
  }

  // Check if blocked patterns should be unblocked (cooldown expired)
  for (const [key, block] of Object.entries(learningState.blockedPatterns)) {
    if (learningState.totalResolutions >= block.cooldownUntil) {
      const currentPP = learningState.patternPerformance[key];
      if (currentPP) {
        // Only unblock if recent results show improvement
        const recentWins = currentPP.recentResults.filter(r => r.won).length;
        const recentTotal = currentPP.recentResults.length;
        if (recentTotal >= 3 && recentWins / recentTotal >= 0.45) {
          delete learningState.blockedPatterns[key];
          log.info('PAPER_TRADER', `✅ UNBLOCKED pattern "${key}" — recent win rate improved to ${(recentWins / recentTotal * 100).toFixed(0)}%`);
        } else {
          // Extend cooldown
          block.cooldownUntil = learningState.totalResolutions + 15;
          log.info('PAPER_TRADER', `⏳ Pattern "${key}" still underperforming — extending block by 15 more resolutions`);
        }
      }
    }
  }
}

/**
 * Check if a strategy+side pattern is currently blocked by the learning system.
 */
function isPatternBlocked(strategy, side) {
  if (!learningState.blockedPatterns) return false;
  const patternKey = `${strategy}:${side}`;
  return !!learningState.blockedPatterns[patternKey];
}

/**
 * Shadow-track a blocked pattern: simulate what WOULD have happened.
 * This solves the critical bug where blocked patterns could never unblock
 * because their recentResults were frozen at the time of blocking.
 *
 * By recording shadow results, the unblock check sees fresh data and
 * can make an informed decision about whether the pattern has improved.
 */
const MAX_SHADOW_TRADES = 500;
const SHADOW_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function shadowTrackBlocked(patternKey, opp) {
  if (!learningState.blockedPatterns[patternKey]) return;

  // Record the opportunity as a "shadow" entry so we can check it on resolution
  if (!learningState._shadowTrades) learningState._shadowTrades = {};
  const shadowKey = `${opp.conditionId}:${patternKey}`;
  if (learningState._shadowTrades[shadowKey]) return; // Already tracking

  // TTL cleanup: purge shadow trades older than 30 days + enforce max size
  const now = Date.now();
  const entries = Object.entries(learningState._shadowTrades);
  if (entries.length >= MAX_SHADOW_TRADES) {
    for (const [key, val] of entries) {
      if (now - new Date(val.recordedAt).getTime() > SHADOW_TTL_MS) {
        delete learningState._shadowTrades[key];
      }
    }
    // If still over limit, remove oldest
    const remaining = Object.entries(learningState._shadowTrades);
    if (remaining.length >= MAX_SHADOW_TRADES) {
      remaining.sort((a, b) => new Date(a[1].recordedAt) - new Date(b[1].recordedAt));
      for (let i = 0; i < remaining.length - MAX_SHADOW_TRADES + 1; i++) {
        delete learningState._shadowTrades[remaining[i][0]];
      }
    }
  }

  learningState._shadowTrades[shadowKey] = {
    conditionId: opp.conditionId,
    patternKey,
    side: opp.side || 'YES',
    entryPrice: opp.price || opp.yesPrice || 0.5,
    score: opp.score || 0,
    recordedAt: new Date().toISOString(),
  };
}

/**
 * Resolve shadow trades when a market resolves.
 * Updates recentResults on the blocked pattern so unblocking uses fresh data.
 */
function resolveShadowTrades(conditionId, outcome) {
  if (!learningState._shadowTrades) return;

  for (const [key, shadow] of Object.entries(learningState._shadowTrades)) {
    if (shadow.conditionId !== conditionId) continue;

    // Calculate hypothetical outcome
    const won = (shadow.side === 'YES' && outcome === 'YES') ||
                (shadow.side === 'NO' && outcome === 'NO');
    const payout = won ? 1.0 : 0.0;
    const hypotheticalPnL = (payout - shadow.entryPrice) * (10 / shadow.entryPrice);

    // Update the pattern's recentResults with shadow data
    const pp = learningState.patternPerformance[shadow.patternKey];
    if (pp) {
      pp.recentResults.push({ won, pnl: hypotheticalPnL, ts: Date.now(), shadow: true });
      if (pp.recentResults.length > 20) pp.recentResults.shift();
    }

    delete learningState._shadowTrades[key];
    log.debug('PAPER_TRADER', `Shadow resolved: ${shadow.patternKey} → ${won ? 'WIN' : 'LOSS'} (hypothetical $${r2(hypotheticalPnL)})`);
  }
}

/**
 * Apply temporal decay to cumulative pattern stats.
 * Decay factor 0.9 applied every 25 resolutions → half-life ≈ 25 * ln(2)/ln(10/9) ≈ 165 resolutions.
 * This lets old data fade so patterns can rehabilitate.
 */
function applyTemporalDecay() {
  const DECAY = 0.9;
  for (const pp of Object.values(learningState.patternPerformance || {})) {
    pp.wins = Math.round(pp.wins * DECAY);
    pp.losses = Math.round(pp.losses * DECAY);
    pp.totalTrades = pp.wins + pp.losses;
    pp.totalPnL = r2(pp.totalPnL * DECAY);
  }
  for (const sp of Object.values(learningState.strategyPerformance || {})) {
    sp.wins = Math.round(sp.wins * DECAY);
    sp.losses = Math.round(sp.losses * DECAY);
    sp.totalTrades = sp.wins + sp.losses;
    sp.totalPnL = r2(sp.totalPnL * DECAY);
    sp.totalScore = r2((sp.totalScore || 0) * DECAY);
    // Also decay score bucket stats
    for (const bucket of Object.values(sp.winsByScoreBucket || {})) {
      bucket.wins = Math.round(bucket.wins * DECAY);
      bucket.total = Math.round(Math.max(bucket.wins, bucket.total * DECAY));
      bucket.pnl = r2(bucket.pnl * DECAY);
    }
  }
  log.debug('PAPER_TRADER', 'Applied temporal decay to cumulative stats');
}

/**
 * Run the self-learning cycle.
 * Analyzes paper trade outcomes and computes OPTIMAL score thresholds
 * for each strategy — the minimum score at which the strategy is profitable.
 *
 * This is the core of the self-learning system:
 * - If LOW-score trades lose money → raise the min score threshold
 * - If HIGH-confidence trades are more profitable → weight confidence more
 * - If a strategy consistently loses → flag it for review
 */
function runLearningCycle() {
  const phase = learningState.totalResolutions < 20 ? 'EXPLORE' :
                learningState.totalResolutions < 50 ? 'EXPLOIT' : 'AGGRESSIVE_EXPLOIT';
  const blockedCount = Object.keys(learningState.blockedPatterns || {}).length;
  log.info('PAPER_TRADER', `── Learning Cycle v${learningState.learningVersion} | Phase: ${phase} | ${learningState.totalResolutions} resolutions | ${blockedCount} blocked patterns ──`);

  const insights = [];

  for (const [strat, perf] of Object.entries(learningState.strategyPerformance)) {
    if (perf.totalTrades < 5) continue; // Need minimum data

    // Find the optimal minimum score: the lowest score where cumulative P&L is positive
    const sortedByScore = [...perf.recentResults].sort((a, b) => b.score - a.score);
    let cumPnL = 0;
    let optimalMinScore = 0;
    let bestCumPnL = -Infinity;

    for (let i = 0; i < sortedByScore.length; i++) {
      cumPnL += sortedByScore[i].pnl;
      if (cumPnL > bestCumPnL) {
        bestCumPnL = cumPnL;
        optimalMinScore = sortedByScore[i].score;
      }
    }

    // Find the profitability cutoff: below what score are trades unprofitable?
    const profitCutoff = findProfitCutoff(perf);

    // Store learned threshold
    learningState.scoreThresholds[strat] = {
      optimalMinScore: Math.round(optimalMinScore),
      profitCutoff: Math.round(profitCutoff),
      sampleSize: perf.totalTrades,
      winRate: perf.totalTrades > 0 ? r2((perf.wins / perf.totalTrades) * 100) : 0,
      avgPnL: perf.totalTrades > 0 ? r2(perf.totalPnL / perf.totalTrades) : 0,
      updatedAt: new Date().toISOString(),
    };

    // Which confidence levels are profitable?
    const confInsights = {};
    for (const [conf, data] of Object.entries(perf.winsByConfidence)) {
      confInsights[conf] = {
        winRate: data.total > 0 ? r2((data.wins / data.total) * 100) : 0,
        avgPnL: data.total > 0 ? r2(data.pnl / data.total) : 0,
        profitable: data.pnl > 0,
      };
    }

    const stratWinRate = perf.totalTrades > 0 ? (perf.wins / perf.totalTrades * 100).toFixed(0) : 0;
    const stratPnL = r2(perf.totalPnL);
    const status = perf.totalPnL > 0 ? 'PROFITABLE' : 'UNPROFITABLE';

    insights.push({
      strategy: strat,
      status,
      winRate: `${stratWinRate}%`,
      totalPnL: `$${stratPnL}`,
      learnedMinScore: Math.round(profitCutoff),
      confidenceBreakdown: confInsights,
    });

    log.info('PAPER_TRADER', `${strat}: ${status} | WR: ${stratWinRate}% | P&L: $${stratPnL} | Learned min score: ${Math.round(profitCutoff)}`);
  }

  // Signal accuracy ranking
  const signalRanking = Object.entries(learningState.signalAccuracy)
    .filter(([, d]) => d.total >= 5)
    .map(([name, d]) => ({
      signal: name,
      accuracy: d.total > 0 ? r2((d.correct / d.total) * 100) : 0,
      sampleSize: d.total,
      recentAccuracy: d.recentResults.length >= 5
        ? r2((d.recentResults.reduce((a, b) => a + b, 0) / d.recentResults.length) * 100)
        : null,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  if (signalRanking.length > 0) {
    log.info('PAPER_TRADER', `Signal ranking: ${signalRanking.slice(0, 3).map(s => `${s.signal}(${s.accuracy}%)`).join(', ')}`);
  }

  learningState.lastLearningUpdate = new Date().toISOString();
  learningState.learningVersion++;

  saveLearningState();

  return { insights, signalRanking };
}

/**
 * Find the score below which a strategy is unprofitable.
 * Uses bucket-level P&L data.
 */
function findProfitCutoff(perf) {
  // Check each score bucket from low to high
  const buckets = Object.entries(perf.winsByScoreBucket)
    .map(([range, data]) => ({
      minScore: parseInt(range.split('-')[0]),
      ...data,
      avgPnL: data.total > 0 ? data.pnl / data.total : 0,
    }))
    .sort((a, b) => a.minScore - b.minScore);

  // Find the lowest bucket where avg P&L is positive
  // FIXED: require 5+ trades per bucket (was 2 — way too noisy)
  for (const bucket of buckets) {
    if (bucket.total >= 5 && bucket.avgPnL > 0) {
      return bucket.minScore;
    }
  }

  // Fallback: if fewer trades, look for buckets with 3+ trades and > 40% win rate
  for (const bucket of buckets) {
    if (bucket.total >= 3 && bucket.wins / bucket.total >= 0.4 && bucket.avgPnL > 0) {
      return bucket.minScore;
    }
  }

  // If no bucket is profitable, return a high threshold
  return 55;
}

/**
 * Get the learned minimum score for a strategy.
 * Used by strategies to dynamically adjust their thresholds.
 */
function getLearnedThreshold(strategy) {
  const threshold = learningState.scoreThresholds[strategy];
  if (!threshold || threshold.sampleSize < 3) return null; // Fast learning: need only 3 trades
  return threshold;
}

/**
 * Get complete learning insights for the dashboard.
 */
function getLearningInsights() {
  return {
    learningVersion: learningState.learningVersion,
    totalResolutions: learningState.totalResolutions,
    lastUpdate: learningState.lastLearningUpdate,
    strategyPerformance: Object.fromEntries(
      Object.entries(learningState.strategyPerformance).map(([strat, perf]) => [
        strat,
        {
          trades: perf.totalTrades,
          wins: perf.wins,
          losses: perf.losses,
          winRate: perf.totalTrades > 0 ? r2((perf.wins / perf.totalTrades) * 100) : 0,
          totalPnL: r2(perf.totalPnL),
          avgPnL: perf.totalTrades > 0 ? r2(perf.totalPnL / perf.totalTrades) : 0,
          avgScore: perf.totalTrades > 0 ? r2(perf.totalScore / perf.totalTrades) : 0,
          recentWinRate: perf.recentResults.length >= 5
            ? r2((perf.recentResults.filter(r => r.won).length / perf.recentResults.length) * 100)
            : null,
          scoreBuckets: perf.winsByScoreBucket,
          confidenceBreakdown: perf.winsByConfidence,
        },
      ])
    ),
    scoreThresholds: learningState.scoreThresholds,
    signalAccuracy: Object.fromEntries(
      Object.entries(learningState.signalAccuracy).map(([name, d]) => [
        name,
        {
          accuracy: d.total > 0 ? r2((d.correct / d.total) * 100) : null,
          total: d.total,
          recentAccuracy: d.recentResults.length >= 5
            ? r2((d.recentResults.reduce((a, b) => a + b, 0) / d.recentResults.length) * 100)
            : null,
        },
      ])
    ),
    confidenceAccuracy: learningState.confidenceAccuracy,
    // ─── New: Pattern-level insights ────────────────────────────────
    patternPerformance: Object.fromEntries(
      Object.entries(learningState.patternPerformance || {}).map(([pattern, pp]) => [
        pattern,
        {
          trades: pp.totalTrades,
          wins: pp.wins,
          losses: pp.losses,
          winRate: pp.totalTrades > 0 ? r2((pp.wins / pp.totalTrades) * 100) : 0,
          totalPnL: r2(pp.totalPnL),
          avgPnL: pp.totalTrades > 0 ? r2(pp.totalPnL / pp.totalTrades) : 0,
          streak: pp.streak,
          blocked: !!learningState.blockedPatterns?.[pattern],
        },
      ])
    ),
    blockedPatterns: learningState.blockedPatterns || {},
    // Current learning phase
    phase: learningState.totalResolutions < 20 ? 'EXPLORE' :
           learningState.totalResolutions < 50 ? 'EXPLOIT' : 'AGGRESSIVE_EXPLOIT',
  };
}

// ─── Performance Metrics ─────────────────────────────────────────────
function getPerformance() {
  if (resolvedTrades.length === 0) {
    return {
      status: 'NO_DATA',
      totalPaperTrades: paperTrades.length,
      pendingResolution: paperTrades.filter(t => !t.resolved).length,
      resolvedCount: 0,
      totalPnL: 0,
      roi: 0,
      winRate: 0,
      simBankroll,
      simBusted,
      startingBankroll: startingBankrollOverride ?? DEFAULT_PAPER_BANKROLL,
      bankrollReturn: 0,
      simBankrollHistory: simBankrollHistory.slice(-50),
      pnlCurve: [],
      byStrategy: {},
      byConfidence: {},
      message: 'Waiting for markets to resolve. Paper trades are being tracked and will auto-resolve when Polymarket markets close.',
    };
  }

  const wins = resolvedTrades.filter(t => t.pnl?.won === true);
  const losses = resolvedTrades.filter(t => t.pnl?.won === false);
  const expired = resolvedTrades.filter(t => t.pnl && t.pnl.won === null);
  const totalPnL = resolvedTrades.reduce((s, t) => s + (t.pnl?.netPnL || 0), 0);
  const avgReturn = totalPnL / resolvedTrades.length;

  // Sharpe ratio (per-trade, not annualized — more honest for prediction markets)
  const returns = resolvedTrades.map(t => t.pnl?.returnPct || 0);
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev > 0 ? r2(meanReturn / stdDev) : 0;

  // Max drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let cumPnL = 0;
  for (const t of resolvedTrades) {
    cumPnL += t.pnl?.netPnL || 0;
    if (cumPnL > peak) peak = cumPnL;
    const dd = peak - cumPnL;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // By strategy
  const byStrategy = {};
  for (const t of resolvedTrades) {
    const strat = t.strategy || 'UNKNOWN';
    if (!byStrategy[strat]) {
      byStrategy[strat] = { trades: 0, wins: 0, losses: 0, pnl: 0, avgScore: 0, totalScore: 0 };
    }
    const b = byStrategy[strat];
    b.trades++;
    if (t.pnl?.won === true) b.wins++;
    else if (t.pnl?.won === false) b.losses++;
    // won === null means expired — don't count as win or loss
    b.pnl += t.pnl?.netPnL || 0;
    b.totalScore += t.score || 0;
  }
  for (const [name, b] of Object.entries(byStrategy)) {
    const decided = b.wins + b.losses;
    b.winRate = decided > 0 ? r2((b.wins / decided) * 100) : 0;
    b.expired = b.trades - decided;
    b.pnl = r2(b.pnl);
    b.avgScore = b.trades > 0 ? r2(b.totalScore / b.trades) : 0;
    delete b.totalScore;
    byStrategy[name] = b;
  }

  // By confidence level
  const byConfidence = {};
  for (const t of resolvedTrades) {
    const conf = t.confidence || 'UNKNOWN';
    if (!byConfidence[conf]) byConfidence[conf] = { trades: 0, wins: 0, losses: 0, pnl: 0 };
    byConfidence[conf].trades++;
    if (t.pnl?.won === true) byConfidence[conf].wins++;
    else if (t.pnl?.won === false) byConfidence[conf].losses++;
    byConfidence[conf].pnl += t.pnl?.netPnL || 0;
  }
  for (const b of Object.values(byConfidence)) {
    const decided = b.wins + b.losses;
    b.winRate = decided > 0 ? r2((b.wins / decided) * 100) : 0;
    b.pnl = r2(b.pnl);
  }

  // P&L curve — only trades with real outcomes (exclude expired with won === null)
  let cumulative = 0;
  const decidedTrades = resolvedTrades.filter(t => t.pnl?.won === true || t.pnl?.won === false);
  const pnlCurve = decidedTrades.slice(-100).map(t => {
    cumulative += t.pnl?.netPnL || 0;
    return {
      timestamp: t.resolvedAt,
      pnl: r2(t.pnl?.netPnL || 0),
      cumPnL: r2(cumulative),
      strategy: t.strategy,
      won: t.pnl?.won,
    };
  });

  // ROI calculation
  const totalInvested = resolvedTrades.reduce((s, t) => s + (t.kellySize || 10), 0);
  const roi = totalInvested > 0 ? r2((totalPnL / totalInvested) * 100) : 0;

  return {
    status: 'OK',
    totalPaperTrades: paperTrades.length,
    pendingResolution: paperTrades.filter(t => !t.resolved).length,
    resolvedCount: resolvedTrades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: (wins.length + losses.length) > 0 ? r2((wins.length / (wins.length + losses.length)) * 100) : 0,
    expiredTrades: expired.length,
    totalPnL: r2(totalPnL),
    totalInvested: r2(totalInvested),
    roi,
    avgReturn: r2(avgReturn),
    sharpeRatio: sharpe,
    maxDrawdown: r2(maxDrawdown),
    profitFactor: losses.length > 0
      ? r2(Math.abs(wins.reduce((s, t) => s + (t.pnl?.netPnL || 0), 0)) /
            Math.max(0.01, Math.abs(losses.reduce((s, t) => s + (t.pnl?.netPnL || 0), 0))))
      : wins.length > 0 ? Infinity : 0,
    byStrategy,
    byConfidence,
    pnlCurve,
    // Simulated bankroll
    simBankroll,
    simBusted,
    simBankrollHistory: simBankrollHistory.slice(-50),
    startingBankroll: startingBankrollOverride ?? DEFAULT_PAPER_BANKROLL,
    bankrollReturn: r2(((simBankroll - (startingBankrollOverride ?? DEFAULT_PAPER_BANKROLL)) / (startingBankrollOverride ?? DEFAULT_PAPER_BANKROLL)) * 100),
    // Manual vs bot breakdown
    manualTrades: resolvedTrades.filter(t => t.source === 'MANUAL').length,
    botTrades: resolvedTrades.filter(t => t.source !== 'MANUAL').length,
    // Self-learning status
    learningVersion: learningState.learningVersion,
    learnedThresholds: learningState.scoreThresholds,
    blockedPatterns: Object.keys(learningState.blockedPatterns || {}),
    learningPhase: learningState.totalResolutions < 20 ? 'EXPLORE' :
                   learningState.totalResolutions < 50 ? 'EXPLOIT' : 'AGGRESSIVE_EXPLOIT',
    // Time horizon stats
    timeHorizon: {
      maxDays: MAX_DAYS_HORIZON,
      mediumDays: MEDIUM_HORIZON_DAYS,
      mediumMinScore: MEDIUM_HORIZON_MIN_SCORE,
      pendingByHorizon: (() => {
        const pending = paperTrades.filter(t => !t.resolved);
        const now = Date.now();

        function getDaysLeft(t) {
          if (t.daysLeft != null) return t.daysLeft;
          if (t.endDate) return (new Date(t.endDate).getTime() - now) / 86400000;
          // Try parsing from market name
          const mkt = t.market || '';
          const iso = mkt.match(/20\d{2}-\d{2}-\d{2}/);
          if (iso) return (new Date(iso[0] + 'T23:59:59Z').getTime() - now) / 86400000;
          return null;
        }

        let short = 0, medium = 0, unknown = 0;
        for (const t of pending) {
          const dl = getDaysLeft(t);
          if (dl == null) { unknown++; }
          else if (dl <= MEDIUM_HORIZON_DAYS) { short++; }
          else if (dl <= MAX_DAYS_HORIZON) { medium++; }
          else { unknown++; } // >30d shouldn't exist after expiry, but count as unknown
        }
        const expired = resolvedTrades.filter(t => t.outcome === 'EXPIRED').length;
        return { short, medium, unknown, expired };
      })(),
    },
    // Capital utilization
    capitalUtilization: {
      availableCapital: r2(simBankroll),
      lockedCapital: r2(getLockedCapital()),
      openPositions: getOpenPositionCount(),
      maxPositions: MAX_OPEN_POSITIONS,
      utilizationPct: r2((getLockedCapital() / (simBankroll + getLockedCapital())) * 100 || 0),
    },
  };
}

/**
 * Get paper trade history (most recent first).
 */
function getHistory(limit = 50) {
  return [...paperTrades].reverse().slice(0, limit);
}

/**
 * Get signal snapshot for a market (used by resolver for feedback).
 */
function getSignalSnapshot(conditionId) {
  return signalSnapshots[conditionId] || null;
}

/**
 * Get summary stats.
 */
function getStats() {
  return {
    totalRecorded: paperTrades.length,
    pendingResolution: paperTrades.filter(t => !t.resolved).length,
    totalResolved: resolvedTrades.length,
    signalSnapshots: Object.keys(signalSnapshots).length,
    learningVersion: learningState.learningVersion,
    autoResolutionActive: !!resolutionCheckInterval,
    simBankroll,
    simBusted,
    manualTrades: paperTrades.filter(t => t.source === 'MANUAL').length,
    botTrades: paperTrades.filter(t => t.source !== 'MANUAL').length,
  };
}

function reset() {
  paperTrades = [];
  resolvedTrades = [];
  signalSnapshots = {};
  simBankroll = DEFAULT_PAPER_BANKROLL;
  simBankrollHistory = [];
  simBusted = false;
  startingBankrollOverride = null;
  learningState = {
    strategyPerformance: {},
    signalAccuracy: {},
    confidenceAccuracy: {},
    scoreThresholds: {},
    patternPerformance: {},
    blockedPatterns: {},
    lastLearningUpdate: null,
    totalResolutions: 0,
    learningVersion: 0,
  };
  save();
  saveLearningState();
  log.info('PAPER_TRADER', `Reset complete. Bankroll restored to $${DEFAULT_PAPER_BANKROLL}`);
}

/**
 * Recalculate bankroll from scratch by replaying all trades with correct math.
 * Fixes the payout bug where `returnAmount = payout - fee` used per-share payout (0/1)
 * instead of total dollar payout (shares × per-share payout).
 *
 * Call this once to correct a corrupted bankroll without losing trade history.
 */
function recalculateBankroll() {
  const startAmount = startingBankrollOverride ?? DEFAULT_PAPER_BANKROLL;
  let bankroll = startAmount;
  const newHistory = [{ timestamp: new Date().toISOString(), bankroll: startAmount, event: 'Bankroll recalculated (bug fix)' }];

  // Collect ALL trades (open + resolved) sorted by recordedAt
  const allTrades = [
    ...paperTrades.map(t => ({ ...t, _source: 'active' })),
    ...resolvedTrades.map(t => ({ ...t, _source: 'resolved' })),
  ].sort((a, b) => new Date(a.recordedAt || 0) - new Date(b.recordedAt || 0));

  // Deduplicate by trade id (a trade appears in both arrays when resolved)
  const seen = new Set();
  const uniqueTrades = [];
  for (const t of allTrades) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      uniqueTrades.push(t);
    }
  }

  for (const trade of uniqueTrades) {
    if (trade.outcome === 'EXPIRED') continue; // Expired trades don't affect bankroll

    // Entry cost deduction
    if (trade.costDeducted) {
      const cost = trade.kellySize || 0;
      bankroll = r2(bankroll - cost);
      newHistory.push({
        timestamp: trade.recordedAt,
        bankroll,
        event: `ENTRY -$${r2(cost)} on ${(trade.market || '').slice(0, 40)}`,
        tradeId: trade.id,
      });
    }

    // Resolution payout (only for resolved trades)
    if (trade.resolved && trade.outcome && trade.outcome !== 'EXPIRED') {
      const pnl = trade.pnl || {};
      const entryPrice = trade.entryPrice || 0.5;
      const hypotheticalSize = trade.kellySize || 0;
      const hypotheticalShares = hypotheticalSize / entryPrice;
      const perSharePayout = pnl.payout ?? 0;
      const fee = pnl.fee || 0;

      if (trade.costDeducted) {
        // Return total dollar payout minus fees
        const totalPayout = hypotheticalShares * perSharePayout;
        const returnAmount = totalPayout > 0 ? r2(totalPayout - fee) : 0;
        bankroll = r2(bankroll + returnAmount);
      } else {
        // Legacy: use netPnL
        bankroll = r2(bankroll + (pnl.netPnL || 0));
      }

      newHistory.push({
        timestamp: trade.resolvedAt || trade.recordedAt,
        bankroll,
        event: `${pnl.won ? 'WIN' : 'LOSS'} $${r2(pnl.netPnL || 0)} on ${(trade.market || '').slice(0, 40)}`,
        tradeId: trade.id,
      });
    }
  }

  const oldBankroll = simBankroll;
  simBankroll = r2(bankroll);
  simBankrollHistory = newHistory;
  simBusted = simBankroll <= 0;

  log.info('PAPER_TRADER', `💰 Bankroll recalculated: $${oldBankroll} → $${simBankroll} (${uniqueTrades.length} trades replayed)`);
  save();

  return { oldBankroll, newBankroll: simBankroll, tradeCount: uniqueTrades.length };
}

function r2(n) { return Math.round(n * 100) / 100; }

// Load on module init
load();

module.exports = {
  recordScanResults,
  placeManualTrade,
  resolveMarket,
  checkResolutions,
  startResolutionChecker,
  stopResolutionChecker,
  expireStale,
  getPerformance,
  getHistory,
  getSignalSnapshot,
  getLearnedThreshold,
  getLearningInsights,
  runLearningCycle,
  isPatternBlocked,
  getStats,
  reset,
  recalculateBankroll,
  load,
  save,
  getSimBankroll: () => simBankroll,
  getLockedCapital,
  getAvailableCapital,
  getOpenPositionCount,
  setSimBankroll: (amount) => {
    simBankroll = amount;
    simBusted = amount <= 0;
    startingBankrollOverride = amount;
    simBankrollHistory.push({ timestamp: new Date().toISOString(), bankroll: amount, event: 'Manual bankroll update' });
    save();
  },
  setNotifyCallback: (fn) => { _onNotify = fn; },
  // Exposed for executionPipeline integration
  getLearningState: () => learningState,
};
