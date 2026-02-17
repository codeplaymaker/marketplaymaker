const config = require('../config');
const log = require('../utils/logger');

const BASE_URL = config.KALSHI_API || 'https://api.elections.kalshi.com/trade-api/v2';

/**
 * Kalshi API Client — Public (read-only) endpoints
 *
 * Uses Kalshi's v2 REST API. No authentication needed for market data.
 * Despite the "elections" subdomain, this serves ALL Kalshi markets.
 *
 * Prices on Kalshi are in CENTS (1-99). We normalize to decimals (0.01-0.99)
 * to match the Polymarket format used throughout the bot.
 */

// ─── Helpers ─────────────────────────────────────────────────────────
async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kalshi API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Markets ─────────────────────────────────────────────────────────

/**
 * Get markets with optional filters. Uses cursor-based pagination.
 * @param {Object} opts
 * @param {number}  opts.limit        - Results per page (max 1000, default 200)
 * @param {string}  opts.cursor       - Pagination cursor
 * @param {string}  opts.status       - 'open' | 'closed' | 'settled'
 * @param {string}  opts.seriesTicker - Filter by series
 * @param {string}  opts.eventTicker  - Filter by event (comma-separated, max 10)
 * @param {string}  opts.tickers      - Filter by specific market tickers (comma-separated)
 */
async function getMarkets(opts = {}) {
  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.status) params.set('status', opts.status);
  if (opts.seriesTicker) params.set('series_ticker', opts.seriesTicker);
  if (opts.eventTicker) params.set('event_ticker', opts.eventTicker);
  if (opts.tickers) params.set('tickers', opts.tickers);
  // Exclude multivariate combo markets (no real pricing / noise)
  params.set('mve_filter', 'exclude');

  const data = await fetchJSON(`${BASE_URL}/markets?${params}`);
  return {
    markets: data.markets || [],
    cursor: data.cursor || null,
  };
}

/**
 * Get a single market by ticker.
 */
async function getMarket(ticker) {
  const data = await fetchJSON(`${BASE_URL}/markets/${ticker}`);
  return data.market || null;
}

/**
 * Get all open markets with pagination.
 * @param {number} maxMarkets - Maximum markets to fetch (default 500)
 */
async function getAllOpenMarkets(maxMarkets = 500) {
  const all = [];
  let cursor = null;
  const batchSize = 1000; // Kalshi allows up to 1000 per page

  while (all.length < maxMarkets) {
    const result = await getMarkets({ limit: batchSize, status: 'open', cursor });
    if (!result.markets.length) break;
    all.push(...result.markets);
    cursor = result.cursor;
    if (!cursor) break;
    // Safety: max 5 pages to avoid runaway requests
    if (all.length / batchSize >= 5) break;
  }

  return all;
}

// ─── Events ──────────────────────────────────────────────────────────

/**
 * Get events (groups of related markets).
 */
async function getEvents(opts = {}) {
  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.status) params.set('status', opts.status);
  if (opts.seriesTicker) params.set('series_ticker', opts.seriesTicker);

  const data = await fetchJSON(`${BASE_URL}/events?${params}`);
  return {
    events: data.events || [],
    cursor: data.cursor || null,
  };
}

/**
 * Get a single event by ticker.
 */
async function getEvent(eventTicker) {
  const data = await fetchJSON(`${BASE_URL}/events/${eventTicker}`);
  return data.event || null;
}

// ─── Orderbook ───────────────────────────────────────────────────────

/**
 * Get the orderbook for a market.
 * Kalshi returns bids only (yes[] and no[]). Each entry is [priceCents, quantity].
 * Best bid = last element in array (highest price).
 *
 * We normalize to a format similar to Polymarket's orderbook.
 */
async function getOrderbook(ticker) {
  const data = await fetchJSON(`${BASE_URL}/markets/${ticker}/orderbook`);
  const ob = data.orderbook || {};

  // Kalshi format: { yes: [[priceCents, qty], ...], no: [[priceCents, qty], ...] }
  const yesBids = (ob.yes || []).map(([price, qty]) => ({
    price: (price / 100).toFixed(4),
    size: String(qty),
  }));
  const noBids = (ob.no || []).map(([price, qty]) => ({
    price: (price / 100).toFixed(4),
    size: String(qty),
  }));

  // Derive asks from the reciprocal relationship:
  // YES ask = 1 - highest NO bid price
  // NO ask = 1 - highest YES bid price
  const bestYesBid = yesBids.length ? parseFloat(yesBids[yesBids.length - 1].price) : null;
  const bestNoBid = noBids.length ? parseFloat(noBids[noBids.length - 1].price) : null;

  return {
    // Polymarket-compatible format (bids and asks)
    bids: yesBids,
    asks: noBids.map(b => ({
      price: (1 - parseFloat(b.price)).toFixed(4),
      size: b.size,
    })).reverse(),
    // Raw Kalshi format
    raw: ob,
    // Best prices
    bestYesBid,
    bestNoBid,
    bestYesAsk: bestNoBid != null ? 1 - bestNoBid : null,
    bestNoAsk: bestYesBid != null ? 1 - bestYesBid : null,
    spread: (bestYesBid != null && bestNoBid != null)
      ? Math.round((1 - bestNoBid - bestYesBid) * 10000) / 10000
      : null,
  };
}

// ─── Trades ──────────────────────────────────────────────────────────

/**
 * Get recent trades for a market.
 */
async function getTrades(ticker, opts = {}) {
  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.cursor) params.set('cursor', opts.cursor);

  const data = await fetchJSON(`${BASE_URL}/markets/trades?ticker=${ticker}&${params}`);
  return {
    trades: data.trades || [],
    cursor: data.cursor || null,
  };
}

// ─── Series ──────────────────────────────────────────────────────────

async function getSeries(seriesTicker) {
  const data = await fetchJSON(`${BASE_URL}/series/${seriesTicker}`);
  return data.series || null;
}

// ─── Normalize to Bot Format ─────────────────────────────────────────

/**
 * Normalize a Kalshi market object to the same shape used by Polymarket markets
 * throughout the bot. This enables strategy reuse across platforms.
 */
function normalizeMarket(km) {
  // Prices: Kalshi gives yes_bid, yes_ask, no_bid, no_ask in cents
  // Also yes_bid_dollars, yes_ask_dollars etc. as strings
  const yesBid = km.yes_bid != null ? km.yes_bid / 100 : null;
  const yesAsk = km.yes_ask != null ? km.yes_ask / 100 : null;
  const noBid = km.no_bid != null ? km.no_bid / 100 : null;
  const noAsk = km.no_ask != null ? km.no_ask / 100 : null;
  const lastPrice = km.last_price != null ? km.last_price / 100 : null;

  // Mid price for YES / NO — use bid/ask when available, fall back to
  // deriving from the other side (since YES + NO = 1.00), then to lastPrice
  let yesPrice;
  if (yesBid != null && yesBid > 0 && yesAsk != null && yesAsk > 0) {
    yesPrice = (yesBid + yesAsk) / 2;
  } else if (noBid != null && noBid > 0) {
    yesPrice = 1 - noBid; // best NO bid → implied YES ask
  } else if (lastPrice != null && lastPrice > 0) {
    yesPrice = lastPrice;
  } else {
    yesPrice = yesBid ?? yesAsk ?? 0.5;
  }

  let noPrice;
  if (noBid != null && noBid > 0 && noAsk != null && noAsk > 0) {
    noPrice = (noBid + noAsk) / 2;
  } else if (yesBid != null && yesBid > 0) {
    noPrice = 1 - yesBid; // best YES bid → implied NO ask
  } else if (lastPrice != null && lastPrice > 0) {
    noPrice = 1 - lastPrice;
  } else {
    noPrice = noBid ?? noAsk ?? 0.5;
  }

  const spread = (yesAsk != null && yesBid != null && yesAsk > 0 && yesBid > 0)
    ? yesAsk - yesBid
    : null;

  return {
    // Common bot format fields
    conditionId: km.ticker,                        // unique ID (Kalshi uses ticker)
    question: km.title || km.subtitle || km.ticker,
    slug: km.ticker,
    groupSlug: km.event_ticker || null,
    negRisk: false,
    groupItemTitle: km.subtitle || null,
    yesPrice: Math.round(yesPrice * 10000) / 10000,
    noPrice: Math.round(noPrice * 10000) / 10000,
    yesTokenId: `kalshi:${km.ticker}:yes`,         // pseudo token IDs
    noTokenId: `kalshi:${km.ticker}:no`,
    outcomes: ['Yes', 'No'],
    volume24hr: km.volume_24h || 0,
    volumeNum: km.volume || 0,
    liquidity: km.liquidity || 0,
    bestBid: yesBid,
    bestAsk: yesAsk,
    spread,
    endDate: km.close_time || km.expiration_time || null,
    category: km.event_ticker?.split('-')[0]?.toLowerCase() || 'unknown',
    active: km.status === 'open' || km.status === 'active',
    closed: km.status === 'closed' || km.status === 'settled',
    // Platform identifier
    platform: 'KALSHI',
    // Kalshi-specific fields
    kalshi: {
      ticker: km.ticker,
      eventTicker: km.event_ticker,
      marketType: km.market_type,
      status: km.status,
      lastPrice: lastPrice,
      openInterest: km.open_interest || 0,
      openInterestFp: km.open_interest_fp || '0',
      tickSize: km.tick_size || 1,
      result: km.result,
      canCloseEarly: km.can_close_early,
      rulesP: km.rules_primary,
      rulesS: km.rules_secondary,
      strikeType: km.strike_type,
      floorStrike: km.floor_strike,
      capStrike: km.cap_strike,
      functionalStrike: km.functional_strike,
    },
    // Keep raw for debugging
    raw: km,
  };
}

module.exports = {
  getMarkets,
  getMarket,
  getAllOpenMarkets,
  getEvents,
  getEvent,
  getOrderbook,
  getTrades,
  getSeries,
  normalizeMarket,
};
