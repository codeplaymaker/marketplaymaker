/**
 * Market Watchlist
 *
 * Lets users track specific markets and see price changes,
 * signal hits, and relevant alerts in one personalized view.
 * This is the "sticky" feature for the intelligence platform.
 */

const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');

const WATCHLIST_FILE = path.join(__dirname, '..', 'logs', 'watchlist.json');

let watchlist = []; // [{ conditionId, market, platform, addedAt, priceAtAdd, notes }]

// Load from disk
try {
  if (fs.existsSync(WATCHLIST_FILE)) {
    watchlist = JSON.parse(fs.readFileSync(WATCHLIST_FILE, 'utf8'));
    log.info('WATCHLIST', `Loaded ${watchlist.length} watched markets`);
  }
} catch { /* fresh start */ }

function save() {
  try {
    fs.promises.writeFile(WATCHLIST_FILE, JSON.stringify(watchlist, null, 2));
  } catch { /* non-critical */ }
}

function add(market, notes = '') {
  if (watchlist.some(w => w.conditionId === market.conditionId)) {
    return { error: 'Already in watchlist' };
  }

  const entry = {
    conditionId: market.conditionId,
    market: market.question || market.market,
    slug: market.slug,
    platform: market.platform || 'POLYMARKET',
    addedAt: new Date().toISOString(),
    priceAtAdd: market.yesPrice,
    notes,
  };

  watchlist.push(entry);
  save();
  log.info('WATCHLIST', `Added: ${entry.market?.slice(0, 60)}`);
  return entry;
}

function remove(conditionId) {
  const idx = watchlist.findIndex(w => w.conditionId === conditionId);
  if (idx === -1) return null;
  const removed = watchlist.splice(idx, 1)[0];
  save();
  return removed;
}

function updateNotes(conditionId, notes) {
  const entry = watchlist.find(w => w.conditionId === conditionId);
  if (!entry) return null;
  entry.notes = notes;
  save();
  return entry;
}

/**
 * Get the full watchlist enriched with current market data and signals.
 * @param {Array} currentMarkets - Current market data from scanner
 * @param {Array} opportunities  - Current opportunities from strategies
 */
function getEnriched(currentMarkets, opportunities) {
  return watchlist.map(w => {
    const liveMarket = currentMarkets.find(m => m.conditionId === w.conditionId);
    const signals = opportunities.filter(o => o.conditionId === w.conditionId);

    const currentPrice = liveMarket?.yesPrice ?? null;
    const priceChange = currentPrice != null && w.priceAtAdd != null
      ? currentPrice - w.priceAtAdd
      : null;
    const priceChangePct = priceChange != null && w.priceAtAdd > 0
      ? priceChange / w.priceAtAdd
      : null;

    return {
      ...w,
      currentPrice,
      noPrice: liveMarket?.noPrice ?? null,
      priceChange,
      priceChangePct,
      volume24hr: liveMarket?.volume24hr ?? 0,
      liquidity: liveMarket?.liquidity ?? 0,
      spread: liveMarket?.spread ?? null,
      endDate: liveMarket?.endDate ?? null,
      active: liveMarket?.active ?? false,
      signalCount: signals.length,
      topSignal: signals.length > 0 ? {
        strategy: signals[0].strategy,
        score: signals[0].score,
        side: signals[0].side,
        confidence: signals[0].confidence,
      } : null,
    };
  });
}

function getAll() {
  return watchlist;
}

function isWatched(conditionId) {
  return watchlist.some(w => w.conditionId === conditionId);
}

module.exports = {
  add,
  remove,
  updateNotes,
  getEnriched,
  getAll,
  isWatched,
};
