/**
 * Expert & Cross-Platform Forecast Aggregator v2
 *
 * Aggregates forecasts from other prediction/forecasting platforms
 * to get INDEPENDENT probability estimates.
 *
 * Active Sources (verified Feb 2026):
 * 1. Manifold Markets API  — Separate prediction market (free, no key needed)
 * 2. Wikipedia Search       — Factual context & reality checks
 *
 * RETIRED (non-functional — removed to avoid silent failures):
 * - Good Judgment Open: no public search API (returns 404)
 * - INFER (CSET Foretell): no public API, requires auth
 *
 * Each source returns { prob, confidence, source, detail }
 * which feeds into the unified independent signal hub.
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const { extractSearchStrategies } = require('./searchUtils');

// Late-loaded to avoid circular dependency
let llmAnalysis = null;
function getLLM() {
  if (!llmAnalysis) {
    try { llmAnalysis = require('./llmAnalysis'); } catch { /* not available */ }
  }
  return llmAnalysis;
}

const CACHE_FILE = path.join(__dirname, '../logs/expert-forecast-cache.json');
const CACHE_TTL = 1800000; // 30 min

// State
let cache = new Map();
let fetchCount = 0;
let sourceStats = {
  manifold: { attempts: 0, successes: 0, lastSuccess: null, lastError: null },
  wikipedia: { attempts: 0, successes: 0, lastSuccess: null, lastError: null },
};

// Load cache
try {
  if (fs.existsSync(CACHE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (saved.entries) {
      for (const [k, v] of Object.entries(saved.entries)) {
        cache.set(k, v);
      }
      log.info('EXPERT', `Loaded ${cache.size} cached expert forecasts`);
    }
    if (saved.sourceStats) sourceStats = { ...sourceStats, ...saved.sourceStats };
  }
} catch { /* fresh start */ }

function saveCache() {
  try {
    const entries = Object.fromEntries(cache);
    fs.promises.writeFile(CACHE_FILE, JSON.stringify({
      entries, fetchCount, sourceStats, savedAt: new Date().toISOString(),
    }, null, 2));
  } catch { /* non-critical */ }
}

// ─── Manifold Markets (free API, no key needed) ──────────────────────
/**
 * Manifold Markets is a completely separate prediction market — prices here
 * are independent from Polymarket. Cross-referencing gives real divergence data.
 *
 * API docs: https://docs.manifold.markets/api
 */
async function fetchManifoldEstimate(searchTerm, originalQuestion = null) {
  sourceStats.manifold.attempts++;
  try {
    // Try multiple search strategies — entity-focused first, then broader
    const strategies = extractSearchStrategies(originalQuestion || searchTerm);
    if (!strategies.includes(searchTerm)) strategies.push(searchTerm);

    let allMarkets = [];
    const seenIds = new Set();

    for (const term of strategies.slice(0, 3)) {
      try {
        const resp = await fetch(
          `https://api.manifold.markets/v0/search-markets?term=${encodeURIComponent(term)}&limit=15&filter=open&sort=liquidity`,
          {
            headers: { 'User-Agent': 'MarketPlayMaker/2.0' },
            signal: AbortSignal.timeout(10000),
          }
        );

        if (!resp.ok) continue;
        const markets = await resp.json();

        if (markets?.length > 0) {
          for (const m of markets) {
            if (!seenIds.has(m.id)) {
              seenIds.add(m.id);
              allMarkets.push(m);
            }
          }
        }

        // If we got enough results with the short query, stop
        if (allMarkets.length >= 8) break;
      } catch { /* try next strategy */ }
    }

    if (allMarkets.length === 0) {
      sourceStats.manifold.lastError = 'No results from any search strategy';
      return null;
    }

    if (allMarkets.length > 0) {
      // Score matches by keyword overlap
      const effectiveSearch = originalQuestion || searchTerm;
      const searchWords = effectiveSearch.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
      let bestMatch = allMarkets[0];
      let bestScore = 0;

      for (const m of allMarkets) {
        const q = (m.question || '').toLowerCase();
        const score = searchWords.filter(w => q.includes(w)).length;
        // Prefer higher liquidity among similar matches
        const liquidityBonus = Math.log10(Math.max(m.totalLiquidity || 1, 1)) * 0.1;
        const totalScore = score + liquidityBonus;
        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestMatch = m;
        }
      }

      const prob = bestMatch.probability;

      if (prob != null) {
        // ─── LLM Match Validation ──────────────────────────────────
        let matchValidation = { isMatch: true, matchQuality: 1.0, reason: 'No validation available' };
        const llm = getLLM();
        if (llm?.isConfigured() && originalQuestion && bestMatch.question) {
          try {
            matchValidation = await llm.validateMatch(originalQuestion, bestMatch.question, 'Manifold');
          } catch (err) {
            log.warn('EXPERT', `Match validation failed: ${err.message}`);
          }
        }

        // Reject matches below quality threshold
        if (matchValidation.matchQuality < 0.35) {
          log.info('EXPERT', `❌ Rejected Manifold match: "${bestMatch.question?.slice(0, 50)}" for "${(originalQuestion || searchTerm).slice(0, 50)}" (quality: ${matchValidation.matchQuality}, reason: ${matchValidation.reason})`);
          return null;
        }

        sourceStats.manifold.successes++;
        sourceStats.manifold.lastSuccess = new Date().toISOString();
        sourceStats.manifold.lastError = null;
        return {
          source: 'Manifold',
          type: 'prediction_market',
          prob: Math.round(prob * 1000) / 1000,
          confidence: (bestMatch.totalLiquidity || 0) > 1000 ? 'MEDIUM' : 'LOW',
          question: bestMatch.question,
          traders: bestMatch.uniqueBettorCount || 0,
          liquidity: bestMatch.totalLiquidity || 0,
          volume: bestMatch.volume || 0,
          url: bestMatch.url || `https://manifold.markets/${bestMatch.creatorUsername}/${bestMatch.slug}`,
          detail: `${bestMatch.uniqueBettorCount || 0} traders, $${Math.round(bestMatch.totalLiquidity || 0)} liquidity`,
          matchScore: bestScore,
          matchQuality: matchValidation.matchQuality,
          matchReason: matchValidation.reason,
          matchValidated: matchValidation.matchQuality >= 0.35,
        };
      }
    }
  } catch (err) {
    sourceStats.manifold.lastError = err.message;
    log.warn('EXPERT', `Manifold fetch failed: ${err.message}`);
  }
  return null;
}

// ─── Wikipedia Contextual Search ─────────────────────────────────────
/**
 * For factual markets (e.g. "Will X reach Y by date Z?"), search Wikipedia
 * for the latest known context. This is a reality check, not a probability
 * estimate, but can strongly inform YES/NO reasoning.
 */
async function fetchWikipediaContext(searchTerm) {
  sourceStats.wikipedia.attempts++;
  try {
    const resp = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&srlimit=2&srprop=snippet|timestamp`,
      {
        headers: { 'User-Agent': 'MarketPlayMaker/2.0 (contact: github.com/marketplaymaker)' },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!resp.ok) {
      sourceStats.wikipedia.lastError = `HTTP ${resp.status}`;
      return null;
    }

    const data = await resp.json();
    const results = data?.query?.search;

    if (results?.length > 0) {
      const best = results[0];
      const cleanSnippet = (best.snippet || '').replace(/<[^>]+>/g, '');

      let extract = cleanSnippet;
      try {
        const pageResp = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(best.title)}`,
          {
            headers: { 'User-Agent': 'MarketPlayMaker/2.0' },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (pageResp.ok) {
          const pageData = await pageResp.json();
          if (pageData?.extract) extract = pageData.extract.slice(0, 500);
        }
      } catch { /* use snippet fallback */ }

      sourceStats.wikipedia.successes++;
      sourceStats.wikipedia.lastSuccess = new Date().toISOString();
      sourceStats.wikipedia.lastError = null;
      return {
        source: 'Wikipedia',
        type: 'factual_context',
        extract,
        title: best.title,
        lastModified: best.timestamp,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(best.title.replace(/ /g, '_'))}`,
      };
    }
  } catch (err) {
    sourceStats.wikipedia.lastError = err.message;
    log.warn('EXPERT', `Wikipedia search failed: ${err.message}`);
  }
  return null;
}

// ─── Unified Expert Forecast Fetch ───────────────────────────────────
/**
 * Gather all available expert/cross-platform estimates for a market.
 *
 * @param {Object} market - Market with question, category, conditionId
 * @returns {Object} { estimates, consensusProb, bestSource, divergence }
 */
async function getExpertEstimates(market) {
  if (!market?.question) return { estimates: [], consensusProb: null, sourceCount: 0 };

  const cacheKey = `expert_${market.conditionId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached, cached: true };
  }

  const question = market.question;
  const searchTerm = question.replace(/\?/g, '').replace(/^Will\s+/i, '').trim();
  const estimates = [];

  // Run all fetches in parallel
  const fetches = [
    fetchManifoldEstimate(searchTerm, question).then(r => {
      if (r?.prob != null) estimates.push(r);
    }).catch(() => {}),

    fetchWikipediaContext(searchTerm).then(r => {
      if (r?.extract) {
        estimates.push({
          source: r.source,
          type: r.type,
          prob: null, // Context only, not a probability
          confidence: 'LOW',
          detail: r.extract.slice(0, 200),
          url: r.url,
        });
      }
    }).catch(() => {}),
  ];

  await Promise.allSettled(fetches);
  fetchCount += fetches.length;

  // Compute consensus (only from sources with probability estimates)
  const probEstimates = estimates.filter(e => e.prob != null);
  let consensusProb = null;
  let bestSource = null;

  if (probEstimates.length > 0) {
    const weights = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    let totalWeight = 0;
    let weightedSum = 0;
    let bestWeight = 0;

    for (const est of probEstimates) {
      const w = weights[est.confidence] || 1;
      weightedSum += est.prob * w;
      totalWeight += w;
      if (w > bestWeight) { bestWeight = w; bestSource = est.source; }
    }
    consensusProb = totalWeight > 0
      ? Math.round(weightedSum / totalWeight * 1000) / 1000
      : null;
  }

  const result = {
    estimates,
    consensusProb,
    bestSource,
    sourceCount: probEstimates.length,
    divergenceFromMarket: consensusProb != null && market.yesPrice != null
      ? Math.round((consensusProb - market.yesPrice) * 1000) / 1000
      : null,
    timestamp: Date.now(),
    fetchedAt: new Date().toISOString(),
  };

  cache.set(cacheKey, result);
  saveCache();

  if (probEstimates.length > 0) {
    log.info('EXPERT', `"${question?.slice(0, 40)}" → ${probEstimates.length} expert sources, consensus ${consensusProb != null ? (consensusProb * 100).toFixed(0) + '%' : 'N/A'}`);
  }

  return result;
}

function getCached(conditionId) {
  return cache.get(`expert_${conditionId}`) || null;
}

function getStatus() {
  return {
    cachedEntries: cache.size,
    totalFetches: fetchCount,
    sources: [
      { name: 'Manifold Markets', status: 'active', description: 'Independent prediction market — cross-platform price comparison', stats: sourceStats.manifold },
      { name: 'Wikipedia', status: 'active', description: 'Factual context & reality checks', stats: sourceStats.wikipedia },
    ],
    retired: [
      { name: 'Good Judgment Open', reason: 'No public search API (404)' },
      { name: 'INFER', reason: 'No public API, requires auth' },
    ],
  };
}

module.exports = {
  getExpertEstimates,
  fetchManifoldEstimate,
  fetchWikipediaContext,
  getCached,
  getStatus,
};
