/**
 * Rapid News Reactor v1
 *
 * The news latency edge: when breaking news drops, prediction markets lag
 * by seconds to minutes. This module closes that gap.
 *
 * Architecture:
 * - Polls multiple free news sources every 30-60 seconds (not 15 min!)
 * - Maintains a rolling window of recent headlines with dedup
 * - On NEW headline detection:
 *   1. Instantly matches against all active Polymarket markets
 *   2. Scores headline strength (breaking > analysis > opinion)
 *   3. Estimates directional impact on matched markets
 *   4. Checks current market price vs expected post-news price
 *   5. Fires immediate trade signal if edge exists
 *
 * This is separate from newsSignal.js (which is a slow background enrichment).
 * This module is a real-time reaction engine.
 *
 * News Sources (all free, no API key required):
 * - BBC RSS (updates every few minutes)
 * - NYT RSS
 * - Reuters RSS
 * - AP News RSS
 * - Google News RSS (custom topic-based)
 * - Reddit /r/news, /r/worldnews (JSON API)
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'logs', 'news-reactor-state.json');

// ─── Optional Dependencies ───────────────────────────────────────────
let polyMarkets = null;
let oddsApi = null;
let llmAnalysis = null;
try { polyMarkets = require('../polymarket/markets'); } catch { /* optional */ }
try { oddsApi = require('../bookmakers/oddsApi'); } catch { /* optional */ }
try { llmAnalysis = require('../data/llmAnalysis'); } catch { /* optional */ }

// ─── State ───────────────────────────────────────────────────────────
let seenHeadlines = new Set();        // Dedup: hash of headline text
let recentHeadlines = [];             // Rolling window of recent headlines
let matchedSignals = [];              // Signals generated from news
let pollInterval = null;
let isRunning = false;

let stats = {
  headlinesFetched: 0,
  newHeadlines: 0,
  marketsMatched: 0,
  signalsGenerated: 0,
  pollCount: 0,
  lastPollTime: null,
  avgPollMs: 0,
};

// Callbacks
let onNewsSignal = null;              // (signal) => void

// ─── Configuration ───────────────────────────────────────────────────
const CONFIG = {
  pollIntervalMs: 45000,              // 45 second poll (aggressive for free RSS)
  maxHeadlineAge: 2 * 60 * 60 * 1000, // 2 hours max headline age
  maxSeenSize: 10000,                 // Dedup set max size
  maxRecentHeadlines: 500,
  maxSignalHistory: 200,
  // Impact thresholds
  minImpactScore: 0.6,               // Minimum headline impact to generate signal
  minMarketMatchScore: 3,             // Minimum relevance score to match market
  llmMatchThreshold: 0.55,           // LLM match quality needed to confirm a fuzzy keyword match
  llmPrefilterScore: 1,              // Keyword score >= this triggers LLM validation
  maxLLMCallsPerPoll: 5,             // Cap LLM usage per poll cycle
  // Reaction parameters
  minEdgeForSignal: 0.03,            // 3% minimum estimated edge to fire
};

// ─── RSS Sources ─────────────────────────────────────────────────────
const RSS_SOURCES = [
  // Major wires — fastest public news
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', source: 'BBC', weight: 1.0 },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World', weight: 1.0 },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', source: 'NYT', weight: 0.9 },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', source: 'NYT Politics', weight: 1.0 },
  // AP / Reuters via Google News workaround
  { url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en', source: 'Google Top', weight: 0.8 },
  { url: 'https://news.google.com/rss/topics/CAAqIggKIhxDQkFTRHdvSkwyMHZNRGxqTjNjd0VnSmxiaWdBUAE?hl=en-US&gl=US&ceid=US:en', source: 'Google Business', weight: 0.7 },
  // Sports
  { url: 'https://www.espn.com/espn/rss/news', source: 'ESPN', weight: 0.9 },
  // Crypto
  { url: 'https://cointelegraph.com/rss', source: 'CoinTelegraph', weight: 0.8 },
];

// ─── Breaking News Keywords (weight multiplier) ─────────────────────
const BREAKING_INDICATORS = {
  'breaking': 2.0, 'just in': 2.0, 'urgent': 1.8, 'developing': 1.5,
  'exclusive': 1.5, 'confirmed': 1.4, 'officially': 1.3, 'announces': 1.3,
  'breaking news': 2.5, 'alert': 1.5, 'flash': 1.5,
};

// Impact words for prediction markets
const HIGH_IMPACT_WORDS = {
  // Politics
  'resign': 3, 'impeach': 3, 'indicted': 3, 'arrested': 3, 'elected': 3,
  'assassin': 3, 'withdraw': 2.5, 'endorse': 2, 'concede': 3,
  'veto': 2, 'executive order': 2.5, 'supreme court': 2,
  'declare': 2, 'invade': 3, 'ceasefire': 2.5, 'treaty': 2,
  'sanction': 2, 'tariff': 2, 'ban': 2,
  // Sports
  'injury': 2.5, 'traded': 2, 'suspended': 2.5, 'retired': 2,
  'upset': 2, 'eliminated': 2.5, 'champion': 2, 'record': 1.5,
  // Crypto / Finance
  'crash': 2.5, 'hack': 2.5, 'sec': 2, 'regulation': 2,
  'etf': 2, 'approval': 2, 'listing': 1.5, 'bankruptcy': 3,
  'rate cut': 2.5, 'rate hike': 2.5, 'inflation': 1.5, 'recession': 2,
  // Entertainment / Culture
  'dies': 3, 'dead': 3, 'death': 3, 'oscar': 1.5, 'grammy': 1.5,
  'scandal': 2, 'controversy': 1.5,
};

// ─── Helpers ─────────────────────────────────────────────────────────
function hashHeadline(text) {
  // Simple hash for dedup — normalize whitespace and case
  return text.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 100);
}

function parseRSSItems(xml, source, weight) {
  const items = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (const item of itemMatches.slice(0, 15)) {
    const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const descMatch = item.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/);
    const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
    const linkMatch = item.match(/<link>(.*?)<\/link>/);

    if (titleMatch) {
      const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
      const pubDate = dateMatch ? new Date(dateMatch[1]) : new Date();
      const ageMs = Date.now() - pubDate.getTime();

      // Skip headlines older than our window
      if (ageMs > CONFIG.maxHeadlineAge) continue;

      items.push({
        title,
        description: descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim().slice(0, 300) : '',
        source,
        sourceWeight: weight,
        pubDate: pubDate.toISOString(),
        ageMs,
        link: linkMatch ? linkMatch[1] : '',
        hash: hashHeadline(title),
      });
    }
  }

  return items;
}

// ─── Impact Scoring ──────────────────────────────────────────────────

/**
 * Score how impactful a headline is for prediction markets.
 * Returns 0-1 score.
 */
function scoreHeadlineImpact(headline) {
  const text = (headline.title + ' ' + headline.description).toLowerCase();
  let impactScore = 0;
  let breakingMultiplier = 1.0;

  // Check for breaking news indicators
  for (const [indicator, mult] of Object.entries(BREAKING_INDICATORS)) {
    if (text.includes(indicator)) {
      breakingMultiplier = Math.max(breakingMultiplier, mult);
    }
  }

  // Score high-impact words
  let impactWords = 0;
  for (const [word, weight] of Object.entries(HIGH_IMPACT_WORDS)) {
    if (text.includes(word)) {
      impactScore += weight;
      impactWords++;
    }
  }

  // Normalize: max score from words ~10, plus breaking multiplier
  const normalizedImpact = Math.min(1.0, (impactScore / 6) * breakingMultiplier);

  // Recency bonus: last 10 min = 1.0, last 1 hour = 0.7, older = 0.4
  const ageMin = headline.ageMs / 60000;
  const recencyBonus = ageMin <= 10 ? 1.0 : ageMin <= 60 ? 0.7 : 0.4;

  // Source weight
  const sourceWeight = headline.sourceWeight || 0.5;

  return {
    score: Math.min(1.0, normalizedImpact * recencyBonus * sourceWeight),
    breakingMultiplier,
    impactWords,
    recencyBonus,
    isBreaking: breakingMultiplier >= 1.5,
  };
}

// ─── Market Matching ─────────────────────────────────────────────────

/**
 * Match a headline against all active Polymarket markets.
 * Step 1: fast keyword pre-filter
 * Step 2: LLM semantic validation for borderline/fuzzy matches
 */
function matchToMarketsKeyword(headline, markets) {
  if (!markets || markets.length === 0) return [];

  const headlineText = (headline.title + ' ' + (headline.description || '')).toLowerCase();
  const headlineWords = new Set(headlineText.split(/\s+/).filter(w => w.length >= 3));
  const matches = [];

  for (const market of markets) {
    if (!market.question) continue;
    const q = market.question.toLowerCase();

    const stopWords = new Set(['will', 'the', 'a', 'an', 'is', 'are', 'be', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'or', 'and', 'but', 'if', 'what', 'which', 'who', 'how', 'when', 'where', 'why', 'yes', 'no', 'before', 'after', 'this', 'that', 'more', 'than']);
    const marketWords = q.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));

    let matchScore = 0;
    let matchedWords = [];

    // Exact entity matching (names, proper nouns)
    const entities = market.question.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
    for (const entity of entities) {
      if (headlineText.includes(entity.toLowerCase())) {
        matchScore += 4;
        matchedWords.push(entity);
      }
    }

    // Word overlap
    for (const word of marketWords) {
      if (headlineWords.has(word)) {
        matchScore += word.length >= 6 ? 2 : 1;
        if (!matchedWords.includes(word)) matchedWords.push(word);
      }
    }

    if (matchScore >= CONFIG.llmPrefilterScore) {
      matches.push({ market, matchScore, matchedWords });
    }
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 15);
}

/**
 * Async version — runs keyword filter then LLM semantic validation on ambiguous matches.
 */
async function matchToMarkets(headline, markets) {
  const candidates = matchToMarketsKeyword(headline, markets);
  if (candidates.length === 0) return [];

  // Split into strong keyword matches (pass directly) and fuzzy (need LLM)
  const strong = candidates.filter(c => c.matchScore >= CONFIG.minMarketMatchScore);
  const fuzzy  = candidates.filter(c => c.matchScore < CONFIG.minMarketMatchScore);

  const confirmed = [...strong];

  // Use LLM to validate fuzzy/borderline matches if configured
  const llm = llmAnalysis;
  if (llm && llm.isConfigured() && fuzzy.length > 0) {
    let llmCalls = 0;
    for (const c of fuzzy) {
      if (llmCalls >= CONFIG.maxLLMCallsPerPoll) break;
      try {
        const validation = await llm.validateMatch(
          c.market.question,
          headline.title + (headline.description ? '. ' + headline.description.slice(0, 120) : ''),
          'News Headline'
        );
        llmCalls++;
        if (validation.matchQuality >= CONFIG.llmMatchThreshold) {
          confirmed.push({ ...c, matchScore: c.matchScore + validation.matchQuality * 5, llmValidated: true, matchQuality: validation.matchQuality });
        }
      } catch { /* non-critical */ }
    }
  }

  return confirmed.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
}

// ─── Directional Impact Estimation ───────────────────────────────────

/**
 * Estimate how a headline should move a market's probability.
 * Positive = YES more likely, Negative = NO more likely.
 */
function estimateDirection(headline, market) {
  const text = (headline.title + ' ' + headline.description).toLowerCase();
  const q = market.question.toLowerCase();

  // Extract the subject of the market question
  // e.g., "Will Trump win?" → subject = "Trump"
  const entities = market.question.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];

  let direction = 0; // positive = YES, negative = NO

  // Check positive/negative sentiment relative to the subject
  const positiveWords = ['win', 'wins', 'victory', 'lead', 'ahead', 'surge', 'confirm', 'approve', 'pass', 'succeed', 'gain', 'rise', 'rally', 'beat'];
  const negativeWords = ['lose', 'loss', 'defeat', 'trail', 'behind', 'drop', 'reject', 'deny', 'fail', 'miss', 'fall', 'crash', 'scandal', 'withdraw'];

  // Check if the headline mentions the entity positively or negatively
  for (const entity of entities) {
    const entityLower = entity.toLowerCase();
    if (!text.includes(entityLower)) continue;

    // Find sentiment words near the entity
    const words = text.split(/\s+/);
    const entityIdx = words.findIndex(w => w.includes(entityLower));
    if (entityIdx === -1) continue;

    // Look in a ±10 word window
    const window = words.slice(Math.max(0, entityIdx - 10), entityIdx + 10);
    for (const w of window) {
      if (positiveWords.includes(w)) direction += 1;
      if (negativeWords.includes(w)) direction -= 1;
    }
  }

  // Special patterns
  if (q.includes('price') || q.includes('above') || q.includes('reach')) {
    // Price markets: positive news = YES
    if (text.includes('surge') || text.includes('rally') || text.includes('soar') || text.includes('record high')) direction += 2;
    if (text.includes('crash') || text.includes('plunge') || text.includes('collapse')) direction -= 2;
  }

  // Normalize to [-1, 1]
  return Math.max(-1, Math.min(1, direction / 3));
}

// ─── Core Trade Signal Generation ────────────────────────────────────

/**
 * Process a new headline: match to markets, estimate impact, generate signals.
 */
async function processHeadline(headline, markets) {
  const impact = scoreHeadlineImpact(headline);
  if (impact.score < CONFIG.minImpactScore) return null;

  const matches = await matchToMarkets(headline, markets);
  if (matches.length === 0) return null;

  const signals = [];

  for (const match of matches) {
    const direction = estimateDirection(headline, match.market);
    if (Math.abs(direction) < 0.3) continue; // Too weak

    const currentPrice = direction > 0 ? match.market.yesPrice : match.market.noPrice;
    const side = direction > 0 ? 'YES' : 'NO';

    // Estimate how much the price should move
    // Breaking news with high impact → larger expected move
    const expectedMove = impact.score * Math.abs(direction) * 0.08; // Max ~8% move
    const estimatedEdge = expectedMove * 0.5; // Conservative: capture 50% of expected move

    if (estimatedEdge < CONFIG.minEdgeForSignal) continue;

    const signal = {
      headline: headline.title,
      source: headline.source,
      ageMin: Math.round(headline.ageMs / 60000),
      isBreaking: impact.isBreaking,
      impactScore: Math.round(impact.score * 100) / 100,
      market: match.market.question,
      conditionId: match.market.conditionId,
      slug: match.market.slug,
      matchScore: match.matchScore,
      matchedWords: match.matchedWords,
      llmValidated: match.llmValidated || false,
      side,
      currentPrice,
      endDate: match.market.endDate || match.market.endDateIso,
      expectedMove: Math.round(expectedMove * 10000) / 10000,
      estimatedEdge: Math.round(estimatedEdge * 10000) / 10000,
      liquidity: match.market.liquidity,
      volume: match.market.volume24hr,
      detectedAt: new Date().toISOString(),
      // Suggested action
      action: {
        type: estimatedEdge > 0.05 ? 'MARKET_ORDER' : 'LIMIT_ORDER',
        side,
        suggestedSize: Math.min(100, Math.max(10, match.market.liquidity * 0.01)),
        limitPrice: side === 'YES'
          ? Math.min(currentPrice + expectedMove * 0.3, currentPrice + 0.05)
          : Math.min(currentPrice + expectedMove * 0.3, currentPrice + 0.05),
        urgency: impact.isBreaking ? 'IMMEDIATE' : 'NORMAL',
        expiryMin: impact.isBreaking ? 5 : 30,
      },
    };

    signals.push(signal);
    stats.signalsGenerated++;
  }

  return signals.length > 0 ? signals : null;
}

// ─── Poll Cycle ──────────────────────────────────────────────────────

async function pollNews() {
  const pollStart = Date.now();
  stats.pollCount++;
  stats.lastPollTime = new Date().toISOString();

  const allHeadlines = [];

  // Fetch all RSS sources in parallel
  const fetchPromises = RSS_SOURCES.map(async (feed) => {
    try {
      const resp = await fetch(feed.url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'MarketPlayMaker/1.0 NewsBot' },
      });
      if (!resp.ok) return [];
      const xml = await resp.text();
      return parseRSSItems(xml, feed.source, feed.weight);
    } catch {
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  for (const items of results) allHeadlines.push(...items);

  stats.headlinesFetched += allHeadlines.length;

  // Filter to new headlines only
  const newHeadlines = allHeadlines.filter(h => !seenHeadlines.has(h.hash));
  stats.newHeadlines += newHeadlines.length;

  // Add to seen set
  for (const h of allHeadlines) seenHeadlines.add(h.hash);

  // Prune seen set if too large
  if (seenHeadlines.size > CONFIG.maxSeenSize) {
    const arr = [...seenHeadlines];
    seenHeadlines = new Set(arr.slice(-CONFIG.maxSeenSize / 2));
  }

  // Add to rolling window
  recentHeadlines.push(...newHeadlines);
  if (recentHeadlines.length > CONFIG.maxRecentHeadlines) {
    recentHeadlines = recentHeadlines.slice(-CONFIG.maxRecentHeadlines);
  }

  if (newHeadlines.length === 0) {
    stats.avgPollMs = stats.avgPollMs * 0.9 + (Date.now() - pollStart) * 0.1;
    return { newHeadlines: 0, signals: [] };
  }

  log.info('NEWS_RX', `${newHeadlines.length} new headlines from ${RSS_SOURCES.length} sources`);

  // Get active markets for matching
  let markets = [];
  if (polyMarkets) {
    try {
      markets = polyMarkets.getCachedMarkets();
    } catch { /* no markets */ }
  }

  // Process each new headline (sequential to respect LLM rate limits)
  const allSignals = [];
  for (const headline of newHeadlines) {
    const signals = await processHeadline(headline, markets);
    if (signals) {
      allSignals.push(...signals);
      stats.marketsMatched += signals.length;
    }
  }

  // Store signals
  matchedSignals.push(...allSignals);
  if (matchedSignals.length > CONFIG.maxSignalHistory) {
    matchedSignals = matchedSignals.slice(-CONFIG.maxSignalHistory);
  }

  // Fire callbacks for each signal
  if (allSignals.length > 0 && onNewsSignal) {
    for (const signal of allSignals) {
      try { onNewsSignal(signal); } catch { /* non-critical */ }
    }
    log.info('NEWS_RX', `🚨 ${allSignals.length} trade signal(s) from breaking news!`);
  }

  stats.avgPollMs = stats.avgPollMs * 0.9 + (Date.now() - pollStart) * 0.1;

  // Save state periodically (every 10th poll)
  if (stats.pollCount % 10 === 0) saveState();

  return { newHeadlines: newHeadlines.length, signals: allSignals };
}

// ─── Lifecycle ───────────────────────────────────────────────────────

function start(options = {}) {
  if (isRunning) return;

  if (options.onNewsSignal) onNewsSignal = options.onNewsSignal;
  loadState();
  isRunning = true;

  log.info('NEWS_RX', `Starting rapid news reactor (${CONFIG.pollIntervalMs / 1000}s interval)`);

  // Immediate first poll
  pollNews().catch(err => log.warn('NEWS_RX', `Initial poll failed: ${err.message}`));

  pollInterval = setInterval(() => {
    pollNews().catch(err => log.warn('NEWS_RX', `Poll failed: ${err.message}`));
  }, CONFIG.pollIntervalMs);
}

function stop() {
  if (!isRunning) return;
  isRunning = false;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  saveState();
  log.info('NEWS_RX', 'Rapid news reactor stopped');
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      seenHeadlines = new Set(data.seenHashes || []);
      matchedSignals = data.signals || [];
      stats = { ...stats, ...(data.stats || {}) };
    }
  } catch { /* fresh start */ }
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      seenHashes: [...seenHeadlines].slice(-2000),
      signals: matchedSignals.slice(-CONFIG.maxSignalHistory),
      stats,
      savedAt: new Date().toISOString(),
    }, null, 2));
  } catch { /* non-critical */ }
}

function getStatus() {
  return {
    running: isRunning,
    stats: { ...stats },
    recentHeadlines: recentHeadlines.length,
    matchedSignals: matchedSignals.length,
    sources: RSS_SOURCES.length,
  };
}

function getRecentSignals(limit = 20) {
  return matchedSignals.slice(-limit).reverse();
}

function getRecentHeadlines(limit = 30) {
  return recentHeadlines.slice(-limit).reverse().map(h => ({
    title: h.title,
    source: h.source,
    ageMin: Math.round((Date.now() - new Date(h.pubDate).getTime()) / 60000),
    impact: scoreHeadlineImpact(h),
  }));
}

module.exports = {
  start,
  stop,
  pollNews,
  processHeadline,
  getStatus,
  getRecentSignals,
  getRecentHeadlines,
  scoreHeadlineImpact,
  matchToMarkets,
  CONFIG,
};
