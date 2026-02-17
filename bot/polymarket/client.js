const config = require('../config');
const log = require('../utils/logger');

const GAMMA = config.GAMMA_API;
const CLOB = config.CLOB_API;

/**
 * Polymarket API Client
 * Level 0: Public read-only (no auth) — market data, orderbooks, prices
 * Level 1+: Authenticated trading (requires private key) — orders, positions
 *
 * We use the Gamma API for market discovery and the CLOB API for orderbook/trading.
 */

// ─── Helpers ─────────────────────────────────────────────────────────
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Market Discovery (Gamma API) ───────────────────────────────────
async function getMarkets({ limit = 100, offset = 0, closed = false, active = true, order = 'volume24hr', ascending = false } = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    closed: String(closed),
    active: String(active),
    order,
    ascending: String(ascending),
  });
  const data = await fetchJSON(`${GAMMA}/markets?${params}`);
  return Array.isArray(data) ? data : [];
}

async function getMarketBySlug(slug) {
  const data = await fetchJSON(`${GAMMA}/markets?slug=${slug}`);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function getMarketById(conditionId) {
  const data = await fetchJSON(`${GAMMA}/markets?condition_id=${conditionId}`);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function getEvents({ limit = 50, active = true } = {}) {
  const params = new URLSearchParams({ limit: String(limit), active: String(active) });
  const data = await fetchJSON(`${GAMMA}/events?${params}`);
  return Array.isArray(data) ? data : [];
}

async function getEventBySlug(slug) {
  try {
    const data = await fetchJSON(`${GAMMA}/events?slug=${encodeURIComponent(slug)}&closed=false`);
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

// ─── CLOB API (Orderbook + Trading) ─────────────────────────────────
async function getOrderbook(tokenId) {
  return fetchJSON(`${CLOB}/book?token_id=${tokenId}`);
}

async function getMidpoint(tokenId) {
  const data = await fetchJSON(`${CLOB}/midpoint?token_id=${tokenId}`);
  return data?.mid ? parseFloat(data.mid) : null;
}

async function getPrice(tokenId, side = 'buy') {
  const data = await fetchJSON(`${CLOB}/price?token_id=${tokenId}&side=${side}`);
  return data?.price ? parseFloat(data.price) : null;
}

async function getSpread(tokenId) {
  const data = await fetchJSON(`${CLOB}/spread?token_id=${tokenId}`);
  return data?.spread ? parseFloat(data.spread) : null;
}

async function getLastTradePrice(tokenId) {
  const data = await fetchJSON(`${CLOB}/last-trade-price?token_id=${tokenId}`);
  return data?.price ? parseFloat(data.price) : null;
}

// ─── Market Enrichment ──────────────────────────────────────────────
/**
 * Enrich raw Gamma market with CLOB data (orderbook, spreads, midpoint).
 * This merges discovery data with live trading data.
 */
async function enrichMarket(market) {
  if (!market.clobTokenIds) return market;

  try {
    const tokenIds = JSON.parse(market.clobTokenIds);
    const outcomePrices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];

    const enriched = {
      ...market,
      tokens: [],
      bestBid: market.bestBid ? parseFloat(market.bestBid) : null,
      bestAsk: market.bestAsk ? parseFloat(market.bestAsk) : null,
      spread: market.spread ? parseFloat(market.spread) : null,
      volume24hr: parseFloat(market.volume24hr || 0),
      volumeNum: parseFloat(market.volumeNum || 0),
      liquidity: parseFloat(market.liquidity || 0),
    };

    const outcomes = market.outcomes ? JSON.parse(market.outcomes) : ['Yes', 'No'];

    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];
      const price = outcomePrices[i] ? parseFloat(outcomePrices[i]) : null;

      let orderbook = null;
      let mid = null;
      let tokenSpread = null;

      try {
        [orderbook, mid, tokenSpread] = await Promise.all([
          getOrderbook(tokenId).catch(() => null),
          getMidpoint(tokenId).catch(() => null),
          getSpread(tokenId).catch(() => null),
        ]);
      } catch {
        // Non-critical — continue without CLOB data
      }

      enriched.tokens.push({
        tokenId,
        outcome: outcomes[i] || (i === 0 ? 'Yes' : 'No'),
        price,
        mid,
        spread: tokenSpread,
        orderbook,
      });
    }

    return enriched;
  } catch (err) {
    log.warn('CLIENT', `Failed to enrich market ${market.question}`, err.message);
    return market;
  }
}

// ─── Batch Operations ───────────────────────────────────────────────
async function getAllActiveMarkets(limit = 500) {
  const all = [];
  let offset = 0;
  const batchSize = 100;

  while (offset < limit) {
    const batch = await getMarkets({ limit: batchSize, offset, active: true, closed: false });
    if (batch.length === 0) break;
    all.push(...batch);
    offset += batchSize;
    if (batch.length < batchSize) break;
  }

  return all;
}

async function scanForNoBetOpportunities(minNoPrice = 0.92, minLiquidity = 1000) {
  const markets = await getAllActiveMarkets(300);
  const opportunities = [];

  for (const market of markets) {
    try {
      const outcomePrices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];
      const liquidity = parseFloat(market.liquidity || 0);
      const volume = parseFloat(market.volume24hr || 0);

      if (liquidity < minLiquidity) continue;

      // outcomePrices[0] = YES price, outcomePrices[1] = NO price
      // If YES is very cheap, NO is very expensive → NO is the bet
      const yesPrice = parseFloat(outcomePrices[0] || 0.5);
      const noPrice = parseFloat(outcomePrices[1] || 0.5);

      if (noPrice >= minNoPrice) {
        opportunities.push({
          market: market.question,
          conditionId: market.conditionId,
          slug: market.slug,
          yesPrice,
          noPrice,
          expectedProfit: noPrice - 1 + 1, // profit per $1 of NO
          liquidity,
          volume24h: volume,
          endDate: market.endDate,
          groupSlug: market.groupSlug,
        });
      }
    } catch {
      continue;
    }
  }

  return opportunities.sort((a, b) => b.noPrice - a.noPrice);
}

async function scanForArbitrageOpportunities(events) {
  const opportunities = [];

  for (const event of events) {
    if (!event.markets || event.markets.length < 2) continue;

    // Check if related market probabilities are inconsistent
    const marketPrices = [];
    for (const market of event.markets) {
      try {
        const prices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];
        const yesPrice = parseFloat(prices[0] || 0.5);
        marketPrices.push({
          question: market.question,
          conditionId: market.conditionId,
          yesPrice,
          noPrice: 1 - yesPrice,
          liquidity: parseFloat(market.liquidity || 0),
          volume: parseFloat(market.volume24hr || 0),
        });
      } catch {
        continue;
      }
    }

    // Check for logical inconsistencies
    // Example: If "X wins the election" has markets for different states,
    // the sub-event probabilities should be bounded by the top-level
    if (marketPrices.length >= 2) {
      const totalYes = marketPrices.reduce((sum, m) => sum + m.yesPrice, 0);

      // If these are mutually exclusive outcomes, they should sum to ~1.0
      // If they sum to significantly more or less, there's an arb
      if (totalYes > 1.03 || totalYes < 0.97) {
        opportunities.push({
          event: event.title || event.slug,
          markets: marketPrices,
          totalProbability: totalYes,
          edge: Math.abs(totalYes - 1.0),
          type: totalYes > 1 ? 'overpriced' : 'underpriced',
        });
      }
    }
  }

  return opportunities.sort((a, b) => b.edge - a.edge);
}

// ─── Price History (for ICT analysis) ────────────────────────────────
/**
 * Fetch price history for a token.
 * @param {string} tokenId - The CLOB token ID
 * @param {string} interval - Time interval: '1m', '5m', '1h', '1d'
 * @param {number} fidelity - Number of data points (max ~500)
 * @returns {Array<{t: number, p: number}>} - Array of {timestamp, price}
 */
async function getPriceHistory(tokenId, interval = '1h', fidelity = 100) {
  try {
    const data = await fetchJSON(
      `${CLOB}/prices-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`
    );
    return data?.history || [];
  } catch (err) {
    log.warn('CLIENT', `Failed to get price history: ${err.message}`);
    return [];
  }
}

module.exports = {
  // Market Discovery
  getMarkets,
  getMarketBySlug,
  getMarketById,
  getEvents,
  getEventBySlug,
  getAllActiveMarkets,

  // CLOB Data
  getOrderbook,
  getMidpoint,
  getPrice,
  getSpread,
  getLastTradePrice,

  // Price History
  getPriceHistory,

  // Enrichment
  enrichMarket,

  // Scanning
  scanForNoBetOpportunities,
  scanForArbitrageOpportunities,
};
