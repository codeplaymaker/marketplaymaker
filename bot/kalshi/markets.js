const kalshiClient = require('./client');
const log = require('../utils/logger');
const config = require('../config');

let cachedMarkets = [];
let lastRefresh = 0;

/**
 * Kalshi Market Cache — mirrors the Polymarket markets module.
 * Keeps a local snapshot of active Kalshi markets,
 * normalized to the same shape used throughout the bot.
 */
async function refreshMarkets() {
  try {
    const now = Date.now();
    const refreshMs = config.kalshi?.marketRefreshMs || config.scanner.marketRefreshMs || 30000;

    if (now - lastRefresh < refreshMs && cachedMarkets.length > 0) {
      return cachedMarkets;
    }

    log.info('KALSHI_MARKETS', 'Refreshing Kalshi market cache...');

    const maxMarkets = config.kalshi?.maxMarkets || 300;
    const rawMarkets = await kalshiClient.getAllOpenMarkets(maxMarkets);

    cachedMarkets = rawMarkets
      .map((km) => {
        try {
          return kalshiClient.normalizeMarket(km);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      // Filter: must be open
      .filter((m) => m.active && !m.closed)
      // Filter: must have some pricing signal (bid, ask, volume, or last trade)
      .filter((m) => {
        const hasPrice = m.yesPrice > 0.01 && m.yesPrice < 0.99;
        const hasVolume = m.volume24hr > 0 || m.volumeNum > 0;
        const hasLastPrice = m.kalshi?.lastPrice > 0.01 && m.kalshi?.lastPrice < 0.99;
        return hasPrice || hasVolume || hasLastPrice;
      })
      // Filter: not yet expired
      .filter((m) => {
        if (!m.endDate) return true;
        return new Date(m.endDate).getTime() > Date.now();
      });

    lastRefresh = now;
    log.info('KALSHI_MARKETS', `Cached ${cachedMarkets.length} active Kalshi markets`);
    return cachedMarkets;
  } catch (err) {
    log.error('KALSHI_MARKETS', `Failed to refresh Kalshi markets: ${err.message}`);
    return cachedMarkets; // Return stale data
  }
}

function getCachedMarkets() {
  return cachedMarkets;
}

function getMarketByTicker(ticker) {
  return cachedMarkets.find((m) => m.conditionId === ticker || m.slug === ticker) || null;
}

function getMarketsByCategory(category) {
  return cachedMarkets.filter((m) =>
    m.category?.toLowerCase().includes(category.toLowerCase()) ||
    m.kalshi?.eventTicker?.toLowerCase().includes(category.toLowerCase())
  );
}

function getTopMarketsByVolume(n = 20) {
  return [...cachedMarkets].sort((a, b) => b.volume24hr - a.volume24hr).slice(0, n);
}

function getTopMarketsByLiquidity(n = 20) {
  return [...cachedMarkets].sort((a, b) => b.liquidity - a.liquidity).slice(0, n);
}

module.exports = {
  refreshMarkets,
  getCachedMarkets,
  getMarketByTicker,
  getMarketsByCategory,
  getTopMarketsByVolume,
  getTopMarketsByLiquidity,
};
