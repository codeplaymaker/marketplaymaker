/**
 * Polling & Public Forecast Aggregator v2
 *
 * Fetches probability estimates from VERIFIED WORKING public sources
 * that are INDEPENDENT of prediction market prices.
 *
 * Active Sources (all verified Feb 2026):
 * 1. Metaculus API v2     — Superforecaster crowd medians (best calibrated public source)
 * 2. Wikipedia Search API — Factual context for real-world grounding
 *
 * RETIRED (non-functional — removed to avoid silent failures):
 * - PredictIt: shut down Feb 2023 by CFTC order
 * - FiveThirtyEight: no stable public API, HTML scraping broke
 * - RealClearPolitics: undocumented API returns 403/404
 *
 * All estimates cached 30 min to avoid hammering sources.
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

const CACHE_FILE = path.join(__dirname, '../logs/polling-cache.json');
const CACHE_TTL = 1800000; // 30 min

// State
let cache = new Map();
let fetchCount = 0;
let sourceStats = {
  metaculus: { attempts: 0, successes: 0, lastSuccess: null, lastError: null },
  wikipedia: { attempts: 0, successes: 0, lastSuccess: null, lastError: null },
};

// Load cache from disk
try {
  if (fs.existsSync(CACHE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (saved.entries) {
      for (const [k, v] of Object.entries(saved.entries)) {
        cache.set(k, v);
      }
      log.info('POLLING', `Loaded ${cache.size} cached polling entries`);
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

// ─── Metaculus API v2 ────────────────────────────────────────────────
/**
 * Fetch community forecasts from Metaculus — one of the best-calibrated
 * public forecasting platforms. Their crowd median is often more accurate
 * than individual experts or even prediction markets.
 *
 * Returns: { source, type, question, communityMedian, forecasterCount, url }
 */
async function fetchMetaculusForecast(searchTerm, originalQuestion = null) {
  sourceStats.metaculus.attempts++;
  try {
    // Try multiple search strategies — short entity-based first, then broader
    const strategies = extractSearchStrategies(originalQuestion || searchTerm);
    if (!strategies.includes(searchTerm)) strategies.push(searchTerm);

    let allResults = [];
    const seenIds = new Set();

    for (const term of strategies.slice(0, 3)) {
      try {
        const resp = await fetch(
          `https://www.metaculus.com/api2/questions/?search=${encodeURIComponent(term)}&limit=20&status=open&order_by=-forecasters_count`,
          {
            headers: { 'User-Agent': 'MarketPlayMaker/2.0' },
            signal: AbortSignal.timeout(10000),
          }
        );

        if (!resp.ok) continue;
        const data = await resp.json();

        if (data?.results?.length > 0) {
          for (const r of data.results) {
            if (!seenIds.has(r.id)) {
              seenIds.add(r.id);
              allResults.push(r);
            }
          }
        }

        // If we got good results with the short query, no need to try more
        if (allResults.length >= 5) break;
      } catch { /* try next strategy */ }
    }

    if (allResults.length === 0) {
      sourceStats.metaculus.lastError = 'No results from any search strategy';
      return null;
    }

    if (allResults.length > 0) {
      // Score matches by keyword overlap AND forecaster count for best quality
      const effectiveSearch = originalQuestion || searchTerm;
      const searchWords = effectiveSearch.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
      let bestMatch = null;
      let bestScore = -1;

      for (const q of allResults) {
        const title = (q.title || '').toLowerCase();
        const keywordScore = searchWords.filter(w => title.includes(w)).length;
        const hasAgg = !!(q.question?.aggregations?.recency_weighted?.latest?.centers?.[0] != null);
        const forecasterBonus = Math.min((q.nr_forecasters || 0) / 100, 2);
        // Questions with actual aggregation data get priority
        const score = keywordScore + (hasAgg ? 3 : 0) + forecasterBonus;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = q;
        }
      }

      if (!bestMatch) bestMatch = data.results[0];

      // Metaculus API v2 (2025+): prediction data is in question.aggregations
      // For binary: recency_weighted.latest.centers[0] = YES prob
      // Legacy: community_prediction.full.q2 = median
      let communityPrediction = null;
      const agg = bestMatch.question?.aggregations;
      if (agg?.recency_weighted?.latest?.centers?.[0] != null) {
        communityPrediction = agg.recency_weighted.latest.centers[0];
      } else if (agg?.recency_weighted?.latest?.forecast_values?.[1] != null) {
        communityPrediction = agg.recency_weighted.latest.forecast_values[1]; // [noProb, yesProb]
      } else if (bestMatch.community_prediction?.full?.q2 != null) {
        communityPrediction = bestMatch.community_prediction.full.q2; // Legacy API shape
      }

      const forecasterCount = bestMatch.nr_forecasters ||
        agg?.recency_weighted?.latest?.forecaster_count ||
        bestMatch.number_of_predictions || 0;

      if (communityPrediction != null) {
        // ─── LLM Match Validation ──────────────────────────────────
        // Verify the match is semantically correct before using it
        let matchValidation = { isMatch: true, matchQuality: 1.0, reason: 'No validation available' };
        const llm = getLLM();
        if (llm?.isConfigured() && originalQuestion && bestMatch.title) {
          try {
            matchValidation = await llm.validateMatch(originalQuestion, bestMatch.title, 'Metaculus');
          } catch (err) {
            log.warn('POLLING', `Match validation failed: ${err.message}`);
          }
        }

        // Reject matches below quality threshold
        if (matchValidation.matchQuality < 0.35) {
          log.info('POLLING', `❌ Rejected Metaculus match: "${bestMatch.title?.slice(0, 50)}" for "${(originalQuestion || searchTerm).slice(0, 50)}" (quality: ${matchValidation.matchQuality}, reason: ${matchValidation.reason})`);
          return null;
        }

        sourceStats.metaculus.successes++;
        sourceStats.metaculus.lastSuccess = new Date().toISOString();
        sourceStats.metaculus.lastError = null;
        return {
          source: 'Metaculus',
          type: 'crowd_forecast',
          question: bestMatch.title,
          communityMedian: communityPrediction,
          forecasterCount,
          url: `https://www.metaculus.com${bestMatch.page_url || '/questions/' + (bestMatch.id || '')}`,
          resolution_criteria: bestMatch.question?.resolution_criteria?.slice(0, 200) || bestMatch.resolution_criteria?.slice(0, 200),
          matchScore: bestScore,
          matchQuality: matchValidation.matchQuality,
          matchReason: matchValidation.reason,
          matchValidated: matchValidation.matchQuality >= 0.35,
        };
      }
    }
  } catch (err) {
    sourceStats.metaculus.lastError = err.message;
    log.warn('POLLING', `Metaculus fetch failed: ${err.message}`);
  }
  return null;
}

// ─── Wikipedia Search API ────────────────────────────────────────────
/**
 * Uses Wikipedia's SEARCH API (not page-title lookup) to find relevant
 * factual context for a market question. Provides factual grounding
 * to validate or challenge probability assumptions.
 *
 * Returns: { source, type, title, extract, url }
 */
async function fetchWikipediaContext(searchTerm) {
  sourceStats.wikipedia.attempts++;
  try {
    // Use Wikipedia's proper search API — handles natural language well
    const resp = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&srlimit=3&srprop=snippet|timestamp`,
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

      // Get full page summary for richer context
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
        title: best.title,
        extract,
        lastModified: best.timestamp,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(best.title.replace(/ /g, '_'))}`,
      };
    }
  } catch (err) {
    sourceStats.wikipedia.lastError = err.message;
    log.warn('POLLING', `Wikipedia search failed: ${err.message}`);
  }
  return null;
}

// ─── Unified Polling Fetch ───────────────────────────────────────────
/**
 * Fetch independent estimates from all available polling/forecast sources.
 *
 * @param {Object} market - Market with question, category, conditionId
 * @returns {Object} { estimates, consensusProb, sourceCount, divergenceFromMarket }
 */
async function getIndependentEstimates(market) {
  if (!market?.question) return { estimates: [], consensusProb: null, sourceCount: 0 };

  const cacheKey = `poll_${market.conditionId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached, cached: true };
  }

  const question = market.question;
  // Use smart extraction: drop "Will" and "?" but also generate entity-focused terms
  const searchTerm = question.replace(/\?/g, '').replace(/^Will\s+/i, '').trim();
  const estimates = [];

  // Run all fetches in parallel (best effort — any can fail)
  const fetches = [
    // Metaculus — best calibrated public forecaster
    // Pass the original question so multi-strategy search can extract entities
    fetchMetaculusForecast(searchTerm, question).then(r => {
      if (r?.communityMedian != null) {
        estimates.push({
          source: r.source,
          prob: r.communityMedian,
          confidence: r.forecasterCount > 50 ? 'HIGH' : r.forecasterCount > 10 ? 'MEDIUM' : 'LOW',
          detail: `${r.forecasterCount} forecasters, median estimate`,
          url: r.url,
          type: r.type,
          matchQuality: r.matchQuality,
          matchValidated: r.matchValidated,
        });
      }
    }).catch(() => {}),

    // Wikipedia — factual context (not a probability, but grounds analysis)
    fetchWikipediaContext(searchTerm).then(r => {
      if (r?.extract) {
        estimates.push({
          source: r.source,
          prob: null,
          confidence: 'LOW',
          detail: r.extract.slice(0, 200),
          url: r.url,
          type: r.type,
        });
      }
    }).catch(() => {}),
  ];

  await Promise.allSettled(fetches);
  fetchCount += fetches.length;

  // Compute consensus from independent sources (only probability sources)
  const probEstimates = estimates.filter(e => e.prob != null);
  let consensusProb = null;

  if (probEstimates.length > 0) {
    const weights = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    let totalWeight = 0;
    let weightedSum = 0;
    for (const est of probEstimates) {
      const w = weights[est.confidence] || 1;
      weightedSum += est.prob * w;
      totalWeight += w;
    }
    consensusProb = totalWeight > 0 ? Math.round(weightedSum / totalWeight * 1000) / 1000 : null;
  }

  const result = {
    estimates,
    consensusProb,
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
    log.info('POLLING', `"${question?.slice(0, 40)}" → ${probEstimates.length} sources, consensus ${consensusProb != null ? (consensusProb * 100).toFixed(0) + '%' : 'N/A'}`);
  }

  return result;
}

function getCached(conditionId) {
  return cache.get(`poll_${conditionId}`) || null;
}

function getStatus() {
  return {
    cachedEntries: cache.size,
    totalFetches: fetchCount,
    sources: [
      { name: 'Metaculus', status: 'active', description: 'Superforecaster crowd medians — best calibrated public source', stats: sourceStats.metaculus },
      { name: 'Wikipedia', status: 'active', description: 'Factual context & reality grounding', stats: sourceStats.wikipedia },
    ],
    retired: [
      { name: 'PredictIt', reason: 'Shut down Feb 2023 (CFTC)' },
      { name: 'FiveThirtyEight', reason: 'No stable public API' },
      { name: 'RealClearPolitics', reason: 'Undocumented API returns 403' },
    ],
  };
}

module.exports = {
  getIndependentEstimates,
  fetchMetaculusForecast,
  fetchWikipediaContext,
  getCached,
  getStatus,
};
