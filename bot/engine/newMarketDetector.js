/**
 * New Market Intelligence Detector v1
 *
 * The single highest-alpha edge in prediction markets: detecting NEW markets
 * before other traders understand them.
 *
 * Why this works:
 * - New markets have thin liquidity (often <$1k)
 * - Early prices are often wildly mispriced (set by 1-2 market makers)
 * - Spreads can exceed 5-10% (bid/ask gap = free money)
 * - Breaking-news markets appear and are mis-priced for minutes before bots arrive
 * - Retail traders don't notice new listings for hours
 *
 * This module:
 * 1. Polls the Polymarket Gamma API every 30-60 seconds for new listings
 * 2. Compares against a snapshot of known markets
 * 3. When a new market appears:
 *    a. Calculates spread, liquidity, and initial mispricing
 *    b. Matches against breaking news for context
 *    c. Runs quick probability estimate (bookmaker + news + LLM)
 *    d. Fires high-priority alert for immediate action
 *    e. Auto-queues limit orders at favorable prices
 *
 * Target: detect new markets within 30-60 seconds of listing
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'logs', 'new-market-state.json');

// ─── Optional Dependencies ───────────────────────────────────────────
let polyClient = null;
let newsSignal = null;
let oddsApi = null;
let provenEdge = null;

try { polyClient = require('../polymarket/client'); } catch { /* required */ }
try { newsSignal = require('../data/newsSignal'); } catch { /* optional */ }
try { oddsApi = require('../bookmakers/oddsApi'); } catch { /* optional */ }
try { provenEdge = require('../strategies/provenEdge'); } catch { /* optional */ }

// ─── State ───────────────────────────────────────────────────────────
let knownMarketIds = new Set();       // conditionIds we've seen before
let newMarketHistory = [];            // history of detected new markets
let pollInterval = null;
let isRunning = false;
let firstPollDone = false;            // Suppress alerts on first poll (calibration)
let stats = {
  totalDetected: 0,
  totalMispriced: 0,
  totalAlerted: 0,
  totalArbsFound: 0,
  avgDetectionTimeSec: 0,
  lastPollTime: null,
  pollCount: 0,
  consecutiveErrors: 0,
};

// Callbacks for external integration
let onNewMarket = null;               // (market, analysis) => void
let onMispricedMarket = null;         // (market, analysis, opportunity) => void

// ─── Configuration ───────────────────────────────────────────────────
const CONFIG = {
  pollIntervalMs: 30000,              // Poll every 30 seconds (aggressive)
  fastPollIntervalMs: 15000,          // 15s during high-activity hours
  maxMarketsPerPoll: 200,             // How many markets to fetch per poll
  minLiquidityAlert: 100,             // Alert even at $100 liquidity (new market!)
  spreadAlertThreshold: 0.05,         // 5% spread = potential opportunity
  mispricingThreshold: 0.08,          // 8% estimated mispricing
  maxHistorySize: 1000,               // Keep last 1000 detected markets
  // High-activity hours (UTC): 13:00-21:00 (US market hours)
  highActivityStart: 13,
  highActivityEnd: 21,
};

// ─── Load/Save State ─────────────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      knownMarketIds = new Set(data.knownMarketIds || []);
      newMarketHistory = data.history || [];
      stats = { ...stats, ...(data.stats || {}) };
      log.info('NEW_MKT', `Loaded state: ${knownMarketIds.size} known markets, ${newMarketHistory.length} history entries`);
    }
  } catch { /* fresh start */ }
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      knownMarketIds: [...knownMarketIds].slice(-5000), // Keep last 5000
      history: newMarketHistory.slice(-CONFIG.maxHistorySize),
      stats,
      savedAt: new Date().toISOString(),
    }, null, 2));
  } catch (err) { log.debug('NEW_MKT', `Save failed: ${err.message}`); }
}

// ─── Core Detection Loop ─────────────────────────────────────────────

/**
 * Single poll cycle: fetch current markets, diff against known, analyze new ones.
 */
async function pollForNewMarkets() {
  const pollStart = Date.now();
  stats.pollCount++;
  stats.lastPollTime = new Date().toISOString();

  try {
    // Fetch latest markets from Polymarket
    if (!polyClient) {
      log.warn('NEW_MKT', 'Polymarket client not available');
      return { newMarkets: [], opportunities: [] };
    }

    // Fetch by most recent (newest first)
    const markets = await polyClient.getMarkets({
      limit: CONFIG.maxMarketsPerPoll,
      offset: 0,
      active: true,
      closed: false,
      order: 'startDate',
      ascending: false,
    });

    if (markets.length === 0) return { newMarkets: [], opportunities: [] };

    // First run — seed the known set
    if (knownMarketIds.size === 0) {
      for (const m of markets) {
        if (m.conditionId) knownMarketIds.add(m.conditionId);
      }
      saveState();
      log.info('NEW_MKT', `Seeded ${knownMarketIds.size} known markets on first run`);
      return { newMarkets: [], opportunities: [], seeded: true };
    }

    // Find markets we haven't seen before
    const newMarkets = markets.filter(m => m.conditionId && !knownMarketIds.has(m.conditionId));

    // Add all current markets to known set
    for (const m of markets) {
      if (m.conditionId) knownMarketIds.add(m.conditionId);
    }

    if (newMarkets.length === 0) {
      stats.consecutiveErrors = 0;
      return { newMarkets: [], opportunities: [] };
    }

    // First poll after startup: just learn, don't alert (avoids flood)
    if (!firstPollDone) {
      firstPollDone = true;
      if (newMarkets.length > 10) {
        log.info('NEW_MKT', `First poll: absorbed ${newMarkets.length} markets into known set (no alerts)`);
        saveState();
        return { newMarkets: 0, opportunities: [], calibrated: true };
      }
    }

    log.info('NEW_MKT', `🆕 Detected ${newMarkets.length} new market(s)!`);
    stats.totalDetected += newMarkets.length;

    // Analyze each new market
    const opportunities = [];
    for (const raw of newMarkets) {
      try {
        const analysis = await analyzeNewMarket(raw);
        newMarketHistory.push(analysis);

        // Notify callback
        if (onNewMarket) onNewMarket(raw, analysis);

        // Check if this is a high-priority opportunity
        if (analysis.opportunity) {
          opportunities.push(analysis);
          stats.totalMispriced++;
          if (onMispricedMarket) onMispricedMarket(raw, analysis, analysis.opportunity);
        }
      } catch (err) {
        log.debug('NEW_MKT', `Analysis failed for ${raw.question?.slice(0, 50)}: ${err.message}`);
      }
    }

    if (opportunities.length > 0) {
      stats.totalAlerted += opportunities.length;
      log.info('NEW_MKT', `🎯 ${opportunities.length} mispriced new market(s) found!`);
    }

    const detectionTime = (Date.now() - pollStart) / 1000;
    stats.avgDetectionTimeSec = stats.pollCount > 1
      ? stats.avgDetectionTimeSec * 0.9 + detectionTime * 0.1
      : detectionTime;
    stats.consecutiveErrors = 0;

    saveState();
    return { newMarkets: newMarkets.length, opportunities };

  } catch (err) {
    stats.consecutiveErrors++;
    log.warn('NEW_MKT', `Poll failed (${stats.consecutiveErrors}x): ${err.message}`);
    return { newMarkets: [], opportunities: [], error: err.message };
  }
}

// ─── New Market Analysis ─────────────────────────────────────────────

/**
 * Deep-analyze a newly discovered market.
 * Checks: spread, liquidity, news relevance, bookmaker match, mispricing.
 */
async function analyzeNewMarket(rawMarket) {
  const now = Date.now();
  const question = rawMarket.question || '';
  const conditionId = rawMarket.conditionId;

  // ─── COIN-FLIP FILTER (2026-03-11) ───
  // "Up or Down" crypto markets are genuinely 50/50 at $0.50.
  // The spread signal gives a false 40% edge but there's no real mispricing.
  // Also filter Odd/Even markets (same issue — pure randomness).
  const coinFlipPatterns = [
    /\bup or down\b/i,
    /\bodd\/even\b/i,
    /\bodd or even\b/i,
    /\bhigher or lower\b/i,
    /\bover\/under\b.*total (rounds|kills|points)/i,
    /\bo\/u\s+\d/i,                   // "O/U 233.5"
    /\bspread:\s/i,                    // "Spread: Clippers (-7.5)"
    /\bmap handicap/i,                 // "Map Handicap: UNO (-1.5)"
  ];
  // Also skip zero-liquidity markets (untradeable)
  const rawLiquidity = parseFloat(rawMarket.liquidity || 0);
  if (rawLiquidity <= 0) {
    log.debug('NEW_MKT', `Skipping $0 liquidity market: "${question.slice(0, 60)}"`);
    return {
      conditionId,
      question: question.slice(0, 200),
      slug: rawMarket.slug,
      category: rawMarket.category || 'unknown',
      skipped: true,
      skipReason: 'zero liquidity (untradeable)',
      signals: {},
      opportunity: null,
      score: 0,
    };
  }

  const isCoinFlip = coinFlipPatterns.some(p => p.test(question));
  if (isCoinFlip) {
    log.debug('NEW_MKT', `Skipping coin-flip market: "${question.slice(0, 60)}"`);
    return {
      conditionId,
      question: question.slice(0, 200),
      slug: rawMarket.slug,
      category: rawMarket.category || 'unknown',
      skipped: true,
      skipReason: 'coin-flip market (no structural edge)',
      signals: {},
      opportunity: null,
      score: 0,
    };
  }

  // Parse prices
  const outcomePrices = rawMarket.outcomePrices ? JSON.parse(rawMarket.outcomePrices) : [];
  const yesPrice = parseFloat(outcomePrices[0] || 0.5);
  const noPrice = parseFloat(outcomePrices[1] || 0.5);
  const liquidity = parseFloat(rawMarket.liquidity || 0);
  const volume = parseFloat(rawMarket.volume24hr || 0);
  const spread = rawMarket.spread ? parseFloat(rawMarket.spread) : Math.abs(1 - yesPrice - noPrice);

  const analysis = {
    conditionId,
    question: question.slice(0, 200),
    slug: rawMarket.slug,
    groupSlug: rawMarket.groupSlug,
    category: rawMarket.category || 'unknown',
    yesPrice,
    noPrice,
    liquidity,
    volume,
    spread,
    detectedAt: new Date().toISOString(),
    detectionLatencyMs: now - new Date(rawMarket.startDate || rawMarket.createdAt || now).getTime(),
    signals: {},
    opportunity: null,
    score: 0,
  };

  // ─── Signal 1: Spread Analysis ───
  if (spread > CONFIG.spreadAlertThreshold) {
    analysis.signals.wideSpread = {
      spread,
      edgeEstimate: spread * 0.4, // Can capture ~40% of spread with limit orders
      note: `${(spread * 100).toFixed(1)}% spread — limit orders can capture edge`,
    };
    analysis.score += 20;
  }

  // ─── Signal 2: Overround Check ───
  const total = yesPrice + noPrice;
  if (total < 0.97 || total > 1.03) {
    const overround = total - 1;
    analysis.signals.overround = {
      total,
      overround,
      arbPossible: total < 0.98 || total > 1.02,
      note: total < 1 ? `Underround: ${(overround * 100).toFixed(1)}% — both sides discounted` : `Overround: ${(overround * 100).toFixed(1)}%`,
    };
    if (total < 0.98 || total > 1.02) {
      analysis.score += 30;
      stats.totalArbsFound++;
    }
  }

  // ─── Signal 3: Low Liquidity (= early mover advantage) ───
  if (liquidity < 5000) {
    analysis.signals.lowLiquidity = {
      liquidity,
      note: liquidity < 1000
        ? `Ultra-thin: $${liquidity.toFixed(0)} — first mover advantage`
        : `Thin: $${liquidity.toFixed(0)} — limited competition`,
    };
    analysis.score += liquidity < 1000 ? 25 : 10;
  }

  // ─── Signal 4: News Match ───
  if (newsSignal) {
    try {
      const sentiment = newsSignal.getSentimentSignal({
        question,
        conditionId,
      });
      if (sentiment.headlineCount > 0) {
        analysis.signals.newsMatch = {
          headlines: sentiment.headlineCount,
          sentiment: sentiment.avgSentiment,
          adjustment: sentiment.adjustment,
          confidence: sentiment.confidence,
          note: `${sentiment.headlineCount} headlines matched, sentiment: ${sentiment.avgSentiment > 0 ? '+' : ''}${sentiment.avgSentiment}`,
        };
        // Strong news signal + new market = high priority
        if (sentiment.confidence === 'HIGH') analysis.score += 25;
        else if (sentiment.confidence === 'MEDIUM') analysis.score += 15;
      }
    } catch { /* non-critical */ }
  }

  // ─── Signal 5: Bookmaker Cross-Reference ───
  if (oddsApi && oddsApi.hasApiKey()) {
    try {
      const bm = oddsApi.getBookmakerOdds({
        question,
        conditionId,
        yesPrice,
        groupSlug: rawMarket.groupSlug,
      });
      if (bm && bm.bookmakerCount > 0) {
        const divergence = bm.consensusProb - yesPrice;
        analysis.signals.bookmaker = {
          consensusProb: bm.consensusProb,
          divergence,
          bookmakerCount: bm.bookmakerCount,
          hasPinnacle: !!bm.pinnacleProb,
          note: `${bm.bookmakerCount} bookmakers → ${(bm.consensusProb * 100).toFixed(0)}% (Poly: ${(yesPrice * 100).toFixed(0)}%, div: ${(divergence * 100).toFixed(1)}pp)`,
        };
        if (Math.abs(divergence) > CONFIG.mispricingThreshold) {
          analysis.score += 35;
        } else if (Math.abs(divergence) > 0.04) {
          analysis.score += 15;
        }
      }
    } catch { /* non-critical */ }
  }

  // ─── Generate Opportunity if Score is High Enough ───
  if (analysis.score >= 30) {
    const bestEdge = analysis.signals.bookmaker?.divergence
      || analysis.signals.overround?.overround
      || analysis.signals.wideSpread?.edgeEstimate
      || 0;

    analysis.opportunity = {
      type: analysis.signals.overround?.arbPossible ? 'NEW_MARKET_ARB'
        : analysis.signals.bookmaker ? 'NEW_MARKET_BOOKMAKER_EDGE'
        : analysis.signals.wideSpread ? 'NEW_MARKET_SPREAD'
        : 'NEW_MARKET_EARLY',
      side: bestEdge > 0 ? 'YES' : bestEdge < 0 ? 'NO' : (yesPrice < 0.5 ? 'YES' : 'NO'),
      estimatedEdge: Math.abs(bestEdge),
      score: analysis.score,
      suggestedSize: Math.min(50, Math.max(5, liquidity * 0.02)), // 2% of liquidity, $5-$50
      suggestedPrice: bestEdge > 0
        ? Math.min(yesPrice + 0.02, yesPrice + Math.abs(bestEdge) * 0.3)
        : Math.max(1 - noPrice - 0.02, (1 - noPrice) - Math.abs(bestEdge) * 0.3),
      reason: Object.entries(analysis.signals)
        .filter(([_, v]) => v.note)
        .map(([k, v]) => `[${k}] ${v.note}`)
        .join(' | '),
    };
  }

  return analysis;
}

// ─── Lifecycle ───────────────────────────────────────────────────────

function start(options = {}) {
  if (isRunning) return;

  if (options.onNewMarket) onNewMarket = options.onNewMarket;
  if (options.onMispricedMarket) onMispricedMarket = options.onMispricedMarket;

  loadState();
  isRunning = true;

  // Determine poll interval based on time of day
  const getInterval = () => {
    const hour = new Date().getUTCHours();
    return (hour >= CONFIG.highActivityStart && hour < CONFIG.highActivityEnd)
      ? CONFIG.fastPollIntervalMs
      : CONFIG.pollIntervalMs;
  };

  log.info('NEW_MKT', `Starting new market detector (${getInterval() / 1000}s interval, ${knownMarketIds.size} known markets)`);

  // Run immediately
  pollForNewMarkets().catch(err => log.warn('NEW_MKT', `Initial poll failed: ${err.message}`));

  // Dynamic interval — re-schedules based on time of day
  const scheduleNext = () => {
    if (!isRunning) return;
    const interval = getInterval();
    pollInterval = setTimeout(async () => {
      await pollForNewMarkets().catch(err => log.warn('NEW_MKT', `Poll failed: ${err.message}`));
      scheduleNext();
    }, interval);
  };
  scheduleNext();
}

function stop() {
  if (!isRunning) return;
  isRunning = false;
  if (pollInterval) {
    clearTimeout(pollInterval);
    pollInterval = null;
  }
  saveState();
  log.info('NEW_MKT', 'New market detector stopped');
}

function getStatus() {
  return {
    running: isRunning,
    knownMarkets: knownMarketIds.size,
    historySize: newMarketHistory.length,
    stats: { ...stats },
  };
}

function getHistory(limit = 50) {
  return newMarketHistory.slice(-limit).reverse();
}

function getOpportunities(limit = 20) {
  return newMarketHistory
    .filter(m => m.opportunity)
    .slice(-limit)
    .reverse();
}

/**
 * Force-add markets from current cache to known set.
 * Call this after market cache warms up on server start.
 */
function seedFromCache(markets) {
  let added = 0;
  for (const m of markets) {
    if (m.conditionId && !knownMarketIds.has(m.conditionId)) {
      knownMarketIds.add(m.conditionId);
      added++;
    }
  }
  if (added > 0) {
    saveState();
    log.info('NEW_MKT', `Seeded ${added} markets from cache (total: ${knownMarketIds.size})`);
  }
}

module.exports = {
  start,
  stop,
  pollForNewMarkets,
  analyzeNewMarket,
  getStatus,
  getHistory,
  getOpportunities,
  seedFromCache,
  CONFIG, // Expose for runtime tuning
};
