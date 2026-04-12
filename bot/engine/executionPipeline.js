/**
 * Smart Execution Pipeline v1
 *
 * Orchestrates signals from all edge engines into the executor.
 * This is the "brain" that coordinates:
 *
 * 1. New Market Detector → immediate limit orders on mispriced new listings
 * 2. News Reactor → urgent market orders when breaking news creates edge
 * 3. Panic Dip Detector → mean reversion entries with stop losses
 * 4. Proven Edge (existing) → bookmaker-validated trades
 *
 * The pipeline:
 * - Receives signals from all engines
 * - Deduplicates (same market, same direction = one trade)
 * - Applies portfolio risk checks before execution
 * - Chooses optimal order type per signal urgency
 * - Routes to executor (simulation or live)
 * - Tracks all signals end-to-end for performance learning
 *
 * Signal Priority (highest first):
 * 1. ORDERBOOK_ARB — risk-free, execute immediately
 * 2. BREAKING_NEWS — time-sensitive, seconds matter
 * 3. NEW_MARKET_ARB — briefly available, execute fast
 * 4. PANIC_DIP — mean reversion, limit order OK
 * 5. BOOKMAKER_EDGE — stable edge, limit order
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'logs', 'execution-pipeline-state.json');

// ─── Optional Dependencies ───────────────────────────────────────────
let executor = null;
let riskManager = null;
let edgeResolver = null;
let scanner = null;
let paperTrader = null;
let strategyOptimizer = null;

try { executor = require('./executor'); } catch { /* required */ }
try { riskManager = require('./riskManager'); } catch { /* required */ }
try { edgeResolver = require('./edgeResolver'); } catch { /* optional */ }
try { scanner = require('./scanner'); } catch { /* optional */ }
try { paperTrader = require('./paperTrader'); } catch { /* optional */ }
try { strategyOptimizer = require('./strategyOptimizer'); } catch { /* optional */ }

// ─── State ───────────────────────────────────────────────────────────
let signalQueue = [];                 // Pending signals to process
let executionLog = [];                // History of all execution decisions
let activeSignals = new Map();        // conditionId → active signal (dedup)
let lifetimeDedup = new Set();        // conditionId:side → lifetime dedup (matches paper trader)
let isProcessing = false;

// Disabled strategies — mirrors paper trader's DISABLED_STRATEGIES
const DISABLED_STRATEGIES = new Set(['BTC_BOT', 'WHALE_DETECTION', 'PROVEN_EDGE']);

// Time horizon constants — mirrors paper trader
const MAX_DAYS_HORIZON = 30;          // Polymarket markets run 14-90 days; 5 was too strict
const MEDIUM_HORIZON_DAYS = 7;        // Score gate applies only beyond 7 days
const MEDIUM_HORIZON_MIN_SCORE = 50;  // Relaxed: was 70 (unreachable for news/panic signals)
const MIN_HOURS_TO_CLOSE = 4;         // Was 12; 4h is sufficient runway for a trade

let stats = {
  signalsReceived: 0,
  signalsExecuted: 0,
  signalsDeduplicated: 0,
  signalsRejectedRisk: 0,
  signalsRejectedLowEdge: 0,
  bySource: {},
  avgLatencyMs: 0,
};

// ─── Configuration ───────────────────────────────────────────────────
const CONFIG = {
  maxQueueSize: 100,
  maxConcurrentTrades: 3,
  deduplicateWindowMs: 5 * 60 * 1000, // Don't trade same market within 5 min
  // Minimum edge thresholds per source
  minEdge: {
    ORDERBOOK_ARB: 0.005,             // 0.5% — it's risk-free
    BREAKING_NEWS: 0.03,              // 3%
    NEW_MARKET_ARB: 0.01,             // 1%
    NEW_MARKET_BOOKMAKER_EDGE: 0.03,  // 3%
    NEW_MARKET_SPREAD: 0.02,          // 2%
    NEW_MARKET_EARLY: 0.05,           // 5%
    PANIC_DIP: 0.03,                  // 3%
    BOOKMAKER_EDGE: 0.03,             // 3%
    CROSS_PLATFORM_ARB: 0.02,         // 2%
    DEFAULT: 0.04,                    // 4% default
  },
  // Priority ordering (lower number = higher priority = processed first)
  priority: {
    ORDERBOOK_ARB: 1,
    BREAKING_NEWS: 2,
    NEW_MARKET_ARB: 3,
    CROSS_PLATFORM_ARB: 4,
    PANIC_DIP: 5,
    NEW_MARKET_BOOKMAKER_EDGE: 6,
    BOOKMAKER_EDGE: 7,
    NEW_MARKET_SPREAD: 8,
    NEW_MARKET_EARLY: 9,
    DEFAULT: 10,
  },
  // Order type preferences by signal type
  orderType: {
    ORDERBOOK_ARB: 'MARKET',
    BREAKING_NEWS: 'MARKET',
    NEW_MARKET_ARB: 'MARKET',
    CROSS_PLATFORM_ARB: 'MARKET',
    PANIC_DIP: 'LIMIT',
    BOOKMAKER_EDGE: 'LIMIT',
    NEW_MARKET_BOOKMAKER_EDGE: 'LIMIT',
    NEW_MARKET_SPREAD: 'LIMIT',
    NEW_MARKET_EARLY: 'LIMIT',
    DEFAULT: 'LIMIT',
  },
};

// ─── Signal Ingestion ────────────────────────────────────────────────

/**
 * Receive a signal from any edge engine.
 * Normalizes it and queues for processing.
 *
 * @param {Object} signal - Must contain:
 *   - conditionId: string
 *   - side: 'YES' | 'NO'
 *   - type: string (signal type)
 *   - estimatedEdge: number
 *   - currentPrice: number
 *   - source: string (engine name)
 *   Optional:
 *   - suggestedSize: number
 *   - limitPrice: number
 *   - urgency: 'IMMEDIATE' | 'NORMAL'
 *   - market: string (question text)
 *   - liquidity: number
 */
function ingestSignal(signal) {
  if (!signal.conditionId || !signal.side || signal.estimatedEdge == null) {
    log.debug('PIPELINE', 'Invalid signal: missing required fields');
    return false;
  }

  stats.signalsReceived++;
  const source = signal.source || 'unknown';
  stats.bySource[source] = (stats.bySource[source] || 0) + 1;

  // Check minimum edge threshold
  const minEdge = CONFIG.minEdge[signal.type] || CONFIG.minEdge.DEFAULT;
  if (signal.estimatedEdge < minEdge) {
    stats.signalsRejectedLowEdge++;
    return false;
  }

  // Deduplication: skip if same market + direction recently
  const dedupeKey = `${signal.conditionId}_${signal.side}`;
  const existing = activeSignals.get(dedupeKey);
  if (existing && (Date.now() - existing.time < CONFIG.deduplicateWindowMs)) {
    stats.signalsDeduplicated++;
    // Update existing with better edge if applicable
    if (signal.estimatedEdge > existing.estimatedEdge) {
      existing.estimatedEdge = signal.estimatedEdge;
      existing.updatedAt = Date.now();
    }
    return false;
  }

  // Queue the signal
  const enriched = {
    ...signal,
    id: `SIG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    priority: CONFIG.priority[signal.type] || CONFIG.priority.DEFAULT,
    preferredOrderType: CONFIG.orderType[signal.type] || CONFIG.orderType.DEFAULT,
    receivedAt: Date.now(),
    status: 'QUEUED',
  };

  signalQueue.push(enriched);
  activeSignals.set(dedupeKey, { time: Date.now(), estimatedEdge: signal.estimatedEdge });

  // Sort queue by priority
  signalQueue.sort((a, b) => a.priority - b.priority);

  // Trim queue
  if (signalQueue.length > CONFIG.maxQueueSize) {
    signalQueue = signalQueue.slice(0, CONFIG.maxQueueSize);
  }

  log.info('PIPELINE', `Signal queued: [${signal.type}] ${signal.market?.slice(0, 50) || signal.conditionId} → ${signal.side} (edge: ${(signal.estimatedEdge * 100).toFixed(1)}%, priority: ${enriched.priority})`);

  // Auto-process immediately for high-priority signals
  if (enriched.priority <= 3) {
    processQueue().catch(err => log.warn('PIPELINE', `Auto-process failed: ${err.message}`));
  }

  return true;
}

// ─── Signal Processing ───────────────────────────────────────────────

/**
 * Process queued signals: risk check → size → execute.
 */
async function processQueue() {
  if (isProcessing) return;
  if (signalQueue.length === 0) return;
  if (!executor) {
    log.warn('PIPELINE', 'Executor not available');
    return;
  }

  isProcessing = true;
  const results = [];

  try {
    const toProcess = signalQueue.splice(0, CONFIG.maxConcurrentTrades);

    for (const signal of toProcess) {
      try {
        const result = await processSignal(signal);
        results.push(result);
      } catch (err) {
        log.warn('PIPELINE', `Signal processing failed: ${err.message}`);
        signal.status = 'FAILED';
        signal.error = err.message;
        executionLog.push(signal);
      }
    }
  } finally {
    isProcessing = false;
  }

  // Trim execution log
  if (executionLog.length > 1000) {
    executionLog = executionLog.slice(-1000);
  }

  return results;
}

/**
 * Process a single signal through risk checks and execution.
 */
async function processSignal(signal) {
  const startTime = Date.now();
  const side = signal.side || 'YES';
  const SOURCE_TO_STRATEGY = {
    newMarketDetector: 'NEW_MARKET',
    newsReactor: 'NEWS_BREAK',
    panicDipDetector: 'PANIC_DIP',
    scanner: 'PROVEN_EDGE',
  };
  const strategy = SOURCE_TO_STRATEGY[signal.source] || signal.type || signal.source || 'DEFAULT';

  // ─── Disabled Strategy Gate (mirrors paper trader) ─────────────────
  if (DISABLED_STRATEGIES.has(strategy) || DISABLED_STRATEGIES.has(signal.type)) {
    signal.status = 'REJECTED_DISABLED';
    signal.riskReason = `Strategy ${strategy} is disabled`;
    executionLog.push(signal);
    stats.signalsRejectedRisk++;
    log.info('PIPELINE', `Disabled strategy: ${signal.market?.slice(0, 50)} — ${strategy}`);
    return { signal, result: null, reason: signal.riskReason };
  }

  // ─── Lifetime Dedup Gate (mirrors paper trader) ────────────────────
  // Paper trader only enters once per (conditionId, strategy, side) — ever.
  // Prevents repeated entries into the same losing market.
  const dedupKey = `${signal.conditionId}:${strategy}:${side}`;
  if (lifetimeDedup.has(dedupKey)) {
    signal.status = 'REJECTED_DEDUP';
    signal.riskReason = `Lifetime dedup: already traded ${dedupKey}`;
    stats.signalsDeduplicated++;
    return { signal, result: null, reason: signal.riskReason };
  }

  // ─── Time Horizon Gate (mirrors paper trader) ──────────────────────
  // Block trades resolving > 5 days out, require higher score for 2-5 day markets,
  // skip markets closing in < 12 hours.
  if (signal.endDate) {
    const end = new Date(signal.endDate);
    if (!isNaN(end.getTime())) {
      const daysLeft = Math.max(0, (end.getTime() - Date.now()) / 86400000);
      const hoursLeft = daysLeft * 24;
      if (daysLeft > MAX_DAYS_HORIZON) {
        signal.status = 'REJECTED_HORIZON';
        signal.riskReason = `Market resolves in ${daysLeft.toFixed(0)} days (max ${MAX_DAYS_HORIZON})`;
        executionLog.push(signal);
        stats.signalsRejectedRisk++;
        return { signal, result: null, reason: signal.riskReason };
      }
      if (daysLeft > MEDIUM_HORIZON_DAYS && (signal.score || 0) < MEDIUM_HORIZON_MIN_SCORE) {
        signal.status = 'REJECTED_HORIZON';
        signal.riskReason = `Medium-horizon (${daysLeft.toFixed(0)}d) needs score ≥${MEDIUM_HORIZON_MIN_SCORE}, got ${signal.score || 0}`;
        executionLog.push(signal);
        stats.signalsRejectedRisk++;
        return { signal, result: null, reason: signal.riskReason };
      }
      if (hoursLeft < MIN_HOURS_TO_CLOSE) {
        signal.status = 'REJECTED_HORIZON';
        signal.riskReason = `Market closes in ${hoursLeft.toFixed(0)}h (min ${MIN_HOURS_TO_CLOSE}h)`;
        executionLog.push(signal);
        stats.signalsRejectedRisk++;
        return { signal, result: null, reason: signal.riskReason };
      }
    }
  }

  // ─── Strategy Optimizer Gate (mirrors paper trader) ────────────────
  // Thompson Sampling optimizer disables strategies with <30% win rate after 30+ trades
  if (strategyOptimizer) {
    try {
      if (!strategyOptimizer.isEnabled(strategy)) {
        signal.status = 'REJECTED_OPTIMIZER';
        signal.riskReason = `Strategy ${strategy} disabled by optimizer`;
        executionLog.push(signal);
        stats.signalsRejectedRisk++;
        log.info('PIPELINE', `Optimizer disabled: ${signal.market?.slice(0, 50)} — ${strategy}`);
        return { signal, result: null, reason: signal.riskReason };
      }
    } catch { /* proceed if optimizer unavailable */ }
  }

  // ─── Learning Gate ─────────────────────────────────────────────────
  // Consult paper trader's learning system before executing real trades.
  // If a pattern has been blocked by the learning system, don't risk real money on it.
  if (paperTrader) {
    try {
      // Check pattern block (e.g., WHALE_DETECTION:YES blocked after 0W/8L)
      if (paperTrader.isPatternBlocked(strategy, side)) {
        signal.status = 'REJECTED_LEARNING';
        signal.riskReason = `Pattern ${strategy}:${side} blocked by learning system`;
        executionLog.push(signal);
        stats.signalsRejectedRisk++;
        log.info('PIPELINE', `Learning blocked: ${signal.market?.slice(0, 50)} — ${signal.riskReason}`);
        return { signal, result: null, reason: signal.riskReason };
      }

      // Also check all related strategy variations — a signal type like
      // BREAKING_NEWS maps to NEWS_BREAK, but also check the raw type
      if (signal.type && signal.type !== strategy && paperTrader.isPatternBlocked(signal.type, side)) {
        signal.status = 'REJECTED_LEARNING';
        signal.riskReason = `Pattern ${signal.type}:${side} blocked by learning system`;
        executionLog.push(signal);
        stats.signalsRejectedRisk++;
        log.info('PIPELINE', `Learning blocked (type): ${signal.market?.slice(0, 50)} — ${signal.riskReason}`);
        return { signal, result: null, reason: signal.riskReason };
      }

      // Check learned threshold — don't execute below profitable score
      const learned = paperTrader.getLearnedThreshold(strategy);
      if (learned && learned.sampleSize >= 5 && (signal.score || 0) < learned.profitCutoff) {
        signal.status = 'REJECTED_LEARNING';
        signal.riskReason = `Score ${signal.score || 0} below learned profitable threshold ${learned.profitCutoff} for ${strategy}`;
        executionLog.push(signal);
        stats.signalsRejectedRisk++;
        log.info('PIPELINE', `Learning threshold blocked: ${signal.market?.slice(0, 50)} — score ${signal.score} < ${learned.profitCutoff}`);
        return { signal, result: null, reason: signal.riskReason };
      }
    } catch (err) {
      log.debug('PIPELINE', `Learning gate check failed: ${err.message}`);
      // Proceed if learning check fails — don't block real trades on learning errors
    }
  }

  // Mark lifetime dedup AFTER all gates pass (before execution)
  lifetimeDedup.add(dedupKey);

  // Risk check
  if (riskManager) {
    try {
      const riskCheck = riskManager.canTrade({
        conditionId: signal.conditionId,
        side: signal.side,
        size: signal.suggestedSize || 10,
        market: signal.market,
      });

      if (riskCheck && riskCheck.blocked) {
        signal.status = 'REJECTED_RISK';
        signal.riskReason = riskCheck.reason;
        executionLog.push(signal);
        stats.signalsRejectedRisk++;
        log.info('PIPELINE', `Risk blocked: ${signal.market?.slice(0, 50)} — ${riskCheck.reason}`);
        return { signal, result: null, reason: riskCheck.reason };
      }
    } catch { /* proceed if risk check fails */ }
  }

  // Build opportunity for executor
  const opportunity = {
    market: signal.market || signal.conditionId,
    conditionId: signal.conditionId,
    slug: signal.slug,
    side: signal.side,
    strategy: signal.source || signal.type,
    score: signal.score || 50,
    confidence: signal.impactScore > 0.7 ? 'HIGH' : signal.impactScore > 0.4 ? 'MEDIUM' : 'LOW',
    entryPrice: signal.currentPrice,
    edge: signal.estimatedEdge,
    liquidity: signal.liquidity || 5000,
    volume24hr: signal.volume || 1000,
    // Execution preferences
    orderType: signal.preferredOrderType,
    limitPrice: signal.limitPrice,
    suggestedSize: signal.suggestedSize,
  };

  // Scale position by strategy optimizer allocation (mirrors paper trader)
  if (strategyOptimizer && opportunity.suggestedSize) {
    try {
      const alloc = strategyOptimizer.getAllocation(strategy);
      opportunity.suggestedSize = Math.round(opportunity.suggestedSize * Math.min(alloc, 2.0) * 100) / 100;
    } catch { /* proceed with original size */ }
  }

  // Execute — use scanner's bankroll (the canonical source) with fallback
  const bankroll = scanner?.getBankroll?.() || 3000;
  const result = await executor.execute(opportunity, bankroll);

  signal.status = result?.status || 'UNKNOWN';
  signal.executionResult = {
    orderId: result?.orderId,
    status: result?.status,
    filledPrice: result?.filledPrice,
    positionSize: result?.positionSize,
    latencyMs: Date.now() - startTime,
  };

  executionLog.push(signal);
  stats.signalsExecuted++;
  stats.avgLatencyMs = stats.avgLatencyMs * 0.9 + (Date.now() - startTime) * 0.1;

  // Record edge for resolution tracking
  if (edgeResolver && result?.status === 'FILLED') {
    try {
      edgeResolver.recordEdge({
        conditionId: signal.conditionId,
        question: signal.market,
        marketPrice: signal.currentPrice,
        prob: signal.currentPrice + (signal.side === 'YES' ? signal.estimatedEdge : -signal.estimatedEdge),
        divergence: signal.estimatedEdge * (signal.side === 'YES' ? 1 : -1),
        absDivergence: signal.estimatedEdge,
        edgeSignal: signal.estimatedEdge > 0.05 ? 'STRONG' : 'MODERATE',
        edgeDirection: `${signal.side} (${signal.type})`,
        sourceCount: 1,
        source: signal.source,
      });
    } catch { /* non-critical */ }
  }

  log.info('PIPELINE', `Executed: [${signal.type}] ${signal.market?.slice(0, 40)} → ${result?.status} (${Date.now() - startTime}ms)`);

  return { signal, result };
}

// ─── Adapter Functions for Edge Engines ──────────────────────────────

/**
 * Adapter: Convert new market detector signal to pipeline signal.
 */
function fromNewMarketDetector(market, analysis) {
  if (!analysis.opportunity) return;
  ingestSignal({
    conditionId: analysis.conditionId,
    market: analysis.question,
    slug: analysis.slug,
    side: analysis.opportunity.side,
    type: analysis.opportunity.type,
    estimatedEdge: analysis.opportunity.estimatedEdge,
    currentPrice: analysis.opportunity.side === 'YES' ? analysis.yesPrice : analysis.noPrice,
    suggestedSize: analysis.opportunity.suggestedSize,
    limitPrice: analysis.opportunity.suggestedPrice,
    score: analysis.score,
    liquidity: analysis.liquidity,
    volume: analysis.volume,
    endDate: analysis.endDate || market.endDate || market.end_date_iso,
    source: 'newMarketDetector',
  });
}

/**
 * Adapter: Convert news reactor signal to pipeline signal.
 */
function fromNewsReactor(newsSignal) {
  ingestSignal({
    conditionId: newsSignal.conditionId,
    market: newsSignal.market,
    slug: newsSignal.slug,
    side: newsSignal.side,
    type: 'BREAKING_NEWS',
    estimatedEdge: newsSignal.estimatedEdge,
    currentPrice: newsSignal.currentPrice,
    suggestedSize: newsSignal.action?.suggestedSize,
    limitPrice: newsSignal.action?.limitPrice,
    urgency: newsSignal.action?.urgency,
    impactScore: newsSignal.impactScore,
    liquidity: newsSignal.liquidity,
    volume: newsSignal.volume,
    endDate: newsSignal.endDate,
    source: 'newsReactor',
    headline: newsSignal.headline,
  });
}

/**
 * Adapter: Convert panic dip signal to pipeline signal.
 */
function fromPanicDip(dip) {
  ingestSignal({
    conditionId: dip.conditionId,
    market: dip.question,
    slug: dip.slug,
    side: dip.suggestedAction.side,
    type: 'PANIC_DIP',
    estimatedEdge: dip.netEdge,
    currentPrice: dip.currentPrice,
    suggestedSize: dip.suggestedAction.suggestedSize,
    limitPrice: dip.suggestedAction.limitPrice,
    score: dip.score,
    liquidity: dip.liquidity,
    volume: dip.volume,
    endDate: dip.endDate,
    source: 'panicDipDetector',
    dropPct: dip.dropPct,
    reversionTarget: dip.reversionTarget,
  });
}

// ─── Status & History ────────────────────────────────────────────────

function getStatus() {
  return {
    queueSize: signalQueue.length,
    activeSignals: activeSignals.size,
    isProcessing,
    stats: { ...stats },
  };
}

function getExecutionLog(limit = 50) {
  return executionLog.slice(-limit).reverse();
}

function getSignalBreakdown() {
  const breakdown = {};
  for (const entry of executionLog) {
    const type = entry.type || 'unknown';
    if (!breakdown[type]) {
      breakdown[type] = { total: 0, executed: 0, rejected: 0, failed: 0 };
    }
    breakdown[type].total++;
    if (entry.status === 'FILLED') breakdown[type].executed++;
    else if (entry.status?.startsWith('REJECTED')) breakdown[type].rejected++;
    else breakdown[type].failed++;
  }
  return breakdown;
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      executionLog: executionLog.slice(-500),
      stats,
      savedAt: new Date().toISOString(),
    }, null, 2));
  } catch { /* non-critical */ }
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      executionLog = data.executionLog || [];
      stats = { ...stats, ...(data.stats || {}) };
    }
  } catch { /* fresh start */ }
}

// Load state on init
loadState();

module.exports = {
  ingestSignal,
  processQueue,
  // Adapters for edge engines
  fromNewMarketDetector,
  fromNewsReactor,
  fromPanicDip,
  // Status
  getStatus,
  getExecutionLog,
  getSignalBreakdown,
  saveState,
  CONFIG,
};
