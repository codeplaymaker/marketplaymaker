/**
 * MetaAPI Executor — Connects to IC Markets MT4 via MetaAPI
 * Handles: order execution, position management, partial close, trailing stop
 */
const config = require('./config');
const adaptive = require('./adaptiveLearner');
const sessions = require('./sessions');
const log = require('../utils/logger');

let metaApi = null;
let connection = null;
let account = null;
let connected = false;

// Open trade state
let openTrade = null;
let tp1Hit = false;
let dailyTrades = 0;
let lastTradeDay = -1;

/**
 * Initialize MetaAPI connection
 */
async function init() {
  try {
    const MetaApi = require('metaapi.cloud-sdk').default;
    metaApi = new MetaApi(config.metaApi.token);
    account = await metaApi.metatraderAccountApi.getAccount(config.metaApi.accountId);

    // Wait for deployment and connection
    if (account.state !== 'DEPLOYED') {
      log.info('[ICT Executor] Deploying MetaAPI account...');
      await account.deploy();
    }
    if (account.connectionStatus !== 'CONNECTED') {
      log.info('[ICT Executor] Waiting for MT4 connection...');
      await account.waitConnected();
    }

    connection = account.getRPCConnection();
    await connection.connect();
    await connection.waitSynchronized();

    connected = true;
    log.info('[ICT Executor] Connected to MT4 via MetaAPI ✓');

    return true;
  } catch (e) {
    log.error('[ICT Executor] MetaAPI init failed:', e.message);
    return false;
  }
}

/**
 * Get historical candles
 */
async function getCandles(symbol, timeframe, count) {
  if (!connected) return [];
  try {
    const candles = await account.getHistoricalCandles(symbol, timeframe, undefined, count);
    return candles.map(c => ({
      time: new Date(c.time).getTime(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.tickVolume || 0,
    }));
  } catch (e) {
    log.error('[ICT Executor] Failed to get candles:', e.message);
    return [];
  }
}

/**
 * Get account info
 */
async function getAccountInfo() {
  if (!connected) return null;
  try {
    return await connection.getAccountInformation();
  } catch (e) {
    log.error('[ICT Executor] Failed to get account info:', e.message);
    return null;
  }
}

/**
 * Get current spread in pips
 */
async function getSpread() {
  if (!connected) return 999;
  try {
    const price = await connection.getSymbolPrice(config.symbol);
    return price ? (price.ask - price.bid) * 10 : 999;  // Gold: 1 pip = 0.1
  } catch (e) {
    return 999;
  }
}

/**
 * Get open positions for our symbol
 */
async function getPositions() {
  if (!connected) return [];
  try {
    const positions = await connection.getPositions();
    return positions.filter(p => p.symbol === config.symbol);
  } catch (e) {
    log.error('[ICT Executor] Failed to get positions:', e.message);
    return [];
  }
}

/**
 * Calculate lot size based on risk
 */
async function calcLotSize(entryPrice, sl) {
  const acctInfo = await getAccountInfo();
  if (!acctInfo) return 0;

  const riskAmount = acctInfo.balance * (config.riskPercent / 100);
  const slDistance = Math.abs(entryPrice - sl);
  if (slDistance <= 0) return 0;

  // XAUUSD: 1 lot = 100 oz, pip value depends on contract size
  // Approximate: on most brokers, 0.01 lot, 1 pip (0.1 on gold) = ~$0.10
  // We'll use the contract spec from MetaAPI
  try {
    const spec = await connection.getSymbolSpecification(config.symbol);
    const tickValue = spec.tickValue || 1;
    const tickSize = spec.tickSize || 0.01;
    const slTicks = slDistance / tickSize;
    let lots = riskAmount / (slTicks * tickValue);

    // Adaptive reduction
    lots *= adaptive.getLotMultiplier();

    // Clamp
    const minLot = spec.minVolume || 0.01;
    const maxLot = spec.maxVolume || 100;
    const lotStep = spec.volumeStep || 0.01;

    lots = Math.max(lots, minLot);
    lots = Math.min(lots, maxLot);
    lots = Math.floor(lots / lotStep) * lotStep;
    lots = parseFloat(lots.toFixed(2));

    return lots;
  } catch (e) {
    log.error('[ICT Executor] Failed to calc lot size:', e.message);
    // Fallback: use minimum lot
    return 0.01;
  }
}

/**
 * Execute a trade
 */
async function executeTrade(signal) {
  if (!connected) return null;

  // Check daily limit
  const today = new Date().getDate();
  if (today !== lastTradeDay) {
    dailyTrades = 0;
    lastTradeDay = today;
  }
  if (dailyTrades >= config.maxDailyTrades) {
    log.info('[ICT Executor] Daily trade limit reached');
    return null;
  }

  // Check spread
  const spread = await getSpread();
  if (spread > config.maxSpreadPips) {
    log.info(`[ICT Executor] Spread too wide: ${spread.toFixed(1)} pips`);
    return null;
  }

  // Check if already in a position
  const positions = await getPositions();
  if (positions.length > 0) {
    log.info('[ICT Executor] Already have open position');
    return null;
  }

  // Adaptive: skip if entry type is underperforming
  if (adaptive.shouldSkipEntry(signal.entryType)) {
    log.info(`[ICT Executor] Skipping ${signal.entryType} — adaptive disabled`);
    return null;
  }

  // Calculate lot size
  const lots = await calcLotSize(signal.entryPrice, signal.sl);
  if (lots <= 0) return null;

  try {
    const comment = `ICT|${signal.entryType}|C${signal.confluence}`;
    let result;

    if (signal.direction === 'buy') {
      result = await connection.createMarketBuyOrder(
        config.symbol, lots, signal.sl, signal.tp1,
        { comment, clientId: `ict_${Date.now()}` }
      );
    } else {
      result = await connection.createMarketSellOrder(
        config.symbol, lots, signal.sl, signal.tp1,
        { comment, clientId: `ict_${Date.now()}` }
      );
    }

    if (result && result.orderId) {
      openTrade = {
        orderId: result.orderId,
        positionId: result.positionId,
        direction: signal.direction,
        entryType: signal.entryType,
        confluence: signal.confluence,
        session: sessions.getCurrentSession(),
        entryPrice: signal.entryPrice,
        sl: signal.sl,
        tp1: signal.tp1,
        tp2: signal.tp2,
        lots,
        openTime: Date.now(),
        atr14: signal.atr14,
      };
      tp1Hit = false;
      dailyTrades++;

      log.info(`[ICT Executor] TRADE OPENED: ${signal.direction.toUpperCase()} ${lots} lots @ ${signal.entryPrice.toFixed(2)} | SL: ${signal.sl.toFixed(2)} | TP1: ${signal.tp1.toFixed(2)} | TP2: ${signal.tp2.toFixed(2)} | ${signal.entryType} | Conf: ${signal.confluence}`);

      return openTrade;
    }
  } catch (e) {
    log.error('[ICT Executor] Order failed:', e.message);
  }

  return null;
}

/**
 * Manage open position — partial close at TP1, SL to BE, trailing
 */
async function managePosition() {
  if (!connected || !openTrade) return;

  try {
    const positions = await getPositions();
    if (positions.length === 0) {
      // Position was closed (SL or TP hit)
      await recordClosedTrade();
      openTrade = null;
      return;
    }

    const pos = positions[0];
    const price = await connection.getSymbolPrice(config.symbol);
    if (!price) return;

    const curPrice = openTrade.direction === 'buy' ? price.bid : price.ask;

    // Check TP1 hit
    if (!tp1Hit) {
      const tp1Reached = openTrade.direction === 'buy'
        ? curPrice >= openTrade.tp1
        : curPrice <= openTrade.tp1;

      if (tp1Reached) {
        // Partial close
        const closeQty = parseFloat((openTrade.lots * (config.tp1ClosePct / 100)).toFixed(2));
        const minLot = 0.01;

        if (closeQty >= minLot) {
          try {
            await connection.closePositionPartially(pos.id, closeQty);
            log.info(`[ICT Executor] TP1 HIT: Closed ${closeQty} lots at ${curPrice.toFixed(2)}`);
          } catch (e) {
            log.error('[ICT Executor] Partial close failed:', e.message);
          }
        }

        // Move SL to breakeven
        if (config.moveSLtoBE) {
          try {
            await connection.modifyPosition(pos.id, openTrade.entryPrice, openTrade.tp2);
            openTrade.sl = openTrade.entryPrice;
            log.info(`[ICT Executor] SL moved to breakeven: ${openTrade.entryPrice.toFixed(2)}`);
          } catch (e) {
            log.error('[ICT Executor] BE modify failed:', e.message);
          }
        }

        tp1Hit = true;
      }
    }

    // Trailing stop after TP1
    if (tp1Hit && config.useTrailing) {
      const trailDist = openTrade.atr14 * config.trailATR;
      let newSL;

      if (openTrade.direction === 'buy') {
        newSL = parseFloat((curPrice - trailDist).toFixed(2));
        if (newSL > (pos.stopLoss || 0) && newSL > openTrade.entryPrice) {
          await connection.modifyPosition(pos.id, newSL, pos.takeProfit);
        }
      } else {
        newSL = parseFloat((curPrice + trailDist).toFixed(2));
        if (newSL < (pos.stopLoss || 999999) && newSL < openTrade.entryPrice) {
          await connection.modifyPosition(pos.id, newSL, pos.takeProfit);
        }
      }
    }
  } catch (e) {
    log.error('[ICT Executor] Position management error:', e.message);
  }
}

/**
 * Record closed trade result to adaptive learner
 */
async function recordClosedTrade() {
  if (!openTrade) return;

  try {
    // Get trade history to find the closed trade
    const history = await connection.getHistoryOrdersByPosition(openTrade.positionId);
    let profit = 0;

    if (history && history.length > 0) {
      // Sum up profit from all orders in this position
      for (const order of history) {
        if (order.profit !== undefined) profit += order.profit;
        if (order.swap !== undefined) profit += order.swap;
        if (order.commission !== undefined) profit += order.commission;
      }
    }

    const isWin = profit > 0;

    adaptive.recordTrade({
      entryType: openTrade.entryType,
      session: openTrade.session,
      profit,
      isWin,
      direction: openTrade.direction,
      confluence: openTrade.confluence,
      entryPrice: openTrade.entryPrice,
      lots: openTrade.lots,
      duration: Date.now() - openTrade.openTime,
    });

    log.info(`[ICT Executor] TRADE CLOSED: ${isWin ? 'WIN' : 'LOSS'} | P/L: $${profit.toFixed(2)} | ${openTrade.entryType}`);

    return { profit, isWin };
  } catch (e) {
    log.error('[ICT Executor] Failed to record trade:', e.message);
    // Still record with estimated profit
    adaptive.recordTrade({
      entryType: openTrade.entryType,
      session: openTrade.session,
      profit: 0,
      isWin: false,
      direction: openTrade.direction,
      confluence: openTrade.confluence,
      entryPrice: openTrade.entryPrice,
      lots: openTrade.lots,
      duration: Date.now() - openTrade.openTime,
    });
  }
}

/**
 * Close all positions (for lunch close, etc.)
 */
async function closeAllPositions(reason) {
  if (!connected) return;
  try {
    const positions = await getPositions();
    for (const pos of positions) {
      await connection.closePosition(pos.id);
      log.info(`[ICT Executor] Closed position: ${reason}`);
    }
    if (openTrade) {
      await recordClosedTrade();
      openTrade = null;
    }
  } catch (e) {
    log.error('[ICT Executor] Close all failed:', e.message);
  }
}

function getOpenTrade() { return openTrade; }
function getDailyTrades() { return dailyTrades; }
function isConnected() { return connected; }

module.exports = {
  init,
  getCandles,
  getAccountInfo,
  getSpread,
  getPositions,
  executeTrade,
  managePosition,
  closeAllPositions,
  getOpenTrade,
  getDailyTrades,
  isConnected,
};
