/**
 * Unified Independent Signal Hub
 *
 * Aggregates ALL independent data sources into a single interface:
 *   - LLM Analysis       (bot/data/llmAnalysis.js)
 *   - Polling Aggregator  (bot/data/pollingAggregator.js)
 *   - Expert Forecasts    (bot/data/expertForecasts.js)
 *
 * This is the module that scanner.js and probabilityModel.js call.
 * It provides ONE consensus probability from TRULY INDEPENDENT sources
 * (i.e., not derived from the market's own price).
 *
 * Directly addresses the audit finding: "edge detection is circular"
 */

const llmAnalysis = require('./llmAnalysis');
const pollingAggregator = require('./pollingAggregator');
const expertForecasts = require('./expertForecasts');
const kalshiCrossRef = require('./kalshiCrossRef');
const bookmakerSignal = require('./bookmakerSignal');
const cryptoData = require('./cryptoData');
const espnData = require('./espnData');
const stockData = require('./stockData');

// Social / cultural signal sources
let youtubeTracker = null;
let twitterTracker = null;
let culturalEvents = null;
try { youtubeTracker = require('./youtubeTracker'); } catch { /* optional */ }
try { twitterTracker = require('./twitterTracker'); } catch { /* optional */ }
try { culturalEvents = require('./culturalEvents'); } catch { /* optional */ }
const { crossPlatformLikelihood } = require('./searchUtils');
const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '../logs/independent-signals.json');
const MAX_HISTORY = 200;

// Source weights for final consensus
// Hard data sources (bookmaker, crypto) get highest weight.
// LLM is demoted — it's useful for coverage but shouldn't drive decisions alone.
const SOURCE_WEIGHTS = {
  espn:      { weight: 0.28, label: 'ESPN Sportsbook Odds' },
  bookmaker: { weight: 0.28, label: 'Bookmaker Consensus (Sharp Lines)' },
  crypto:    { weight: 0.25, label: 'Crypto Market Data' },
  stock:     { weight: 0.25, label: 'Stock/Index Market Data' },
  youtube:   { weight: 0.26, label: 'YouTube View Velocity' },
  twitter:   { weight: 0.26, label: 'Twitter/X Post Tracker' },
  polling:   { weight: 0.18, label: 'Metaculus Superforecasters' },
  expert:    { weight: 0.18, label: 'Manifold Markets' },
  kalshi:    { weight: 0.18, label: 'Kalshi Cross-Reference' },
  llm:       { weight: 0.15, label: 'LLM Analysis' },
};

// History of signals for tracking accuracy over time
let signalHistory = [];
try {
  if (fs.existsSync(HISTORY_FILE)) {
    signalHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')).history || [];
    log.info('INDSIG', `Loaded ${signalHistory.length} historical independent signals`);
  }
} catch { /* fresh start */ }

let _saveQueued = false;
function saveHistory() {
  // Debounce writes — only one write at a time, coalesce rapid calls
  if (_saveQueued) return;
  _saveQueued = true;
  setImmediate(() => {
    _saveQueued = false;
    try {
      fs.writeFileSync(HISTORY_FILE, JSON.stringify({
        history: signalHistory.slice(-MAX_HISTORY),
        savedAt: new Date().toISOString(),
      }, null, 2));
    } catch { /* non-critical */ }
  });
}

/**
 * Get the unified independent probability estimate for a market.
 *
 * This is the main entry point. It:
 * 1. Queries all available independent sources in parallel
 * 2. Computes a weighted consensus probability
 * 3. Measures divergence from the market's own price
 * 4. Returns confidence level and source breakdown
 *
 * @param {Object} market    - { question, conditionId, yesPrice, category, ... }
 * @param {Object} [options] - { skipLLM: false, headlines: [], forceFresh: false }
 * @returns {Object} Independent signal result
 */
async function getIndependentSignal(market, options = {}) {
  if (!market?.question) {
    return { prob: null, confidence: 'NONE', sources: [], sourceCount: 0 };
  }

  const { skipLLM = false, headlines = [], forceFresh = false } = options;
  const results = {};

  // ─── 1. Gather all sources in parallel ───────────────────────────

  const tasks = [];

  // LLM analysis (requires API key to be configured)
  if (!skipLLM && llmAnalysis.getStatus().configured) {
    tasks.push(
      llmAnalysis.analyzeMarket(market, headlines)
        .then(r => {
          if (r?.prob != null) {
            results.llm = {
              prob: r.prob,
              confidence: r.confidence || 'MEDIUM',
              reasoning: r.reasoning,
              source: r.source || `LLM (${llmAnalysis.getStatus().provider})`,
              cached: r.cached || false,
            };
          }
        })
        .catch(err => log.warn('INDSIG', `LLM failed: ${err.message}`))
    );
  }

  // Polling aggregator
  tasks.push(
    pollingAggregator.getIndependentEstimates(market)
      .then(r => {
        if (r?.consensusProb != null) {
          // Extract match quality from estimates
          const metaculusEstimate = r.estimates?.find(e => e.source === 'Metaculus' && e.prob != null);
          results.polling = {
            prob: r.consensusProb,
            confidence: r.estimates?.length > 1 ? 'MEDIUM' : 'LOW',
            sources: r.estimates?.map(e => e.source) || [],
            detail: r.estimates?.map(e => `${e.source}: ${(e.prob * 100).toFixed(0)}%`).join(', '),
            cached: r.cached || false,
            matchQuality: metaculusEstimate?.matchQuality ?? null,
            matchValidated: metaculusEstimate?.matchValidated ?? false,
          };
        }
      })
      .catch(err => log.warn('INDSIG', `Polling failed: ${err.message}`))
  );

  // Expert forecasts
  tasks.push(
    expertForecasts.getExpertEstimates(market)
      .then(r => {
        if (r?.consensusProb != null) {
          const manifoldEstimate = r.estimates?.find(e => e.source === 'Manifold' && e.prob != null);
          results.expert = {
            prob: r.consensusProb,
            confidence: r.sourceCount > 1 ? 'HIGH' : 'MEDIUM',
            sources: r.estimates?.filter(e => e.prob != null).map(e => e.source) || [],
            bestSource: r.bestSource,
            detail: r.estimates?.filter(e => e.prob != null).map(e => `${e.source}: ${(e.prob * 100).toFixed(0)}%`).join(', '),
            cached: r.cached || false,
            matchQuality: manifoldEstimate?.matchQuality ?? null,
            matchValidated: manifoldEstimate?.matchValidated ?? false,
          };
        }
      })
      .catch(err => log.warn('INDSIG', `Expert failed: ${err.message}`))
  );

  // Kalshi cross-reference — uses Kalshi market prices as independent source
  tasks.push(
    kalshiCrossRef.getKalshiCrossPrice(market)
      .then(r => {
        if (r?.prob != null) {
          results.kalshi = {
            prob: r.prob,
            confidence: r.matchQuality >= 0.8 ? 'HIGH' : 'MEDIUM',
            sources: ['Kalshi'],
            detail: `Kalshi ${r.ticker}: ${(r.prob * 100).toFixed(0)}%`,
            cached: r.cached || false,
            matchQuality: r.matchQuality ?? null,
            matchValidated: r.matchValidated ?? false,
            kalshiQuestion: r.kalshiQuestion,
          };
        }
      })
      .catch(err => log.warn('INDSIG', `Kalshi cross-ref failed: ${err.message}`))
  );

  // Bookmaker consensus — sharp sportsbook lines (highest-alpha signal for sports)
  tasks.push(
    bookmakerSignal.getBookmakerSignal(market)
      .then(r => {
        if (r?.prob != null) {
          results.bookmaker = {
            prob: r.prob,
            confidence: r.confidence || 'MEDIUM',
            sources: ['Bookmaker Consensus'],
            detail: r.detail,
            cached: false,
            matchQuality: r.matchQuality ?? 0.8,
            matchValidated: true,
            bookmakerCount: r.bookmakerCount,
            matchedEvent: r.matchedEvent,
            sportKey: r.sportKey,
            type: r.type,
            pinnacleProb: r.pinnacleProb,
          };
        }
      })
      .catch(err => log.warn('INDSIG', `Bookmaker signal failed: ${err.message}`))
  );

  // Crypto market data — real price-based probability (no guessing)
  tasks.push(
    cryptoData.getCryptoSignal(market)
      .then(r => {
        if (r?.prob != null) {
          results.crypto = {
            prob: r.prob,
            confidence: r.confidence || 'MEDIUM',
            sources: ['Crypto Market Data'],
            detail: r.detail,
            cached: false,
            matchQuality: r.matchQuality ?? 0.9,
            matchValidated: true,
            currentPrice: r.currentPrice,
            targetPrice: r.targetPrice,
            direction: r.direction,
            coin: r.coin,
          };
        }
      })
      .catch(err => log.warn('INDSIG', `Crypto data failed: ${err.message}`))
  );

  // ESPN sportsbook odds — FREE real odds from DraftKings via ESPN
  tasks.push(
    espnData.getESPNSignal(market)
      .then(r => {
        if (r?.prob != null) {
          results.espn = {
            prob: r.prob,
            confidence: r.confidence || 'HIGH',
            sources: ['ESPN Sportsbook'],
            detail: r.detail,
            cached: false,
            matchQuality: r.matchQuality ?? 0.9,
            matchValidated: true,
            matchedEvent: r.matchedEvent,
            homeTeam: r.homeTeam,
            awayTeam: r.awayTeam,
            league: r.league,
            provider: r.provider,
            matchType: r.matchType,
          };
        }
      })
      .catch(err => log.warn('INDSIG', `ESPN signal failed: ${err.message}`))
  );

  // Stock/Index market data — real price data for S&P 500, Nasdaq, etc.
  tasks.push(
    stockData.getStockSignal(market)
      .then(r => {
        if (r?.prob != null) {
          results.stock = {
            prob: r.prob,
            confidence: r.confidence || 'MEDIUM',
            sources: ['Stock Market Data'],
            detail: r.detail,
            cached: false,
            matchQuality: r.matchQuality ?? 0.9,
            matchValidated: true,
            currentPrice: r.currentPrice,
            targetPrice: r.targetPrice,
            direction: r.direction,
            symbol: r.symbol,
          };
        }
      })
      .catch(err => log.warn('INDSIG', `Stock data failed: ${err.message}`))
  );

  // YouTube view velocity — real-time view tracking for video markets
  if (youtubeTracker) {
    tasks.push(
      youtubeTracker.getYouTubeSignal(market)
        .then(async r => {
          if (r?.prob != null) {
            // Apply cultural events modifier if available
            let culturalDetail = '';
            if (culturalEvents && r.channel) {
              try {
                const impact = await culturalEvents.getYouTubeImpact(r.channel);
                if (impact.modifier !== 1.0 && r.projectedViews) {
                  r.prob = Math.max(0.02, Math.min(0.98, r.prob * (impact.modifier > 1 ? 1.1 : 0.9)));
                  culturalDetail = ` | Cultural: ${impact.detail}`;
                }
              } catch { /* non-critical */ }
            }
            results.youtube = {
              prob: r.prob,
              confidence: r.confidence || 'MEDIUM',
              sources: ['YouTube View Velocity'],
              detail: (r.detail || '') + culturalDetail,
              cached: false,
              matchQuality: r.matchQuality ?? 0.85,
              matchValidated: r.matchValidated ?? true,
              currentViews: r.currentViews,
              projectedViews: r.projectedViews,
              targetViews: r.targetViews,
              velocity: r.velocity,
              videoId: r.videoId,
            };
          }
        })
        .catch(err => log.warn('INDSIG', `YouTube tracker failed: ${err.message}`))
    );
  }

  // Twitter/X tweet tracker — real-time tweet counting for posting markets
  if (twitterTracker) {
    tasks.push(
      twitterTracker.getTwitterSignal(market)
        .then(async r => {
          if (r?.prob != null) {
            // Apply cultural events modifier for Elon-specific markets
            let culturalDetail = '';
            if (culturalEvents && r.username === 'elonmusk') {
              try {
                const impact = await culturalEvents.getElonTweetImpact();
                if (impact.multiplier !== 1.0) {
                  // Adjust expected tweets by cultural multiplier
                  // Higher multiplier = more tweets expected = higher prob of hitting "over" target
                  const adjustment = impact.multiplier > 1.2 ? 0.08 : impact.multiplier > 1.0 ? 0.04 : -0.05;
                  r.prob = Math.max(0.02, Math.min(0.98, r.prob + adjustment));
                  culturalDetail = ` | Cultural: ${impact.detail}`;
                }
              } catch { /* non-critical */ }
            }
            results.twitter = {
              prob: r.prob,
              confidence: r.confidence || 'MEDIUM',
              sources: ['Twitter/X Post Tracker'],
              detail: (r.detail || '') + culturalDetail,
              cached: false,
              matchQuality: r.matchQuality ?? 0.85,
              matchValidated: r.matchValidated ?? true,
              currentCount: r.currentCount,
              targetCount: r.targetCount,
              username: r.username,
            };
          }
        })
        .catch(err => log.warn('INDSIG', `Twitter tracker failed: ${err.message}`))
    );
  }

  await Promise.allSettled(tasks);

  // ─── 2. Compute weighted consensus ───────────────────────────────

  const availableSources = Object.keys(results);
  if (availableSources.length === 0) {
    return {
      prob: null,
      confidence: 'NONE',
      sources: [],
      sourceCount: 0,
      divergence: null,
      marketPrice: market.yesPrice,
    };
  }

  let totalWeight = 0;
  let weightedSum = 0;
  const sourceBreakdown = [];

  for (const key of availableSources) {
    const sourceConfig = SOURCE_WEIGHTS[key];
    const result = results[key];
    const w = sourceConfig.weight;

    // Confidence multiplier — high confidence sources get full weight
    const confidenceMultiplier =
      result.confidence === 'HIGH' ? 1.0 :
      result.confidence === 'MEDIUM' ? 0.7 :
      0.4;

    const effectiveWeight = w * confidenceMultiplier;
    weightedSum += result.prob * effectiveWeight;
    totalWeight += effectiveWeight;

    sourceBreakdown.push({
      key,
      label: sourceConfig.label,
      prob: result.prob,
      confidence: result.confidence,
      weight: effectiveWeight,
      detail: result.detail || result.reasoning?.slice(0, 100),
      sources: result.sources,
      cached: result.cached,
      matchQuality: result.matchQuality ?? null,
      matchValidated: result.matchValidated ?? (key === 'llm'), // LLM is always "validated"
    });
  }

  const consensusProb = totalWeight > 0
    ? Math.round(weightedSum / totalWeight * 1000) / 1000
    : null;

  // ─── 3. Calculate divergence and edge ────────────────────────────

  const marketPrice = market.yesPrice || market.outcomePrices?.[0];
  const divergence = consensusProb != null && marketPrice != null
    ? Math.round((consensusProb - marketPrice) * 1000) / 1000
    : null;

  // Determine overall confidence
  const avgConfidence = sourceBreakdown.reduce((sum, s) => {
    return sum + (s.confidence === 'HIGH' ? 3 : s.confidence === 'MEDIUM' ? 2 : 1);
  }, 0) / sourceBreakdown.length;

  const overallConfidence =
    avgConfidence >= 2.5 && availableSources.length >= 2 ? 'HIGH' :
    avgConfidence >= 1.5 || availableSources.length >= 2 ? 'MEDIUM' :
    'LOW';

  // Determine if this represents a potential edge
  const absDivergence = Math.abs(divergence || 0);
  const edgeSignal =
    absDivergence >= 0.10 && overallConfidence !== 'LOW' ? 'STRONG' :
    absDivergence >= 0.05 ? 'MODERATE' :
    absDivergence >= 0.02 ? 'WEAK' :
    'NONE';

  // ─── Edge Quality Score (0-100) ──────────────────────────────────
  // Composite score that captures HOW trustworthy this edge signal is.
  // KEY PRINCIPLE: Hard data sources (bookmaker odds, crypto prices) are
  // worth more than soft sources (LLM, weak Metaculus matches).
  // Single-source LLM-only = D grade MAX.

  let edgeQuality = 0;

  // Data source quality tiers
  const HARD_DATA_SOURCES = ['bookmaker', 'crypto', 'espn', 'stock', 'youtube', 'twitter']; // Real market data
  const VALIDATED_SOURCES = ['polling', 'expert', 'kalshi']; // Cross-platform matches
  const SOFT_SOURCES = ['llm']; // AI analysis

  const hardDataCount = sourceBreakdown.filter(s => HARD_DATA_SOURCES.includes(s.key)).length;
  const validatedCount = sourceBreakdown.filter(s => VALIDATED_SOURCES.includes(s.key) && s.matchValidated).length;
  const softCount = sourceBreakdown.filter(s => SOFT_SOURCES.includes(s.key)).length;

  // Factor 1: Source diversity & quality (0-40 points)
  const validatedSourceCount = hardDataCount + validatedCount + softCount;
  
  // Hard data source present = instant credibility boost
  if (hardDataCount >= 1) edgeQuality += 20;
  if (hardDataCount >= 2) edgeQuality += 8; // Both bookmaker + crypto

  // Additional validated sources compound
  if (validatedCount >= 1) edgeQuality += 8;
  if (validatedCount >= 2) edgeQuality += 5;

  // LLM-only gets minimal credit (the whole point of the redesign)
  if (hardDataCount === 0 && validatedCount === 0 && softCount >= 1) {
    edgeQuality += 8; // LLM-only: 8 points max from sources
  } else if (softCount >= 1) {
    edgeQuality += 4; // LLM as supplementary source
  }

  // Factor 2: Match quality average from real data sources (0-25 points)
  // Hard data sources (bookmaker, crypto) get near-perfect match quality.
  // LLM-only edges get ZERO match quality credit.
  const matchQualities = sourceBreakdown
    .filter(s => s.matchQuality != null && s.key !== 'llm')
    .map(s => s.matchQuality);
  if (matchQualities.length > 0) {
    const avgMatchQuality = matchQualities.reduce((a, b) => a + b, 0) / matchQualities.length;
    edgeQuality += Math.round(avgMatchQuality * 25);
  }

  // Factor 3: Source agreement — do sources converge? (0-25 points)
  // Requires 2+ sources that provide probabilities
  if (availableSources.length >= 2) {
    const probs = sourceBreakdown.filter(s => s.prob != null).map(s => s.prob);
    if (probs.length >= 2) {
      const maxDiff = Math.max(...probs) - Math.min(...probs);
      const agreement = 1 - Math.min(maxDiff / 0.3, 1); // 0.3+ divergence = 0 agreement
      edgeQuality += Math.round(agreement * 25);
    }
  }
  // Single source gets ZERO agreement points

  // Factor 4: Overall confidence (0-15 points)
  edgeQuality += overallConfidence === 'HIGH' ? 15 :
                 overallConfidence === 'MEDIUM' ? 8 : 3;

  edgeQuality = Math.min(100, Math.max(0, edgeQuality));

  // Override: if ALL external sources have matchQuality < 0.5, cap quality at 30
  const allExternalLowQuality = sourceBreakdown
    .filter(s => s.key !== 'llm' && s.matchQuality != null)
    .every(s => s.matchQuality < 0.5);
  if (allExternalLowQuality && sourceBreakdown.some(s => s.key !== 'llm' && s.matchQuality != null)) {
    edgeQuality = Math.min(edgeQuality, 30);
  }

  // ─── Long-Tail Market Protection ────────────────────────────────
  // Markets trading at extreme prices (<5% or >95%) have strong market
  // consensus. Declaring a huge edge against extreme consensus requires
  // extraordinary evidence (hard data from 2+ validated sources).
  // Without that, the "edge" is almost certainly model error.
  const isExtremeLowPrice = marketPrice != null && marketPrice < 0.05;
  const isExtremeHighPrice = marketPrice != null && marketPrice > 0.95;
  const isExtremeMarket = isExtremeLowPrice || isExtremeHighPrice;

  if (isExtremeMarket) {
    // For extreme markets, require hard data to declare any edge
    if (hardDataCount === 0) {
      // LLM/soft sources can't override strong market consensus on long-tail events
      edgeQuality = Math.min(edgeQuality, 15);
    } else if (hardDataCount === 1 && validatedCount === 0) {
      // Single hard source on extreme market = still risky
      edgeQuality = Math.min(edgeQuality, 35);
    }
    // Also dampen the divergence to prevent 20%+ "edges" on 1% markets
    // unless we have extraordinary hard data evidence
    if (hardDataCount < 2 && absDivergence > 0.15) {
      // Clamp effective divergence for grading purposes
      edgeQuality = Math.min(edgeQuality, 25);
    }
  }

  // ─── LLM-Only Divergence Clamp ──────────────────────────────────
  // If the ONLY source is LLM, clamp max edge quality AND limit
  // divergence impact. LLM is structured guessing, not evidence.
  if (hardDataCount === 0 && validatedCount === 0 && softCount >= 1) {
    edgeQuality = Math.min(edgeQuality, 20); // D grade max for LLM-only
  }

  // Determine edge grade
  const edgeGrade =
    edgeQuality >= 75 ? 'A' :
    edgeQuality >= 55 ? 'B' :
    edgeQuality >= 35 ? 'C' :
    'D';

  // ─── 4. Build result ────────────────────────────────────────────

  const signal = {
    prob: consensusProb,
    confidence: overallConfidence,
    sourceCount: availableSources.length,
    sources: sourceBreakdown,

    // Edge analysis
    marketPrice,
    divergence,
    absDivergence,
    edgeSignal,
    edgeDirection: divergence > 0 ? 'BUY_YES' : divergence < 0 ? 'BUY_NO' : null,

    // Quality scoring
    edgeQuality,
    edgeGrade,
    validatedSourceCount,

    // Metadata
    conditionId: market.conditionId,
    question: market.question?.slice(0, 100),
    timestamp: Date.now(),
    fetchedAt: new Date().toISOString(),
  };

  // ─── 5. Record history for accuracy tracking ────────────────────

  signalHistory.push({
    conditionId: market.conditionId,
    question: market.question?.slice(0, 100),
    prob: consensusProb,
    marketPrice,
    divergence,
    edgeSignal,
    edgeQuality,
    edgeGrade,
    sourceCount: availableSources.length,
    validatedSourceCount,
    timestamp: Date.now(),
  });

  if (signalHistory.length > MAX_HISTORY) {
    signalHistory = signalHistory.slice(-MAX_HISTORY);
  }
  saveHistory();

  // Log significant divergences
  if (edgeSignal === 'STRONG') {
    log.info('INDSIG',
      `🎯 STRONG edge [${edgeGrade}] on "${market.question?.slice(0, 40)}": ` +
      `Independent ${(consensusProb * 100).toFixed(0)}% vs Market ${(marketPrice * 100).toFixed(0)}% ` +
      `(${divergence > 0 ? '+' : ''}${(divergence * 100).toFixed(1)}pp from ${availableSources.length} sources, quality: ${edgeQuality}/100)`
    );
  } else if (edgeSignal === 'MODERATE') {
    log.info('INDSIG',
      `📊 Moderate edge [${edgeGrade}]: "${market.question?.slice(0, 40)}" ` +
      `Independent ${(consensusProb * 100).toFixed(0)}% vs Market ${(marketPrice * 100).toFixed(0)}% (quality: ${edgeQuality}/100)`
    );
  }

  return signal;
}

/**
 * Batch process multiple markets through the independent signal pipeline.
 * Used by scanner.js during scan cycles.
 *
 * @param {Array} markets   - Array of market objects
 * @param {Object} options  - { maxMarkets, headlines, skipLLM }
 * @returns {Map} conditionId → signal results
 */
async function batchAnalyze(markets, options = {}) {
  const { maxMarkets = 30, headlines = [], skipLLM = false } = options;

  // ─── Pre-filter: remove junk markets before wasting API calls ────
  const quality = markets.filter(m => {
    // Must have a question
    if (!m.question) return false;
    // Skip extreme penny markets (< 2% or > 98%) — no actionable edge
    const price = m.yesPrice ?? 0.5;
    if (price < 0.02 || price > 0.98) return false;
    // Skip very low volume (< $1K total) — illiquid, can't trade
    const vol = m.volume || m.volumeNum || 0;
    if (vol > 0 && vol < 1000) return false;
    // Skip markets expiring > 1 year from now — too speculative
    if (m.endDate) {
      const msToExpiry = new Date(m.endDate).getTime() - Date.now();
      if (msToExpiry > 365 * 86400000) return false;
    }
    // NEW: Skip far-future nomination/primary markets (2027+)
    const q = m.question || '';
    if (/202[89]|203\d/.test(q) && /nominat|primary|caucus/i.test(q)) return false;
    return true;
  });

  // ─── Smart Prioritization ───────────────────────────────────────
  // Instead of sorting purely by volume (which sends 2028 presidential
  // markets to the top), use a composite score that rewards:
  //   1. Cross-platform match likelihood (do Metaculus/Manifold/Kalshi have this?)
  //   2. Near-term resolution (more actionable, more verifiable)
  //   3. Volume (liquidity for trading)
  //   4. Price between 15-85% (more room for edge)

  const scored = quality.map(m => {
    let priorityScore = 0;

    // Cross-platform match likelihood (0-1, ×40 weight — most important)
    const crossPlatform = crossPlatformLikelihood(m);
    priorityScore += crossPlatform * 40;

    // Volume score (log scale, ×20 weight)
    const vol = m.volume || m.volumeNum || 0;
    priorityScore += Math.min(20, Math.log10(Math.max(vol, 1)) * 4);

    // Resolution date score (nearer = better, ×25 weight)
    if (m.endDate) {
      const daysOut = (new Date(m.endDate).getTime() - Date.now()) / 86400000;
      if (daysOut <= 7) priorityScore += 25;
      else if (daysOut <= 30) priorityScore += 22;
      else if (daysOut <= 90) priorityScore += 18;
      else if (daysOut <= 180) priorityScore += 12;
      else if (daysOut <= 365) priorityScore += 5;
    } else {
      priorityScore += 10; // Unknown date gets middle score
    }

    // Price range score (15-85% has most edge potential, ×15 weight)
    const price = m.yesPrice ?? 0.5;
    const distFromCenter = Math.abs(price - 0.5);
    priorityScore += (1 - distFromCenter * 2) * 15; // 50% = 15pts, 15%/85% = 4.5pts

    return { market: m, priorityScore, crossPlatform };
  });

  // Sort by composite priority score
  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  // ─── Category diversity: don't let one topic dominate ────────────
  // Derive category from question when Polymarket doesn't provide one
  const toProcess = [];
  const categoryCount = {};
  const MAX_PER_CATEGORY = Math.ceil(maxMarkets * 0.4); // Max 40% from one category

  for (const { market, priorityScore, crossPlatform } of scored) {
    if (toProcess.length >= maxMarkets) break;

    // Derive category from question text since Polymarket often doesn't categorize
    const q = (market.question || '').toLowerCase();
    let category = (market.category || '').toLowerCase();
    if (!category || category === 'unknown') {
      if (/bitcoin|btc|ethereum|eth|solana|crypto|dogecoin|xrp/i.test(q)) category = 'crypto';
      else if (/nba|nfl|nhl|mlb|ufc|premier league|champions league|stanley cup|win on \d/i.test(q)) category = 'sports';
      else if (/trump|biden|election|congress|senate|tariff|sanction/i.test(q)) category = 'politics';
      else if (/gdp|inflation|interest rate|fed|recession|economic/i.test(q)) category = 'economics';
      else if (/olympics|gold medal|medal/i.test(q)) category = 'olympics';
      else if (/youtube|video|views|mrbeast|pewdiepie|subscriber|upload/i.test(q)) category = 'youtube';
      else if (/tweet|twitter|elon.*post|post.*on x|x\.com/i.test(q)) category = 'twitter';
      else category = 'other';
    }

    const count = categoryCount[category] || 0;
    if (count >= MAX_PER_CATEGORY) continue;

    categoryCount[category] = count + 1;
    toProcess.push(market);
  }
  const results = new Map();

  log.info('INDSIG', `Batch analyzing ${toProcess.length} markets for independent signals...`);

  // Process in batches of 5 to avoid overwhelming APIs
  const batchSize = 5;
  for (let i = 0; i < toProcess.length; i += batchSize) {
    const batch = toProcess.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(m => getIndependentSignal(m, { skipLLM, headlines }))
    );

    for (let j = 0; j < batch.length; j++) {
      const result = batchResults[j];
      if (result.status === 'fulfilled' && result.value.prob != null) {
        results.set(batch[j].conditionId, result.value);
      }
    }
  }

  // Summarize
  const edges = [...results.values()].filter(r => r.edgeSignal === 'STRONG' || r.edgeSignal === 'MODERATE');
  log.info('INDSIG', `Batch complete: ${results.size} analyzed, ${edges.length} potential edges found`);

  return results;
}

/**
 * Get a summary of the independent signal system status.
 */
function getStatus() {
  return {
    llm: llmAnalysis.getStatus(),
    polling: pollingAggregator.getStatus(),
    expert: expertForecasts.getStatus(),
    kalshi: kalshiCrossRef.getStatus(),
    bookmaker: bookmakerSignal.getStatus(),
    crypto: cryptoData.getStatus(),
    espn: espnData.getStatus(),
    stock: stockData.getStatus(),
    youtube: youtubeTracker ? youtubeTracker.getStatus() : { available: false },
    twitter: twitterTracker ? twitterTracker.getStatus() : { available: false },
    culturalEvents: culturalEvents ? culturalEvents.getStatus() : { available: false },
    history: {
      total: signalHistory.length,
      last24h: signalHistory.filter(s => Date.now() - s.timestamp < 86400000).length,
      strongEdges: signalHistory.filter(s => s.edgeSignal === 'STRONG').length,
    },
    sourceWeights: SOURCE_WEIGHTS,
  };
}

/**
 * Get recent edge opportunities from history.
 * Deduplicates by conditionId — keeps only the most recent signal per market.
 */
function getRecentEdges(limit = 10) {
  const seen = new Set();
  const deduped = [];
  // Walk backwards (most recent first) so the first occurrence per conditionId wins
  for (let i = signalHistory.length - 1; i >= 0; i--) {
    const s = signalHistory[i];
    if (s.edgeSignal !== 'STRONG' && s.edgeSignal !== 'MODERATE') continue;
    if (seen.has(s.conditionId)) continue;
    seen.add(s.conditionId);
    deduped.push(s);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

/**
 * Calculate accuracy of past signals against resolved markets.
 * Called by the signal tracker to validate independent source quality.
 */
function getCalibrationData() {
  // Group signals by probability bucket for calibration analysis
  const buckets = {};
  for (const sig of signalHistory) {
    if (sig.prob == null) continue;
    const bucket = Math.round(sig.prob * 10) / 10; // 0.0, 0.1, ..., 1.0
    if (!buckets[bucket]) buckets[bucket] = { predicted: bucket, count: 0, signals: [] };
    buckets[bucket].count++;
    buckets[bucket].signals.push(sig);
  }

  return {
    buckets: Object.values(buckets),
    totalSignals: signalHistory.length,
    averageDivergence: signalHistory.length > 0
      ? Math.round(signalHistory.reduce((sum, s) => sum + Math.abs(s.divergence || 0), 0) / signalHistory.length * 1000) / 1000
      : null,
  };
}

module.exports = {
  getIndependentSignal,
  batchAnalyze,
  getStatus,
  getRecentEdges,
  getCalibrationData,

  // Re-export sub-modules for direct access
  llm: llmAnalysis,
  polling: pollingAggregator,
  expert: expertForecasts,
  kalshi: kalshiCrossRef,
  bookmaker: bookmakerSignal,
  crypto: cryptoData,
  youtube: youtubeTracker,
  twitter: twitterTracker,
  culturalEvents,
};
