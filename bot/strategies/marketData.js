/**
 * Platform-Aware Market Data Helper
 *
 * Routes orderbook, price-history, and WebSocket calls to the correct
 * client based on market.platform ('KALSHI' vs 'POLYMARKET'/default).
 *
 * This allows strategies to work with both Polymarket and Kalshi markets
 * without platform-specific logic in each strategy file.
 */

const polyClient = require('../polymarket/client');
const kalshiClient = require('../kalshi/client');
const wsClient = require('../polymarket/websocket');
const log = require('../utils/logger');

/**
 * Extract the real Kalshi ticker from a pseudo token ID.
 * Kalshi normalized markets use `kalshi:TICKER:yes` / `kalshi:TICKER:no`.
 */
function kalshiTicker(market) {
  return market.kalshi?.ticker || market.conditionId || market.slug;
}

/**
 * Determine if a market is from Kalshi.
 */
function isKalshi(market) {
  return market.platform === 'KALSHI';
}

// ─── Orderbook ───────────────────────────────────────────────────────

/**
 * Get the YES-side orderbook for a market (platform-aware).
 * Returns Polymarket-compatible format { bids, asks, ... } or null.
 */
async function getOrderbook(market) {
  try {
    if (isKalshi(market)) {
      return await kalshiClient.getOrderbook(kalshiTicker(market));
    }
    if (!market.yesTokenId) return null;
    return await polyClient.getOrderbook(market.yesTokenId);
  } catch {
    return null;
  }
}

/**
 * Get the NO-side orderbook for a market (platform-aware).
 * Kalshi returns both sides in one call, so we invert.
 */
async function getNoOrderbook(market) {
  try {
    if (isKalshi(market)) {
      // Kalshi orderbook already includes NO side; return it inverted
      const ob = await kalshiClient.getOrderbook(kalshiTicker(market));
      if (!ob) return null;
      // Swap bids/asks perspective for NO side
      return {
        bids: ob.asks ? ob.asks.map(a => ({
          price: (1 - parseFloat(a.price)).toFixed(4),
          size: a.size,
        })) : [],
        asks: ob.bids ? ob.bids.map(b => ({
          price: (1 - parseFloat(b.price)).toFixed(4),
          size: b.size,
        })) : [],
      };
    }
    if (!market.noTokenId) return null;
    return await polyClient.getOrderbook(market.noTokenId);
  } catch {
    return null;
  }
}

// ─── Price History ───────────────────────────────────────────────────

/**
 * Get price history for a market (platform-aware).
 * Returns array of { t: timestamp, p: price } compatible with
 * what Polymarket's getPriceHistory returns.
 *
 * For Kalshi, converts recent trades into price-history points.
 */
async function getPriceHistory(market, fidelity = 'max', count = 50) {
  try {
    if (isKalshi(market)) {
      return await getKalshiPriceHistory(market, count);
    }
    if (!market.yesTokenId) return [];
    return await polyClient.getPriceHistory(market.yesTokenId, fidelity, count);
  } catch {
    return [];
  }
}

/**
 * Convert Kalshi trades into price history points.
 * Kalshi trades have: { ticker, yes_price, no_price, count, created_time, ... }
 */
async function getKalshiPriceHistory(market, count) {
  try {
    const result = await kalshiClient.getTrades(kalshiTicker(market), { limit: count });
    const trades = result.trades || [];

    if (trades.length === 0) return [];

    // Convert to the { t, p } format used by Polymarket price history
    return trades
      .map(trade => ({
        t: new Date(trade.created_time).getTime() / 1000, // Unix seconds
        p: trade.yes_price != null ? trade.yes_price / 100 : null,
      }))
      .filter(pt => pt.p != null && pt.p > 0)
      .reverse(); // Oldest first, like Polymarket history
  } catch {
    return [];
  }
}

// ─── WebSocket ───────────────────────────────────────────────────────

/**
 * Check if fresh WebSocket data is available (Polymarket only).
 * Kalshi doesn't have WebSocket support in this client.
 */
function hasFreshWsData(market) {
  if (isKalshi(market)) return false;
  return market.yesTokenId ? wsClient.hasFreshData(market.yesTokenId) : false;
}

/**
 * Get WebSocket orderbook (Polymarket only).
 */
function getWsOrderbook(market) {
  if (isKalshi(market)) return null;
  return market.yesTokenId ? wsClient.getOrderbook(market.yesTokenId) : null;
}

module.exports = {
  isKalshi,
  kalshiTicker,
  getOrderbook,
  getNoOrderbook,
  getPriceHistory,
  hasFreshWsData,
  getWsOrderbook,
};
