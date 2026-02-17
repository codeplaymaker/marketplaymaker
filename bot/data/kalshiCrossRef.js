/**
 * Kalshi Cross-Reference Source
 *
 * Uses Kalshi market prices as an independent probability source.
 * Since Kalshi is a CFTC-regulated exchange with real money at stake,
 * its prices are a genuine independent signal vs Polymarket.
 *
 * Key insight: if a Polymarket edge exists AND Kalshi agrees with our
 * independent estimate, the edge is much more credible.
 */

const log = require('../utils/logger');
let llmAnalysis = null;

// Late-load to avoid circular deps
function getLLM() {
  if (!llmAnalysis) {
    try { llmAnalysis = require('./llmAnalysis'); } catch { /* ok */ }
  }
  return llmAnalysis;
}

// Cache: question → { kalshiPrice, ticker, matchQuality, timestamp }
const crossRefCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

// Stats
let stats = {
  attempts: 0,
  matches: 0,
  lastMatch: null,
  lastError: null,
};

/**
 * Search Kalshi markets for one matching the given Polymarket question.
 * Returns the Kalshi price as an independent probability if found.
 *
 * @param {Object} market - Polymarket-format market { question, conditionId, yesPrice, ... }
 * @returns {Object|null} { prob, source, matchQuality, ticker, ... } or null
 */
async function getKalshiCrossPrice(market) {
  if (!market?.question) return null;

  // Check cache
  const cached = crossRefCache.get(market.conditionId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    if (cached.result === null) return null; // Cached miss
    return { ...cached.result, cached: true };
  }

  stats.attempts++;

  try {
    // Load Kalshi markets module
    let kalshiMarkets;
    try { kalshiMarkets = require('../kalshi/markets'); } catch { return null; }

    const allKalshi = kalshiMarkets.getCachedMarkets();
    if (!allKalshi || allKalshi.length === 0) return null;

    // ─── Step 1: Keyword-based candidate selection ─────────────────
    const queryWords = extractKeywords(market.question);
    if (queryWords.length === 0) return null;

    // Score each Kalshi market by keyword overlap
    const candidates = [];
    for (const km of allKalshi) {
      if (!km.question) continue;
      const kmWords = extractKeywords(km.question);
      const overlap = queryWords.filter(w => kmWords.includes(w)).length;
      const score = overlap / Math.max(queryWords.length, 1);
      // Lowered thresholds: 15% overlap AND 1+ shared word (was 30% + 2)
      if (score >= 0.15 && overlap >= 1) {
        candidates.push({ market: km, keywordScore: score, overlap });
      }
    }

    if (candidates.length === 0) {
      crossRefCache.set(market.conditionId, { result: null, timestamp: Date.now() });
      return null;
    }

    // Sort by keyword overlap, take top 5 (was 3)
    candidates.sort((a, b) => b.keywordScore - a.keywordScore);
    const topCandidates = candidates.slice(0, 5);

    // ─── Step 2: LLM validation of best candidate ──────────────────
    const llm = getLLM();
    let bestMatch = null;

    for (const c of topCandidates) {
      if (llm?.validateMatch) {
        try {
          const validation = await llm.validateMatch(
            market.question,
            c.market.question
          );
          // Lowered threshold from 0.6 to 0.4
          if (validation.isMatch && validation.matchQuality >= 0.4) {
            bestMatch = {
              prob: c.market.yesPrice,
              source: 'Kalshi',
              matchQuality: validation.matchQuality,
              matchReason: validation.reason,
              matchValidated: true,
              ticker: c.market.conditionId,
              kalshiQuestion: c.market.question,
              volume: c.market.volume24hr || c.market.volumeNum || 0,
              cached: false,
            };
            break;
          }
        } catch (err) {
          log.warn('KALSHI_XREF', `LLM validation failed: ${err.message}`);
        }
      } else {
        // No LLM available — use keyword score as proxy
        if (c.keywordScore >= 0.5 && c.overlap >= 2) {
          bestMatch = {
            prob: c.market.yesPrice,
            source: 'Kalshi',
            matchQuality: c.keywordScore * 0.8, // Discount without LLM validation
            matchReason: `Keyword match (${c.overlap} shared words, ${(c.keywordScore * 100).toFixed(0)}% overlap)`,
            matchValidated: false,
            ticker: c.market.conditionId,
            kalshiQuestion: c.market.question,
            volume: c.market.volume24hr || c.market.volumeNum || 0,
            cached: false,
          };
          break;
        }
      }
    }

    // Cache result
    crossRefCache.set(market.conditionId, {
      result: bestMatch,
      timestamp: Date.now(),
    });

    if (bestMatch) {
      stats.matches++;
      stats.lastMatch = new Date().toISOString();
      log.info('KALSHI_XREF',
        `✅ Cross-ref match: "${market.question?.slice(0, 40)}" ↔ Kalshi "${bestMatch.kalshiQuestion?.slice(0, 40)}" @ ${(bestMatch.prob * 100).toFixed(0)}% (quality: ${bestMatch.matchQuality.toFixed(2)})`
      );
    }

    return bestMatch;
  } catch (err) {
    stats.lastError = err.message;
    log.warn('KALSHI_XREF', `Error: ${err.message}`);
    return null;
  }
}

/**
 * Extract meaningful keywords from a question string.
 * Less aggressive stop word removal — keep words like 'win', 'next', 'new'
 * that can be meaningful in sports/event contexts.
 */
function extractKeywords(question) {
  const stopWords = new Set([
    'will', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'shall', 'should',
    'may', 'might', 'must', 'can', 'could', 'would', 'of', 'in', 'on',
    'at', 'to', 'for', 'with', 'by', 'from', 'up', 'about', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between',
    'out', 'off', 'over', 'under', 'than', 'too', 'very', 'just', 'or',
    'and', 'but', 'if', 'while', 'that', 'this', 'these', 'those',
    'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
    'not', 'no', 'nor', 'as', 'its', 'it', 'so', 'such', 'own',
    // Removed: 'win', 'next', 'new', 'first', 'last' — these matter for matching
  ]);

  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w));
}

function getStatus() {
  return {
    cachedEntries: crossRefCache.size,
    ...stats,
  };
}

module.exports = {
  getKalshiCrossPrice,
  getStatus,
};
