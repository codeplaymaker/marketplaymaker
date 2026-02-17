/**
 * Bookmaker Signal Adapter
 *
 * Wraps bot/bookmakers/oddsApi.js for the independent signals pipeline.
 * This makes sports betting odds a first-class signal source alongside
 * LLM, Metaculus, Manifold, and Kalshi.
 *
 * When Polymarket says "Lakers win tonight: 55%" and Pinnacle/DraftKings
 * consensus says 62%, that's a REAL edge with hard data — not LLM guessing.
 */

const log = require('../utils/logger');
const oddsApi = require('../bookmakers/oddsApi');

/**
 * Get bookmaker consensus probability for a market.
 * Returns { prob, confidence, source, detail, matchQuality } or null.
 */
async function getBookmakerSignal(market) {
  // Use cached odds even without an API key — we may have disk-cached data
  const status = oddsApi.getStatus();
  if (status.cachedEvents === 0 && status.cachedOutrights === 0 && !oddsApi.hasApiKey()) return null;
  if (!market?.question) return null;

  try {
    // Try moneyline match first (single game)
    // matchAllMarkets returns a Map of conditionId → match
    const allMatches = oddsApi.matchAllMarkets([market]);
    let match = allMatches.get(market.conditionId) || null;

    // Try outright/futures match
    if (!match) {
      match = oddsApi.matchMarketToOutrights(market);
    }

    // Try spread/totals
    if (!match) {
      match = oddsApi.getBookmakerSpreads(market);
    }

    if (!match) return null;

    const bookmakerCount = match.bookmakerCount || 0;
    const hasPinnacle = match.pinnacleProb != null;

    // Match quality based on bookmaker count and sharp book presence
    let matchQuality = 0.5;
    if (bookmakerCount >= 5) matchQuality += 0.25;
    else if (bookmakerCount >= 3) matchQuality += 0.15;
    if (hasPinnacle) matchQuality += 0.15;
    // Date confirmation boosts quality
    if (match.type === 'SINGLE_GAME' || match.commenceTime) matchQuality += 0.1;
    matchQuality = Math.min(1.0, matchQuality);

    // Confidence based on bookmaker count
    const confidence = bookmakerCount >= 5 ? 'HIGH' :
                       bookmakerCount >= 3 ? 'MEDIUM' : 'LOW';

    return {
      prob: match.consensusProb,
      confidence,
      source: 'Bookmaker Consensus',
      matchQuality,
      matchValidated: true, // Bookmaker matches are structurally validated (team names match)
      detail: `${match.matchedEvent} — ${bookmakerCount} books${hasPinnacle ? ' (incl. Pinnacle)' : ''}, consensus: ${(match.consensusProb * 100).toFixed(0)}%`,
      bookmakerCount,
      divergence: match.divergence,
      matchedEvent: match.matchedEvent,
      sportKey: match.sportKey,
      type: match.type || 'MONEYLINE',
      pinnacleProb: match.pinnacleProb,
      bookmakers: match.bookmakers,
    };
  } catch (err) {
    log.warn('BOOKSIG', `Bookmaker signal failed: ${err.message}`);
    return null;
  }
}

/**
 * Check if currently configured and has cached data.
 */
function getStatus() {
  const status = oddsApi.getStatus();
  return {
    configured: status.hasKey,
    cachedEvents: status.cachedEvents,
    cachedOutrights: status.cachedOutrights,
    lastFetch: status.lastFetch,
    requestsRemaining: status.requestsRemaining,
  };
}

/**
 * Ensure odds are fetched (call on startup/periodic refresh).
 */
async function refresh() {
  if (!oddsApi.hasApiKey()) return;
  try {
    await oddsApi.fetchAllOdds();
    log.info('BOOKSIG', 'Bookmaker odds refreshed');
  } catch (err) {
    log.warn('BOOKSIG', `Failed to refresh odds: ${err.message}`);
  }
}

module.exports = {
  getBookmakerSignal,
  getStatus,
  refresh,
};
