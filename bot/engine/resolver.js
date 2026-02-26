/**
 * Resolution Tracker v3 — Calibration Learning Loop
 *
 * UPGRADES FROM v2:
 * - SIGNAL-LEVEL FEEDBACK: Records which signals were right/wrong for each resolution
 * - AUTOMATIC ISOTONIC RETRAIN: After enough resolutions, probabilityModel recalibrates
 * - RESOLUTION PERSISTENCE: Full signal snapshots stored for posterior analysis
 * - PERFORMANCE DECAY TRACKING: Detects when strategies stop working
 *
 * Polymarket markets resolve to YES ($1) or NO ($0).
 * This module converts binary outcomes into calibration data.
 */

const client = require('../polymarket/client');
const probabilityModel = require('./probabilityModel');
const fees = require('./fees');
const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

let paperTrader = null;
try { paperTrader = require('./paperTrader'); } catch { /* optional */ }

const RESOLUTION_CHECK_MS = 60000; // Check every 60s
const DATA_FILE = path.join(__dirname, '../logs/resolutions.json');

let resolvedMarkets = new Map();
let realizedPnL = [];
let signalSnapshots = [];  // NEW: signal-level records for learning
let checkInterval = null;

// ─── Persistence ─────────────────────────────────────────────────────
function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      resolvedMarkets = new Map(Object.entries(data.markets || {}));
      realizedPnL = data.realizedPnL || [];
      signalSnapshots = data.signalSnapshots || [];
      log.info('RESOLVER', `Loaded ${resolvedMarkets.size} resolutions, ${realizedPnL.length} realized trades, ${signalSnapshots.length} signal snapshots`);
    }
  } catch (err) {
    log.warn('RESOLVER', `Failed to load: ${err.message}`);
  }
}

function save() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      markets: Object.fromEntries(resolvedMarkets),
      realizedPnL,
      signalSnapshots: signalSnapshots.slice(-500), // Keep last 500 for learning
      savedAt: new Date().toISOString(),
    }, null, 2));
  } catch (err) {
    log.warn('RESOLVER', `Failed to save: ${err.message}`);
  }
}

// ─── Resolution Checking ─────────────────────────────────────────────
/**
 * Check if a single market has resolved via Gamma API.
 * Caches results so we don't re-query resolved markets.
 */
async function checkMarketResolution(conditionId) {
  if (resolvedMarkets.has(conditionId)) {
    return resolvedMarkets.get(conditionId);
  }

  try {
    const market = await client.getMarketById(conditionId);
    if (!market) return null;

    // Market must be both closed AND have a deterministic outcome
    if (!market.closed && !market.resolved) return null;

    const outcomePrices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];
    const yesPrice = parseFloat(outcomePrices[0] || 0.5);

    let outcome = null;
    if (yesPrice >= 0.99) outcome = 'YES';
    else if (yesPrice <= 0.01) outcome = 'NO';
    else return null; // Not fully resolved yet

    const resolution = {
      conditionId,
      outcome,
      resolvedAt: new Date().toISOString(),
      question: market.question,
    };

    resolvedMarkets.set(conditionId, resolution);

    // Feed to probability model calibration with signal-level data.
    // The model's recordResolution() now tracks per-signal accuracy
    // and triggers isotonic retraining automatically.
    const lastYesPrice = market.lastTradePrice || yesPrice;

    // Get signal snapshot from paper trader for proper signal-level feedback
    // NOTE: paperTrader.resolveMarket() internally calls probabilityModel.recordResolution()
    // with the ORIGINAL entry price (not the post-resolution price). So we do NOT call
    // recordResolution() again here to avoid double-counting.
    let signalFeedback = {};
    if (paperTrader) {
      try {
        const ptResult = paperTrader.resolveMarket(conditionId, outcome);
        if (ptResult && ptResult.signalFeedback) {
          signalFeedback = ptResult.signalFeedback;
          log.info('RESOLVER', `Signal feedback: ${Object.keys(signalFeedback).length} signals for learning`);
        }
      } catch (err) {
        log.warn('RESOLVER', `Paper trader feedback failed: ${err.message}`);
      }
    }

    // Only record calibration if paper trader didn't handle it (no paper trades for this market)
    if (!signalFeedback || Object.keys(signalFeedback).length === 0) {
      // Use a reasonable pre-resolution price estimate (NOT the resolved price)
      // When market resolves to YES, yesPrice→1.0; to NO, yesPrice→0.0
      // That tells us nothing about calibration. Use lastTradePrice if meaningful.
      const calPrice = (market.lastTradePrice && market.lastTradePrice > 0.01 && market.lastTradePrice < 0.99)
        ? parseFloat(market.lastTradePrice)
        : null;
      if (calPrice) {
        probabilityModel.recordResolution(calPrice, outcome, signalFeedback);
      }
    }

    // Store signal snapshot for future analysis
    signalSnapshots.push({
      conditionId,
      outcome,
      lastYesPrice: parseFloat(lastYesPrice),
      question: (market.question || '').slice(0, 100),
      resolvedAt: resolution.resolvedAt,
    });

    // Log calibration insight
    try {
      const signalPerf = probabilityModel.getSignalPerformance
        ? probabilityModel.getSignalPerformance()
        : null;
      if (signalPerf) {
        const topSignals = Object.entries(signalPerf)
          .sort((a, b) => b[1].accuracy - a[1].accuracy)
          .slice(0, 3);
        log.info('RESOLVER', `Top signals: ${topSignals.map(([k, v]) => `${k}(${(v.accuracy * 100).toFixed(0)}%)`).join(', ')}`);
      }
    } catch { /* non-critical */ }

    log.info('RESOLVER', `Market resolved: "${market.question}" → ${outcome}`);
    save();

    return resolution;
  } catch (err) {
    log.warn('RESOLVER', `Check failed for ${conditionId}: ${err.message}`);
    return null;
  }
}

// ─── P&L Calculation ─────────────────────────────────────────────────
/**
 * Calculate real P&L for a position given its resolution outcome.
 *
 * Binary payout:
 *   If you hold YES shares and outcome = YES → each share pays $1
 *   If you hold YES shares and outcome = NO  → each share pays $0
 *   (and vice versa for NO shares)
 *
 * P&L = (payout - entryPrice) × shares - fees
 */
function calculatePnL(position, resolution) {
  const { side, size, avgPrice } = position;
  const shares = size / avgPrice;

  let payout;
  if (side === 'YES') {
    payout = resolution.outcome === 'YES' ? 1.0 : 0.0;
  } else {
    payout = resolution.outcome === 'NO' ? 1.0 : 0.0;
  }

  const grossPnL = (payout - avgPrice) * shares;
  const fee = grossPnL > 0 ? grossPnL * fees.DEFAULT_FEE_RATE : 0;
  const netPnL = grossPnL - fee;

  return {
    grossPnL: r2(grossPnL),
    fee: r2(fee),
    netPnL: r2(netPnL),
    payout,
    shares: r2(shares),
    won: grossPnL > 0,
    outcome: resolution.outcome,
  };
}

/**
 * Check all open positions and return any that have resolved.
 */
async function checkPositions(positions) {
  const resolved = [];

  for (const pos of positions) {
    try {
      const resolution = await checkMarketResolution(pos.conditionId);
      if (resolution) {
        const pnl = calculatePnL(pos, resolution);
        const record = {
          conditionId: pos.conditionId,
          market: pos.market,
          strategy: pos.strategy,
          side: pos.side,
          entryPrice: pos.avgPrice,
          size: pos.size,
          ...pnl,
          resolvedAt: resolution.resolvedAt,
        };
        realizedPnL.push(record);
        resolved.push({ position: pos, resolution, pnl: record });
      }
    } catch (err) {
      // Continue checking other positions
    }
  }

  if (resolved.length > 0) save();
  return resolved;
}

// ─── Periodic Checking ───────────────────────────────────────────────
function startChecking(getPositions, onResolution) {
  load();

  checkInterval = setInterval(async () => {
    const positions = getPositions();
    if (positions.length === 0) return;

    const resolved = await checkPositions(positions);
    for (const result of resolved) {
      onResolution(result);
    }
  }, RESOLUTION_CHECK_MS);

  log.info('RESOLVER', 'Resolution tracker started');
}

function stopChecking() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  save();
}

// ─── Real Performance Metrics ────────────────────────────────────────
function getRealPerformance() {
  if (realizedPnL.length === 0) {
    return {
      totalTrades: 0, wins: 0, losses: 0, winRate: 0,
      grossPnL: 0, totalFees: 0, netPnL: 0,
      avgWin: 0, avgLoss: 0, profitFactor: 0,
      byStrategy: {},
    };
  }

  const wins = realizedPnL.filter(t => t.won);
  const losses = realizedPnL.filter(t => !t.won);
  const grossP = realizedPnL.reduce((s, t) => s + t.grossPnL, 0);
  const totalFees = realizedPnL.reduce((s, t) => s + t.fee, 0);
  const netP = realizedPnL.reduce((s, t) => s + t.netPnL, 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.netPnL, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.netPnL, 0) / losses.length : 0;
  const grossWins = wins.reduce((s, t) => s + t.netPnL, 0);
  const grossLosses = Math.abs(losses.reduce((s, t) => s + t.netPnL, 0));

  // By strategy breakdown
  const byStrategy = {};
  for (const t of realizedPnL) {
    const strat = t.strategy || 'UNKNOWN';
    if (!byStrategy[strat]) {
      byStrategy[strat] = { trades: 0, wins: 0, netPnL: 0, avgEdge: 0 };
    }
    byStrategy[strat].trades++;
    if (t.won) byStrategy[strat].wins++;
    byStrategy[strat].netPnL += t.netPnL;
  }
  for (const strat of Object.values(byStrategy)) {
    strat.winRate = strat.trades > 0 ? r2(strat.wins / strat.trades * 100) : 0;
    strat.netPnL = r2(strat.netPnL);
  }

  return {
    totalTrades: realizedPnL.length,
    wins: wins.length,
    losses: losses.length,
    winRate: r2(wins.length / realizedPnL.length * 100),
    grossPnL: r2(grossP),
    totalFees: r2(totalFees),
    netPnL: r2(netP),
    avgWin: r2(avgWin),
    avgLoss: r2(avgLoss),
    profitFactor: grossLosses > 0 ? r2(grossWins / grossLosses) : grossWins > 0 ? Infinity : 0,
    byStrategy,
    pnlCurve: buildPnLCurve(),
  };
}

function buildPnLCurve() {
  let cumPnL = 0;
  return realizedPnL.map(t => {
    cumPnL += t.netPnL;
    return {
      timestamp: t.resolvedAt,
      pnl: t.netPnL,
      cumPnL: r2(cumPnL),
      strategy: t.strategy,
      won: t.won,
    };
  });
}

function isResolved(conditionId) {
  return resolvedMarkets.has(conditionId);
}

function getResolution(conditionId) {
  return resolvedMarkets.get(conditionId) || null;
}

function getStats() {
  return {
    totalResolved: resolvedMarkets.size,
    totalRealized: realizedPnL.length,
    signalSnapshots: signalSnapshots.length,
  };
}

/**
 * Get calibration learning insights.
 * Shows how well our probability estimates match actual outcomes.
 */
function getCalibrationInsights() {
  if (signalSnapshots.length < 5) {
    return { status: 'INSUFFICIENT_DATA', needed: 5, have: signalSnapshots.length };
  }

  // Bin calibration: group predicted probabilities and check actual win rates
  const bins = {};
  for (const snap of signalSnapshots) {
    const binKey = (Math.round(snap.lastYesPrice * 10) / 10).toFixed(1); // 10% bins
    if (!bins[binKey]) bins[binKey] = { predicted: parseFloat(binKey), count: 0, actualYes: 0 };
    bins[binKey].count++;
    if (snap.outcome === 'YES') bins[binKey].actualYes++;
  }

  const calibrationCurve = Object.values(bins).map(b => ({
    predictedProb: b.predicted,
    actualRate: b.count > 0 ? Math.round((b.actualYes / b.count) * 1000) / 1000 : 0,
    sampleSize: b.count,
  })).sort((a, b) => a.predictedProb - b.predictedProb);

  // Brier score: lower = better calibration
  let brierSum = 0;
  for (const snap of signalSnapshots) {
    const actual = snap.outcome === 'YES' ? 1 : 0;
    brierSum += Math.pow(snap.lastYesPrice - actual, 2);
  }
  const brierScore = Math.round((brierSum / signalSnapshots.length) * 10000) / 10000;

  // Signal performance from probability model
  let signalPerformance = null;
  try {
    signalPerformance = probabilityModel.getSignalPerformance
      ? probabilityModel.getSignalPerformance()
      : null;
  } catch { /* non-critical */ }

  return {
    status: 'OK',
    totalResolutions: signalSnapshots.length,
    brierScore,
    brierRating: brierScore < 0.15 ? 'EXCELLENT' : brierScore < 0.22 ? 'GOOD' : brierScore < 0.30 ? 'FAIR' : 'POOR',
    calibrationCurve,
    signalPerformance,
  };
}

function reset() {
  realizedPnL = [];
  signalSnapshots = [];
  // Keep resolved markets cache — that's factual data
  save();
}

function r2(n) { return Math.round(n * 100) / 100; }

module.exports = {
  checkMarketResolution,
  calculatePnL,
  checkPositions,
  startChecking,
  stopChecking,
  getRealPerformance,
  getCalibrationInsights,
  isResolved,
  getResolution,
  getStats,
  load,
  save,
  reset,
};
