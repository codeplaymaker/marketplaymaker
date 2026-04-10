/**
 * Shadow Live Trading — Validation Layer
 *
 * Mirrors a subset of paper trades with tiny real money ($1-2 per trade)
 * to validate that actual CLOB fills match simulated performance.
 *
 * PURPOSE:
 * - Compare real fill prices vs paper trade entry prices
 * - Measure actual slippage vs estimated slippage
 * - Validate that the edge survives real-world execution costs
 * - Build confidence before scaling to full real money sizing
 *
 * SAFETY:
 * - Hard-capped at $50 total deployment
 * - Max $2 per trade
 * - Max 5 concurrent positions
 * - $5 daily loss limit halts all shadow trading
 * - Only mirrors proven strategies (autoScan, ARBITRAGE, MOMENTUM)
 * - Requires explicit opt-in via SHADOW_LIVE_ENABLED=true
 */

const config = require('../config');
const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const SHADOW_CONFIG = config.shadowLive || {};
const STATE_FILE = path.join(__dirname, '../logs/shadow-live-state.json');

let state = {
  enabled: false,
  totalDeployed: 0,
  totalReturned: 0,
  dailyLoss: 0,
  lastResetDate: new Date().toDateString(),
  openPositions: [],    // { id, conditionId, market, side, size, entryPrice, paperEntryPrice, paperSlippage, realSlippage, orderId, timestamp }
  closedPositions: [],  // Same + { exitPrice, pnl, paperPnl, slippageDelta }
  fillComparisons: [],  // { conditionId, paperPrice, realPrice, slippageDiff, timestamp }
  stats: {
    totalTrades: 0,
    totalPaperTrades: 0,
    avgSlippageDelta: 0,  // Real slippage - paper slippage (positive = worse than expected)
    realPnL: 0,
    paperMirrorPnL: 0,    // What paper said these same trades would make
    fillMatchRate: 0,     // % of trades where real fill was within 1% of paper
  },
};

// ─── Persistence ─────────────────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      state = { ...state, ...data };
    }
  } catch (err) {
    log.warn('SHADOW_LIVE', `Failed to load state: ${err.message}`);
  }
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    log.warn('SHADOW_LIVE', `Failed to save state: ${err.message}`);
  }
}

loadState();

// ─── Daily Reset ─────────────────────────────────────────────────────
function resetDailyIfNeeded() {
  const today = new Date().toDateString();
  if (today !== state.lastResetDate) {
    state.dailyLoss = 0;
    state.lastResetDate = today;
    saveState();
  }
}

// ─── Core Logic ──────────────────────────────────────────────────────

/**
 * Check if a paper trade should be mirrored with real money.
 * Returns the shadow trade config if yes, null if no.
 */
function shouldMirror(paperTrade) {
  if (!SHADOW_CONFIG.enabled) {
    log.debug('SHADOW_LIVE', 'Skipped: not enabled');
    return null;
  }
  resetDailyIfNeeded();

  const maxBankroll = SHADOW_CONFIG.maxBankroll || 50;
  const maxPerTrade = SHADOW_CONFIG.maxPerTrade || 2;
  const maxOpen = SHADOW_CONFIG.maxOpenPositions || 5;
  const maxDailyLoss = SHADOW_CONFIG.maxDailyLoss || 5;
  const minScore = SHADOW_CONFIG.minScore || 70;
  const minLiquidity = SHADOW_CONFIG.minLiquidity || 5000;
  const allowedStrategies = SHADOW_CONFIG.strategies || ['autoScan', 'ARBITRAGE', 'MOMENTUM'];

  // Hard stops
  if (state.dailyLoss >= maxDailyLoss) { log.debug('SHADOW_LIVE', 'Skipped: daily loss limit'); return null; }
  if (state.openPositions.length >= maxOpen) { log.debug('SHADOW_LIVE', 'Skipped: max open positions'); return null; }
  if (state.totalDeployed - state.totalReturned >= maxBankroll) { log.debug('SHADOW_LIVE', 'Skipped: max bankroll deployed'); return null; }

  // Quality gates
  if ((paperTrade.score || 0) < minScore) { log.debug('SHADOW_LIVE', `Skipped: score ${paperTrade.score} < ${minScore}`); return null; }
  if (!allowedStrategies.includes(paperTrade.strategy)) { log.debug('SHADOW_LIVE', `Skipped: strategy ${paperTrade.strategy} not allowed`); return null; }
  if ((paperTrade.liquidity || 0) < minLiquidity) { log.debug('SHADOW_LIVE', `Skipped: liquidity ${paperTrade.liquidity || 0} < ${minLiquidity}`); return null; }

  // Need token IDs for real execution
  if (!paperTrade.yesTokenId && !paperTrade.noTokenId) { log.debug('SHADOW_LIVE', 'Skipped: no token IDs'); return null; }

  log.info('SHADOW_LIVE', `✅ MIRROR: ${paperTrade.strategy} ${paperTrade.side} "${paperTrade.market?.slice(0,40)}" score:${paperTrade.score} liq:${paperTrade.liquidity}`);
  const size = Math.min(maxPerTrade, paperTrade.kellySize || maxPerTrade);

  return {
    size,
    side: paperTrade.side,
    tokenId: paperTrade.side === 'YES' ? paperTrade.yesTokenId : paperTrade.noTokenId,
    price: paperTrade.entryPrice || paperTrade.rawEntryPrice,
    paperEntryPrice: paperTrade.entryPrice,
    paperSlippage: paperTrade.slippage || 0,
    conditionId: paperTrade.conditionId,
    market: paperTrade.market,
    strategy: paperTrade.strategy,
    paperTradeId: paperTrade.id,
  };
}

/**
 * Execute a shadow live trade via the CLOB executor.
 * Records the fill for comparison against paper simulation.
 */
async function executeShadow(shadowConfig) {
  let clobExecutor;
  try { clobExecutor = require('../polymarket/clobExecutor'); } catch { return null; }

  const execStatus = clobExecutor.getStatus();
  if (!execStatus.initialized || execStatus.dryRun) {
    log.debug('SHADOW_LIVE', 'CLOB executor not ready for shadow trades');
    return null;
  }

  // Final balance check
  const balance = await clobExecutor.getUSDCBalance();
  if (balance < shadowConfig.size) {
    log.warn('SHADOW_LIVE', `Insufficient USDC for shadow trade: $${balance.toFixed(2)}`);
    return null;
  }

  try {
    const result = await clobExecutor.placeTrade({
      tokenId: shadowConfig.tokenId,
      side: 'BUY',
      price: shadowConfig.price,
      size: shadowConfig.size,
      maxSlippage: 0.03, // 3% max slippage for shadow trades
    });

    if (result.status === 'SLIPPAGE_EXCEEDED' || result.status === 'INSUFFICIENT_FUNDS' || result.status === 'NOT_INITIALIZED') {
      log.info('SHADOW_LIVE', `Shadow trade rejected: ${result.status}`);
      return null;
    }

    // Wait for fill (short timeout for shadow trades)
    let fillPrice = shadowConfig.price;
    let fillOutcome = 'SUBMITTED';
    if (result.orderId && result.status !== 'DRY_RUN') {
      const fillResult = await clobExecutor.waitForFill(result.orderId, { timeoutMs: 30000 });
      fillOutcome = fillResult.outcome;
      if (fillResult.avgFillPrice) fillPrice = fillResult.avgFillPrice;
    }

    // Record position
    const realSlippage = Math.abs(fillPrice - (shadowConfig.paperEntryPrice || shadowConfig.price)) / (shadowConfig.paperEntryPrice || shadowConfig.price);
    const position = {
      id: `SL-${Date.now()}`,
      conditionId: shadowConfig.conditionId,
      market: shadowConfig.market,
      strategy: shadowConfig.strategy,
      side: shadowConfig.side,
      size: shadowConfig.size,
      entryPrice: fillPrice,
      paperEntryPrice: shadowConfig.paperEntryPrice,
      paperSlippage: shadowConfig.paperSlippage,
      realSlippage,
      orderId: result.orderId,
      paperTradeId: shadowConfig.paperTradeId,
      fillOutcome,
      timestamp: new Date().toISOString(),
    };

    state.openPositions.push(position);
    state.totalDeployed += shadowConfig.size;
    state.stats.totalTrades++;

    // Record fill comparison
    const slippageDiff = realSlippage - shadowConfig.paperSlippage;
    state.fillComparisons.push({
      conditionId: shadowConfig.conditionId,
      paperPrice: shadowConfig.paperEntryPrice,
      realPrice: fillPrice,
      paperSlippage: shadowConfig.paperSlippage,
      realSlippage,
      slippageDiff,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 200 comparisons
    if (state.fillComparisons.length > 200) {
      state.fillComparisons = state.fillComparisons.slice(-200);
    }

    // Update running stats
    updateStats();
    saveState();

    log.info('SHADOW_LIVE', `Shadow trade: ${shadowConfig.side} $${shadowConfig.size} "${shadowConfig.market?.slice(0, 50)}" | paper: ${shadowConfig.paperEntryPrice} real: ${fillPrice} | slip diff: ${(slippageDiff * 100).toFixed(2)}%`);

    return position;
  } catch (err) {
    log.error('SHADOW_LIVE', `Shadow trade failed: ${err.message}`);
    return null;
  }
}

/**
 * Record resolution of a shadow position.
 * Called by the paper trader resolution loop when a mirrored market resolves.
 */
function resolvePosition(conditionId, outcome) {
  const posIdx = state.openPositions.findIndex(p => p.conditionId === conditionId);
  if (posIdx === -1) return null;

  const pos = state.openPositions[posIdx];
  const won = (outcome === 'YES' && pos.side === 'YES') || (outcome === 'NO' && pos.side === 'NO');
  const shares = pos.size / pos.entryPrice;
  const payout = won ? shares * 1.0 : 0;
  const fee = won ? payout * 0.02 : 0;
  const pnl = payout - fee - pos.size;

  // Calculate what paper said this trade would make
  const paperShares = pos.size / pos.paperEntryPrice;
  const paperPayout = won ? paperShares * 1.0 : 0;
  const paperFee = won ? paperPayout * 0.02 : 0;
  const paperPnl = paperPayout - paperFee - pos.size;

  const closed = {
    ...pos,
    outcome,
    won,
    pnl: Math.round(pnl * 100) / 100,
    paperPnl: Math.round(paperPnl * 100) / 100,
    pnlDelta: Math.round((pnl - paperPnl) * 100) / 100,
    resolvedAt: new Date().toISOString(),
  };

  state.openPositions.splice(posIdx, 1);
  state.closedPositions.push(closed);
  state.totalReturned += (payout - fee);
  state.stats.realPnL += pnl;
  state.stats.paperMirrorPnL += paperPnl;

  if (pnl < 0) state.dailyLoss += Math.abs(pnl);

  // Keep only last 500 closed
  if (state.closedPositions.length > 500) {
    state.closedPositions = state.closedPositions.slice(-500);
  }

  updateStats();
  saveState();

  log.info('SHADOW_LIVE', `Shadow resolved: ${won ? 'WIN' : 'LOSS'} $${pnl.toFixed(2)} (paper: $${paperPnl.toFixed(2)}, delta: $${closed.pnlDelta.toFixed(2)}) "${pos.market?.slice(0, 40)}"`);

  return closed;
}

function updateStats() {
  if (state.fillComparisons.length > 0) {
    const diffs = state.fillComparisons.map(f => f.slippageDiff);
    state.stats.avgSlippageDelta = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const withinOnePercent = state.fillComparisons.filter(f => Math.abs(f.slippageDiff) < 0.01).length;
    state.stats.fillMatchRate = withinOnePercent / state.fillComparisons.length;
  }
}

function getStatus() {
  resetDailyIfNeeded();
  return {
    enabled: SHADOW_CONFIG.enabled,
    openPositions: state.openPositions.length,
    totalDeployed: Math.round(state.totalDeployed * 100) / 100,
    netDeployed: Math.round((state.totalDeployed - state.totalReturned) * 100) / 100,
    dailyLoss: Math.round(state.dailyLoss * 100) / 100,
    stats: state.stats,
    closedCount: state.closedPositions.length,
    fillComparisons: state.fillComparisons.length,
    readyForFullLive: state.stats.totalTrades >= 20 && state.stats.fillMatchRate >= 0.7 && state.stats.avgSlippageDelta < 0.02,
  };
}

module.exports = {
  shouldMirror,
  executeShadow,
  resolvePosition,
  getStatus,
  loadState,
};
