const client = require('../polymarket/client');
const log = require('../utils/logger');
const config = require('../config');

let cachedMarkets = [];
let lastRefresh = 0;

/**
 * Parse a specific event date from a market question.
 * Matches patterns like:
 *   "on February 9, 2026"  "on February 9?"  "by February 10, 2026"
 *   "on 2026-02-10"  "February 10, 2026"  "on Feb 9"
 * Returns a Date object or null if no date found.
 */
const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseEventDate(question) {
  if (!question) return null;
  const q = question.toLowerCase();
  const currentYear = new Date().getFullYear();

  // Pattern 1: "on/by Month Day, Year" or "on/by Month Day?"
  const match1 = q.match(/(?:on|by)\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:,?\s*(\d{4}))?/);
  if (match1) {
    const month = MONTHS[match1[1]];
    const day = parseInt(match1[2]);
    const year = match1[3] ? parseInt(match1[3]) : currentYear;
    return new Date(year, month, day, 23, 59, 59);
  }

  // Pattern 2: "Month Day, Year" at end of question (e.g. "...February 10, 2026?")
  const match2 = q.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s*(\d{4})/);
  if (match2) {
    const month = MONTHS[match2[1]];
    const day = parseInt(match2[2]);
    const year = parseInt(match2[3]);
    return new Date(year, month, day, 23, 59, 59);
  }

  // Pattern 3: ISO date "2026-02-10" in question
  const match3 = q.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match3) {
    return new Date(parseInt(match3[1]), parseInt(match3[2]) - 1, parseInt(match3[3]), 23, 59, 59);
  }

  return null;
}

/**
 * Market Cache — keeps a local snapshot of active markets
 * refreshed every `config.scanner.marketRefreshMs`
 */
async function refreshMarkets() {
  try {
    const now = Date.now();
    if (now - lastRefresh < config.scanner.marketRefreshMs && cachedMarkets.length > 0) {
      return cachedMarkets;
    }

    log.info('MARKETS', 'Refreshing market cache...');
    const markets = await client.getAllActiveMarkets(500);

    // Parse and normalize
    cachedMarkets = markets
      .filter((m) => m.clobTokenIds && m.outcomePrices)
      .map((m) => {
        try {
          const outcomePrices = JSON.parse(m.outcomePrices);
          const clobTokenIds = JSON.parse(m.clobTokenIds);
          const outcomes = m.outcomes ? JSON.parse(m.outcomes) : ['Yes', 'No'];

          return {
            conditionId: m.conditionId,
            question: m.question,
            slug: m.slug,
            groupSlug: m.groupSlug || (Array.isArray(m.events) && m.events[0]?.slug) || null,
            negRisk: m.negRisk || false,
            groupItemTitle: m.groupItemTitle || null,
            yesPrice: parseFloat(outcomePrices[0] || 0.5),
            noPrice: parseFloat(outcomePrices[1] || 0.5),
            yesTokenId: clobTokenIds[0],
            noTokenId: clobTokenIds[1],
            outcomes,
            volume24hr: parseFloat(m.volume24hr || 0),
            volumeNum: parseFloat(m.volumeNum || 0),
            liquidity: parseFloat(m.liquidity || 0),
            bestBid: m.bestBid ? parseFloat(m.bestBid) : null,
            bestAsk: m.bestAsk ? parseFloat(m.bestAsk) : null,
            spread: m.spread ? parseFloat(m.spread) : null,
            endDate: m.endDate,
            category: m.category || 'unknown',
            active: m.active,
            closed: m.closed,
            raw: m,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      // Filter out expired markets (endDate in the past)
      .filter((m) => {
        if (!m.endDate) return true;
        return new Date(m.endDate).getTime() > Date.now();
      })
      // Filter out closed / not accepting orders
      .filter((m) => {
        if (m.closed === true) return false;
        if (m.raw?.acceptingOrders === false) return false;
        return true;
      })
      // Filter out effectively resolved markets (99%+ on either side — no edge left)
      .filter((m) => {
        return m.yesPrice > 0.01 && m.yesPrice < 0.99;
      })
      // Filter out markets whose event date (parsed from question) is in the past
      .filter((m) => {
        const eventDate = parseEventDate(m.question);
        if (!eventDate) return true; // Can't parse = keep
        // Add 24h buffer for resolution lag
        return eventDate.getTime() + 86400000 > Date.now();
      });

    lastRefresh = now;
    log.info('MARKETS', `Cached ${cachedMarkets.length} active markets`);
    return cachedMarkets;
  } catch (err) {
    log.error('MARKETS', 'Failed to refresh markets', err.message);
    return cachedMarkets; // Return stale data rather than nothing
  }
}

function getCachedMarkets() {
  return cachedMarkets;
}

function getMarketBySlug(slug) {
  return cachedMarkets.find((m) => m.slug === slug) || null;
}

function getMarketsByCategory(category) {
  return cachedMarkets.filter((m) => m.category?.toLowerCase().includes(category.toLowerCase()));
}

function getTopMarketsByVolume(n = 20) {
  return [...cachedMarkets].sort((a, b) => b.volume24hr - a.volume24hr).slice(0, n);
}

function getTopMarketsByLiquidity(n = 20) {
  return [...cachedMarkets].sort((a, b) => b.liquidity - a.liquidity).slice(0, n);
}

function getHighSpreadMarkets(minSpread = 0.02, maxSpread = 0.15) {
  return cachedMarkets
    .filter((m) => m.spread !== null && m.spread >= minSpread && m.spread <= maxSpread)
    .sort((a, b) => b.spread - a.spread);
}

module.exports = {
  refreshMarkets,
  getCachedMarkets,
  getMarketBySlug,
  getMarketsByCategory,
  getTopMarketsByVolume,
  getTopMarketsByLiquidity,
  getHighSpreadMarkets,
};
