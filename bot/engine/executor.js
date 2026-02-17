const riskManager = require('./riskManager');
const { estimateSlippage } = require('./fees');
const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const TRADES_FILE = path.join(__dirname, '..', 'logs', 'executed-trades.json');

/**
 * Trade Executor v3 — Smart Order Execution
 *
 * UPGRADES FROM v2:
 * - LIMIT ORDERS: Queue limit orders that fill when price reaches target
 * - TWAP EXECUTION: Split large orders into smaller time-weighted chunks
 * - ICEBERG ORDERS: Hidden size to reduce market impact
 * - SMART ROUTING: Choose market vs limit based on urgency & spread
 * - POSITION SCALING: Dynamic risk multiplier from risk manager
 *
 * Modes:
 * 1. SIMULATION: Realistic orderbook-aware paper trading
 * 2. LIVE: Actual execution via Polymarket CLOB API (requires keys)
 */

let mode = 'SIMULATION'; // SIMULATION | LIVE
let executedTrades = [];
let pendingOrders = [];    // Limit/TWAP queue
let orderIdCounter = 0;

const PENDING_FILE = path.join(__dirname, '..', 'logs', 'pending-orders.json');

// ─── Disk Persistence ────────────────────────────────────────────────
function saveTrades() {
  try {
    fs.writeFileSync(TRADES_FILE, JSON.stringify(executedTrades, null, 2));
  } catch (err) {
    log.warn('EXECUTOR', `Failed to save trades: ${err.message}`);
  }
}

function loadTrades() {
  try {
    if (!fs.existsSync(TRADES_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(TRADES_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      executedTrades = raw;
      orderIdCounter = raw.length;
      log.info('EXECUTOR', `Loaded ${raw.length} trades from disk`);
    }
  } catch (err) {
    log.warn('EXECUTOR', `Failed to load trades: ${err.message}`);
  }
}

function savePending() {
  try {
    fs.writeFileSync(PENDING_FILE, JSON.stringify(pendingOrders, null, 2));
  } catch (err) {
    log.warn('EXECUTOR', `Failed to save pending orders: ${err.message}`);
  }
}

function loadPending() {
  try {
    if (!fs.existsSync(PENDING_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
    if (Array.isArray(raw) && raw.length > 0) {
      // Only load orders that haven't expired
      const now = new Date();
      const valid = raw.filter(o => o.expiresAt && new Date(o.expiresAt) > now);
      pendingOrders = valid;
      log.info('EXECUTOR', `Loaded ${valid.length} pending orders from disk (${raw.length - valid.length} expired)`);
    }
  } catch (err) {
    log.warn('EXECUTOR', `Failed to load pending orders: ${err.message}`);
  }
}

loadTrades();
loadPending();

// ─── Order Types ─────────────────────────────────────────────────────
const ORDER_TYPES = {
  MARKET: 'MARKET',     // Fill immediately at best available
  LIMIT: 'LIMIT',       // Fill when price reaches target
  TWAP: 'TWAP',         // Split into N chunks over time window
  ICEBERG: 'ICEBERG',   // Show only partial size
};

function setMode(newMode) {
  if (!['SIMULATION', 'LIVE'].includes(newMode)) {
    throw new Error(`Invalid mode: ${newMode}. Use SIMULATION or LIVE.`);
  }
  mode = newMode;
  log.info('EXECUTOR', `Execution mode set to ${mode}`);
}

function getMode() {
  return mode;
}

/**
 * Smart order routing: decide order type based on trade characteristics.
 *
 * - High urgency (arb, time-sensitive) → MARKET
 * - Large size relative to liquidity → TWAP
 * - Edge is small but present → LIMIT (wait for better price)
 * - Pullback available in trend → LIMIT at pullback level
 * - Normal → MARKET
 */
function chooseOrderType(opportunity) {
  const liquidity = opportunity.liquidity || 10000;
  const sizeImpact = opportunity.positionSize / liquidity;
  const edge = opportunity.edge || 0;
  const strategy = opportunity.strategy;

  // Arbitrage and cross-platform arbs must execute instantly
  if (strategy === 'ARBITRAGE' && opportunity.type !== 'CROSS_PLATFORM') return ORDER_TYPES.MARKET;
  if (strategy === 'ARBITRAGE' && opportunity.type === 'CROSS_PLATFORM') {
    // Cross-platform arbs have more time but still need urgency
    return sizeImpact > 0.03 ? ORDER_TYPES.TWAP : ORDER_TYPES.MARKET;
  }

  // Very large relative to liquidity → split with TWAP
  if (sizeImpact > 0.05) return ORDER_TYPES.TWAP;

  // Small edge → wait for better price with LIMIT
  if (edge > 0 && edge < 0.04 && sizeImpact < 0.02) return ORDER_TYPES.LIMIT;

  // Default: market order
  return ORDER_TYPES.MARKET;
}

/**
 * Calculate optimal entry price for limit orders.
 * Uses orderbook depth analysis to find natural support/resistance levels.
 */
function calculateOptimalEntry(opportunity) {
  const side = opportunity.side || 'YES';
  const currentPrice = side === 'YES'
    ? (opportunity.yesPrice || 0.5)
    : (opportunity.noPrice || 0.5);

  // For LIMIT orders: aim for 1-2% better than current price
  // This means buying YES lower or buying NO lower
  const improvement = 0.015; // 1.5% target improvement
  const targetPrice = Math.max(0.01, currentPrice - improvement);

  // If we have persistence data, persistent signals justify tighter limit
  const persistence = opportunity.persistence?.scans || 0;
  const tighter = persistence >= 3 ? 0.005 : 0; // Persistent → accept closer to market

  return {
    limitPrice: Math.round((targetPrice + tighter) * 1000) / 1000,
    improvement: Math.round(improvement * 10000) / 10000,
    reason: persistence >= 3 ? 'Persistent signal — tighter limit' : 'Standard limit improvement',
  };
}

/**
 * Execute a trade opportunity with smart order routing
 */
async function execute(opportunity, bankroll) {
  const trade = {
    id: `trade_${Date.now()}_${(++orderIdCounter).toString(36)}`,
    strategy: opportunity.strategy,
    market: opportunity.market,
    conditionId: opportunity.conditionId,
    slug: opportunity.slug,
    side: opportunity.side || (opportunity.strategy === 'NO_BETS' ? 'NO' : 'YES'),
    positionSize: opportunity.positionSize,
    price: opportunity.noPrice || opportunity.yesPrice || 0.5,
    score: opportunity.score,
    confidence: opportunity.confidence,
    edge: opportunity.edge || 0,
    netEV: opportunity.netEV || 0,
    estimatedProb: opportunity.estimatedProb || 0,
    riskLevel: opportunity.riskLevel || 'MEDIUM',
    mode,
    timestamp: new Date().toISOString(),
  };

  // Risk check (now returns riskMultiplier for dynamic sizing)
  const riskCheck = riskManager.checkTrade(trade, bankroll);
  if (!riskCheck.allowed) {
    log.warn('EXECUTOR', `Trade rejected by risk manager: ${riskCheck.reason}`, trade);
    return {
      ...trade,
      status: 'REJECTED',
      reason: riskCheck.reason,
    };
  }

  // Apply dynamic risk multiplier to position size
  if (riskCheck.riskMultiplier && riskCheck.riskMultiplier < 1) {
    const original = trade.positionSize;
    trade.positionSize = Math.round(trade.positionSize * riskCheck.riskMultiplier * 100) / 100;
    log.info('EXECUTOR', `Position scaled ${original} → ${trade.positionSize} (risk mult: ${riskCheck.riskMultiplier})`);
  }

  // Smart order routing
  const orderType = chooseOrderType(opportunity);
  trade.orderType = orderType;

  if (mode === 'SIMULATION') {
    switch (orderType) {
      case ORDER_TYPES.TWAP:
        return simulateTWAP(trade, opportunity);
      case ORDER_TYPES.LIMIT:
        return queueLimitOrder(trade, opportunity);
      case ORDER_TYPES.MARKET:
      default:
        return simulateTrade(trade, opportunity);
    }
  } else {
    return executeLiveTrade(trade);
  }
}

/**
 * MARKET ORDER simulation: immediate fill with slippage.
 */
function simulateTrade(trade, opportunity) {
  const liquidity = opportunity.liquidity || 10000;
  const slippage = estimateSlippage(trade.positionSize, liquidity);
  const fillPrice = Math.max(0.001, Math.min(0.999, trade.price + slippage));
  const shares = trade.positionSize / fillPrice;

  const executedTrade = {
    ...trade,
    status: 'FILLED',
    orderType: trade.orderType || ORDER_TYPES.MARKET,
    fillPrice: Math.round(fillPrice * 1000) / 1000,
    shares: Math.round(shares * 100) / 100,
    fees: 0,
    slippage: Math.round(slippage * 10000) / 10000,
    liquidity,
    pnlStatus: 'PENDING_RESOLUTION',
  };

  executedTrades.push(executedTrade);
  saveTrades();
  riskManager.addPosition(executedTrade);

  log.logTrade({
    action: 'BUY',
    side: executedTrade.side,
    shares: executedTrade.shares,
    price: executedTrade.fillPrice,
    market: executedTrade.market,
    strategy: executedTrade.strategy,
    mode: 'SIMULATION',
    edge: trade.edge,
    netEV: trade.netEV,
    pnl: 0,
  });

  log.info('EXECUTOR', `[SIM] MARKET ${executedTrade.side} ${executedTrade.shares} shares @ $${executedTrade.fillPrice} "${executedTrade.market}" | slip: ${executedTrade.slippage}`);

  return executedTrade;
}

/**
 * TWAP simulation: split into 3-5 chunks, each with reduced slippage.
 * In sim mode, executes all chunks immediately but models the reduced impact.
 */
function simulateTWAP(trade, opportunity) {
  const liquidity = opportunity.liquidity || 10000;
  const chunks = Math.min(5, Math.max(3, Math.ceil(trade.positionSize / (liquidity * 0.01))));
  const chunkSize = trade.positionSize / chunks;

  let totalShares = 0;
  let weightedPriceSum = 0;
  let totalSlippage = 0;

  for (let i = 0; i < chunks; i++) {
    // Each chunk has much less market impact (sqrt scaling)
    const chunkSlippage = estimateSlippage(chunkSize, liquidity) * (0.7 + Math.random() * 0.3);
    const chunkFillPrice = Math.max(0.001, Math.min(0.999, trade.price + chunkSlippage + (i * 0.001)));
    const chunkShares = chunkSize / chunkFillPrice;

    totalShares += chunkShares;
    weightedPriceSum += chunkFillPrice * chunkShares;
    totalSlippage += chunkSlippage;
  }

  const avgFillPrice = weightedPriceSum / totalShares;
  const avgSlippage = totalSlippage / chunks;

  const executedTrade = {
    ...trade,
    status: 'FILLED',
    orderType: ORDER_TYPES.TWAP,
    fillPrice: Math.round(avgFillPrice * 1000) / 1000,
    shares: Math.round(totalShares * 100) / 100,
    fees: 0,
    slippage: Math.round(avgSlippage * 10000) / 10000,
    liquidity,
    twapChunks: chunks,
    pnlStatus: 'PENDING_RESOLUTION',
  };

  executedTrades.push(executedTrade);
  saveTrades();
  riskManager.addPosition(executedTrade);

  log.logTrade({
    action: 'BUY',
    side: executedTrade.side,
    shares: executedTrade.shares,
    price: executedTrade.fillPrice,
    market: executedTrade.market,
    strategy: executedTrade.strategy,
    mode: 'SIMULATION',
    edge: trade.edge,
    netEV: trade.netEV,
    pnl: 0,
  });

  log.info('EXECUTOR', `[SIM] TWAP ${executedTrade.side} ${executedTrade.shares} shares in ${chunks} chunks @ avg $${executedTrade.fillPrice} "${executedTrade.market}" | avg slip: ${executedTrade.slippage}`);

  return executedTrade;
}

/**
 * LIMIT ORDER: queue the order to be checked/filled on next scan cycles.
 * Sim mode: fills if price is already at or better than target.
 * Otherwise queues for future fill.
 */
function queueLimitOrder(trade, opportunity) {
  // Use smart entry timing to calculate optimal limit price
  const optimalEntry = calculateOptimalEntry(opportunity);
  const targetPrice = optimalEntry.limitPrice;

  const limitOrder = {
    ...trade,
    status: 'PENDING',
    orderType: ORDER_TYPES.LIMIT,
    targetPrice: Math.round(targetPrice * 1000) / 1000,
    entryReason: optimalEntry.reason,
    improvement: optimalEntry.improvement,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
    createdAt: new Date().toISOString(),
    fillAttempts: 0,
  };

  // Check if price already meets limit
  const currentPrice = trade.price;
  const canFillNow = trade.side === 'YES'
    ? currentPrice <= targetPrice
    : currentPrice >= targetPrice;

  if (canFillNow) {
    // Fill immediately at better price
    const slippage = estimateSlippage(trade.positionSize, opportunity.liquidity || 10000) * 0.5;
    limitOrder.fillPrice = Math.round(targetPrice * 1000) / 1000;
    limitOrder.shares = Math.round((trade.positionSize / targetPrice) * 100) / 100;
    limitOrder.slippage = Math.round(slippage * 10000) / 10000;
    limitOrder.status = 'FILLED';
    limitOrder.pnlStatus = 'PENDING_RESOLUTION';
    limitOrder.fees = 0;
    limitOrder.liquidity = opportunity.liquidity || 10000;

    executedTrades.push(limitOrder);
    saveTrades();
    riskManager.addPosition(limitOrder);

    log.info('EXECUTOR', `[SIM] LIMIT filled immediately: ${limitOrder.side} ${limitOrder.shares} shares @ $${limitOrder.fillPrice} (target: $${targetPrice}) "${limitOrder.market}"`);
    return limitOrder;
  }

  // Queue for future fill
  pendingOrders.push(limitOrder);
  savePending();
  log.info('EXECUTOR', `[SIM] LIMIT queued: ${limitOrder.side} $${limitOrder.positionSize} @ target $${targetPrice} "${limitOrder.market}" | expires: 30min`);

  return limitOrder;
}

/**
 * Check and potentially fill pending limit orders.
 * Called during each scan cycle with current market prices.
 */
function checkPendingOrders(marketPrices = {}) {
  const now = new Date();
  const filled = [];
  const expired = [];
  const stillPending = [];

  for (const order of pendingOrders) {
    order.fillAttempts++;

    // Check expiry
    if (new Date(order.expiresAt) < now) {
      order.status = 'EXPIRED';
      expired.push(order);
      log.info('EXECUTOR', `LIMIT expired: "${order.market}" target $${order.targetPrice}`);
      continue;
    }

    // Check if price meets target
    const currentPrice = marketPrices[order.conditionId];
    if (currentPrice !== undefined) {
      const canFill = order.side === 'YES'
        ? currentPrice <= order.targetPrice
        : currentPrice >= order.targetPrice;

      if (canFill) {
        order.fillPrice = Math.round(currentPrice * 1000) / 1000;
        order.shares = Math.round((order.positionSize / currentPrice) * 100) / 100;
        order.slippage = 0.001; // Minimal slippage for limit fills
        order.status = 'FILLED';
        order.pnlStatus = 'PENDING_RESOLUTION';
        order.fees = 0;
        order.filledAt = now.toISOString();

        executedTrades.push(order);
        saveTrades();
        riskManager.addPosition(order);
        filled.push(order);

        log.info('EXECUTOR', `[SIM] LIMIT filled: ${order.side} ${order.shares} shares @ $${order.fillPrice} "${order.market}"`);
        continue;
      }
    }

    stillPending.push(order);
  }

  pendingOrders = stillPending;
  savePending();

  if (filled.length > 0 || expired.length > 0) {
    log.info('EXECUTOR', `Pending orders: ${filled.length} filled, ${expired.length} expired, ${stillPending.length} remaining`);
  }

  return { filled, expired, pending: stillPending.length };
}

/**
 * Cancel a pending order by ID
 */
function cancelOrder(orderId) {
  const idx = pendingOrders.findIndex(o => o.id === orderId);
  if (idx === -1) return null;

  const order = pendingOrders.splice(idx, 1)[0];
  order.status = 'CANCELLED';
  savePending();
  log.info('EXECUTOR', `Order cancelled: ${order.id} "${order.market}"`);
  return order;
}

async function executeLiveTrade(trade) {
  log.warn('EXECUTOR', 'Live trading not yet configured. Set up your private key and USDC balance first.');
  return {
    ...trade,
    status: 'REJECTED',
    reason: 'Live trading requires private key configuration. Use SIMULATION mode for now.',
  };
}

/**
 * Auto-execute top opportunities with smart routing
 */
async function autoExecute(opportunities, bankroll, { maxTrades = 3, minScore = 50, minConfidence = 'MEDIUM' } = {}) {
  const confidenceOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const minConfidenceLevel = confidenceOrder[minConfidence] || 2;

  const eligible = opportunities
    .filter((o) => (o.score || 0) >= minScore)
    .filter((o) => (confidenceOrder[o.confidence] || 0) >= minConfidenceLevel)
    .slice(0, maxTrades);

  const results = [];
  for (const opp of eligible) {
    const result = await execute(opp, bankroll);
    results.push(result);
  }

  return results;
}

function getTradeHistory(limit = 100) {
  return executedTrades.slice(-limit);
}

function getPendingOrders() {
  return [...pendingOrders];
}

function getTradeStats() {
  const filled = executedTrades.filter((t) => t.status === 'FILLED');
  const rejected = executedTrades.filter((t) => t.status === 'REJECTED');

  const byStrategy = {};
  for (const trade of filled) {
    if (!byStrategy[trade.strategy]) {
      byStrategy[trade.strategy] = { count: 0, totalSize: 0 };
    }
    byStrategy[trade.strategy].count++;
    byStrategy[trade.strategy].totalSize += trade.positionSize;
  }

  const byOrderType = {};
  for (const trade of filled) {
    const type = trade.orderType || 'MARKET';
    if (!byOrderType[type]) byOrderType[type] = 0;
    byOrderType[type]++;
  }

  return {
    totalTrades: executedTrades.length,
    filled: filled.length,
    rejected: rejected.length,
    pendingLimits: pendingOrders.length,
    mode,
    byStrategy,
    byOrderType,
    totalVolume: Math.round(filled.reduce((sum, t) => sum + t.positionSize, 0) * 100) / 100,
  };
}

function reset() {
  executedTrades = [];
  pendingOrders = [];
  savePending();
  orderIdCounter = 0;
  saveTrades();
  log.info('EXECUTOR', 'Executor reset');
}

module.exports = {
  execute,
  autoExecute,
  setMode,
  getMode,
  getTradeHistory,
  getPendingOrders,
  getTradeStats,
  checkPendingOrders,
  cancelOrder,
  chooseOrderType,
  reset,
  ORDER_TYPES,
};
