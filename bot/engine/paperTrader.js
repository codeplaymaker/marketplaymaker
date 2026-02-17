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

function getClient() {
  if (!client) client = require('../polymarket/client');
  return client;
}
function getProbModel() {
  if (!probabilityModel) probabilityModel = require('./probabilityModel');
  return probabilityModel;
}

const DATA_FILE = path.join(__dirname, '../logs/paper-trades.json');
const LEARNING_FILE = path.join(__dirname, '../logs/learning-state.json');
const MAX_HISTORY = 2000;
const DEDUP_WINDOW_MS = 180000;         // 3 min — don't re-record same opp
const RESOLUTION_CHECK_MS = 60000;      // Check resolutions every 60 seconds
const MAX_RESOLUTION_BATCH = 15;        // Max API calls per resolution check cycle (rate limit friendly)
const DEFAULT_PAPER_BANKROLL = 1000;    // $1000 starting simulated bankroll

let paperTrades = [];
let resolvedTrades = [];
let signalSnapshots = {};
let resolutionCheckInterval = null;

// ─── Simulated Bankroll ──────────────────────────────────────────────
let simBankroll = DEFAULT_PAPER_BANKROLL;
let simBankrollHistory = [];    // { timestamp, bankroll, event }
let simBusted = false;          // Circuit breaker: true if bankroll hit $0

// ─── Strategy Learning State ─────────────────────────────────────────
// Tracks per-strategy performance and auto-adjusts thresholds
let learningState = {
  strategyPerformance: {},    // strategy → { wins, losses, totalPnL, avgScore, recentResults[] }
  signalAccuracy: {},         // signalName → { correct, total, recentResults[] }
  confidenceAccuracy: {},     // confidence → { correct, total }
  scoreThresholds: {},        // strategy → { learned minScore based on profitability }
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

  const topOpps = opportunities
    .filter(o => (o.score || 0) >= 25) // Only record score >= 25
    .slice(0, maxRecord);

  for (const opp of topOpps) {
    const key = `${opp.conditionId}:${opp.strategy}:${opp.side}`;

    // Dedup: don't record same opp within 3 minutes
    const existing = paperTrades.find(
      t => t.key === key && (now - new Date(t.recordedAt).getTime()) < DEDUP_WINDOW_MS
    );
    if (existing) continue;

    // Position size: use Kelly-based size relative to simulated bankroll, or a sensible default
    const rawKellySize = opp.positionSize || 0;
    const posSize = rawKellySize > 0 ? Math.min(rawKellySize, simBankroll * 0.05) : Math.min(10, simBankroll * 0.02);
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
      source: 'BOT',
      recordedAt: new Date().toISOString(),
      resolved: false,
      outcome: null,
      pnl: null,
    };

    paperTrades.push(trade);

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
    log.info('PAPER_TRADER', `Recorded ${recorded} paper trades (total: ${paperTrades.length})`);
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
  if (amount > simBankroll) throw new Error(`Amount $${amount} exceeds paper bankroll $${simBankroll}`);
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
    source: 'MANUAL',
    recordedAt: new Date().toISOString(),
    resolved: false,
    outcome: null,
    pnl: null,
  };

  paperTrades.push(trade);

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
    const hypotheticalShares = hypotheticalSize / trade.entryPrice;
    let payout;
    if (trade.side === 'YES') {
      payout = outcome === 'YES' ? 1.0 : 0.0;
    } else {
      payout = outcome === 'NO' ? 1.0 : 0.0;
    }

    const grossPnL = (payout - trade.entryPrice) * hypotheticalShares;
    const fee = grossPnL > 0 ? grossPnL * fees.DEFAULT_FEE_RATE : 0;
    const netPnL = grossPnL - fee;
    const won = grossPnL > 0;

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
    simBankroll = r2(simBankroll + netPnL);
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
    }

    resolvedTrades.push({ ...trade });
    results.push(trade);

    // ─── Feed learning state (skip manual trades to avoid polluting bot learning) ───
    if (trade.source !== 'MANUAL') {
      recordLearningOutcome(trade, won, netPnL);
    }

    log.info('PAPER_TRADER', `Resolved: "${trade.market}" → ${outcome} | ${won ? 'WIN' : 'LOSS'} $${r2(netPnL)} (${trade.strategy})`);
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

  // Check if it's time to re-tune strategy thresholds
  learningState.totalResolutions += results.length;
  if (learningState.totalResolutions % 10 === 0) {
    runLearningCycle();
  }

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
  // Get all unique conditionIds from unresolved paper trades
  const unresolvedIds = new Set();
  for (const t of paperTrades) {
    if (!t.resolved && t.conditionId) unresolvedIds.add(t.conditionId);
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

      // Best: use the actual resolved flag + payout data
      if (market.resolved && market.resolution) {
        outcome = market.resolution.toUpperCase();
      }

      // Fallback: check if payout prices are deterministic
      if (!outcome) {
        const outcomePrices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];
        const yesPrice = parseFloat(outcomePrices[0] || 0.5);
        if (yesPrice >= 0.95) outcome = 'YES';
        else if (yesPrice <= 0.05) outcome = 'NO';
      }

      if (!outcome) continue; // Not fully resolved yet

      // Resolve all paper trades for this market
      const result = resolveMarket(conditionId, outcome);
      if (result && result.tradesResolved > 0) {
        resolved += result.tradesResolved;
        log.info('PAPER_TRADER', `Auto-resolved: "${market.question}" → ${outcome} (${result.tradesResolved} trades)`);
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
  }

  return { checked, resolved, pending: unresolvedIds.size - resolved };
}

/**
 * Start the auto-resolution loop.
 * Called by scanner.start() so paper trades get resolved automatically.
 */
function startResolutionChecker() {
  if (resolutionCheckInterval) return; // Already running

  resolutionCheckInterval = setInterval(async () => {
    try {
      await checkResolutions();
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
  log.info('PAPER_TRADER', '── Running Learning Cycle ──');

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
  for (const bucket of buckets) {
    if (bucket.total >= 3 && bucket.avgPnL > 0) {
      return bucket.minScore;
    }
  }

  // If no bucket is profitable, return a high threshold
  return 50;
}

/**
 * Get the learned minimum score for a strategy.
 * Used by strategies to dynamically adjust their thresholds.
 */
function getLearnedThreshold(strategy) {
  const threshold = learningState.scoreThresholds[strategy];
  if (!threshold || threshold.sampleSize < 10) return null; // Not enough data
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
      message: 'Waiting for markets to resolve. Paper trades are being tracked and will auto-resolve when Polymarket markets close.',
    };
  }

  const wins = resolvedTrades.filter(t => t.pnl && t.pnl.won);
  const losses = resolvedTrades.filter(t => t.pnl && !t.pnl.won);
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
    if (t.pnl?.won) b.wins++;
    else b.losses++;
    b.pnl += t.pnl?.netPnL || 0;
    b.totalScore += t.score || 0;
  }
  for (const [name, b] of Object.entries(byStrategy)) {
    b.winRate = b.trades > 0 ? r2((b.wins / b.trades) * 100) : 0;
    b.pnl = r2(b.pnl);
    b.avgScore = b.trades > 0 ? r2(b.totalScore / b.trades) : 0;
    delete b.totalScore;
    byStrategy[name] = b;
  }

  // By confidence level
  const byConfidence = {};
  for (const t of resolvedTrades) {
    const conf = t.confidence || 'UNKNOWN';
    if (!byConfidence[conf]) byConfidence[conf] = { trades: 0, wins: 0, pnl: 0 };
    byConfidence[conf].trades++;
    if (t.pnl?.won) byConfidence[conf].wins++;
    byConfidence[conf].pnl += t.pnl?.netPnL || 0;
  }
  for (const b of Object.values(byConfidence)) {
    b.winRate = b.trades > 0 ? r2((b.wins / b.trades) * 100) : 0;
    b.pnl = r2(b.pnl);
  }

  // P&L curve
  let cumulative = 0;
  const pnlCurve = resolvedTrades.slice(-100).map(t => {
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
    winRate: r2((wins.length / resolvedTrades.length) * 100),
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
    startingBankroll: DEFAULT_PAPER_BANKROLL,
    bankrollReturn: r2(((simBankroll - DEFAULT_PAPER_BANKROLL) / DEFAULT_PAPER_BANKROLL) * 100),
    // Manual vs bot breakdown
    manualTrades: resolvedTrades.filter(t => t.source === 'MANUAL').length,
    botTrades: resolvedTrades.filter(t => t.source !== 'MANUAL').length,
    // Self-learning status
    learningVersion: learningState.learningVersion,
    learnedThresholds: learningState.scoreThresholds,
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
  learningState = {
    strategyPerformance: {},
    signalAccuracy: {},
    confidenceAccuracy: {},
    scoreThresholds: {},
    lastLearningUpdate: null,
    totalResolutions: 0,
    learningVersion: 0,
  };
  save();
  saveLearningState();
  log.info('PAPER_TRADER', `Reset complete. Bankroll restored to $${DEFAULT_PAPER_BANKROLL}`);
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
  getPerformance,
  getHistory,
  getSignalSnapshot,
  getLearnedThreshold,
  getLearningInsights,
  runLearningCycle,
  getStats,
  reset,
  load,
  save,
  getSimBankroll: () => simBankroll,
  setSimBankroll: (amount) => {
    simBankroll = amount;
    simBusted = amount <= 0;
    simBankrollHistory.push({ timestamp: new Date().toISOString(), bankroll: amount, event: 'Manual bankroll update' });
    save();
  },
};
