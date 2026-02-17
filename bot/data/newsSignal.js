/**
 * News Sentiment Signal Module
 *
 * Fetches recent news headlines related to Polymarket events and
 * produces a sentiment signal that can shift probability estimates.
 *
 * Sources (free tier):
 * - NewsData.io API (free: 200 req/day, 10 results/req)
 * - RSS feeds from major prediction-relevant sources
 * - Simple keyword + entity extraction for relevance matching
 *
 * Architecture:
 * - Periodic background fetch of headlines (every 15 min)
 * - Fuzzy matching against Polymarket market questions
 * - VADER-style lexicon sentiment scoring (no ML dependency)
 * - Recency-weighted: newer headlines matter more
 * - Outputs a sentiment score [-1, +1] per matched market
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../logs/news-cache.json');

// ─── Sentiment Lexicon (VADER-style, domain-tuned) ───────────────────
// Positive words → suggest YES outcome more likely
// Negative words → suggest YES outcome less likely (NO more likely)
const POSITIVE_WORDS = {
  'win': 2, 'wins': 2, 'winning': 2, 'won': 2, 'victory': 2.5,
  'leads': 1.5, 'leading': 1.5, 'ahead': 1.5, 'surge': 2, 'surging': 2,
  'rally': 1.5, 'rallying': 1.5, 'boost': 1.5, 'gain': 1, 'gains': 1,
  'up': 0.5, 'rise': 1, 'rises': 1, 'rising': 1, 'soar': 2, 'soaring': 2,
  'record': 1, 'historic': 1, 'breakthrough': 2, 'dominate': 2,
  'confirm': 1.5, 'confirmed': 1.5, 'approve': 1.5, 'approved': 2,
  'pass': 1, 'passed': 1.5, 'passing': 1, 'strong': 1, 'stronger': 1.5,
  'bullish': 2, 'optimistic': 1.5, 'positive': 1, 'success': 1.5,
  'beat': 1.5, 'beats': 1.5, 'beating': 1.5, 'outperform': 2,
  'exceed': 1.5, 'exceeds': 1.5, 'exceeded': 1.5, 'above': 0.5,
  'clinch': 2, 'secure': 1.5, 'advance': 1, 'qualify': 1.5,
  'favorite': 1, 'expected': 0.5, 'likely': 1, 'probable': 1,
  'landslide': 2.5, 'blowout': 2, 'dominant': 2, 'unstoppable': 2.5,
};

const NEGATIVE_WORDS = {
  'lose': -2, 'loses': -2, 'losing': -2, 'lost': -2, 'defeat': -2.5,
  'trails': -1.5, 'trailing': -1.5, 'behind': -1.5, 'drop': -1.5,
  'drops': -1.5, 'dropping': -1.5, 'crash': -2.5, 'crashed': -2.5,
  'decline': -1.5, 'declining': -1.5, 'fall': -1.5, 'falls': -1.5,
  'down': -0.5, 'sink': -1.5, 'sinks': -1.5, 'plunge': -2.5,
  'fail': -2, 'fails': -2, 'failed': -2, 'failure': -2, 'reject': -2,
  'rejected': -2, 'deny': -1.5, 'denied': -2, 'block': -1.5,
  'weak': -1, 'weaker': -1.5, 'bearish': -2, 'pessimistic': -1.5,
  'miss': -1.5, 'misses': -1.5, 'missed': -1.5, 'underperform': -2,
  'below': -0.5, 'under': -0.5, 'stumble': -1.5, 'struggle': -1.5,
  'unlikely': -1.5, 'improbable': -2, 'doubt': -1, 'doubtful': -1.5,
  'scandal': -2, 'controversy': -1.5, 'crisis': -2, 'collapse': -2.5,
  'injury': -2, 'injured': -2, 'suspend': -2, 'suspended': -2,
  'ban': -2, 'banned': -2, 'eliminate': -2, 'eliminated': -2.5,
  'upset': -2, 'shocking': -1.5, 'surprising': -1,
};

// Intensity modifiers
const BOOSTERS = { 'very': 1.3, 'extremely': 1.5, 'incredibly': 1.4, 'absolutely': 1.3, 'definitely': 1.2, 'strongly': 1.3, 'significantly': 1.3, 'massive': 1.4, 'huge': 1.3, 'major': 1.2 };
const DAMPENERS = { 'slightly': 0.6, 'somewhat': 0.7, 'maybe': 0.5, 'possibly': 0.5, 'might': 0.5, 'could': 0.6, 'potentially': 0.6, 'reportedly': 0.7, 'rumor': 0.4, 'speculation': 0.4 };
const NEGATORS = new Set(['not', "n't", 'no', 'never', 'neither', 'nor', 'without', 'barely', 'hardly']);

// ─── State ───────────────────────────────────────────────────────────
let apiKey = null;           // NewsData.io API key (optional)
let cachedHeadlines = [];    // All fetched headlines
let lastFetchTime = null;
let marketSentiments = new Map(); // conditionId → { score, headlines, lastUpdate }

// ─── API Key Management ──────────────────────────────────────────────
function setApiKey(key) {
  if (!key || key.length < 5) throw new Error('Invalid news API key');
  apiKey = key.trim();
  log.info('NEWS', `News API key set (${apiKey.slice(0, 4)}...)`);
}

function hasApiKey() { return !!apiKey; }

// ─── Headline Fetching ──────────────────────────────────────────────

/**
 * Fetch headlines from NewsData.io API.
 * Free tier: 200 requests/day, 10 results per request.
 * We use category-based queries to cover Polymarket verticals.
 */
async function fetchHeadlines() {
  const headlines = [];

  if (apiKey) {
    // NewsData.io API
    const categories = ['politics', 'sports', 'business', 'technology', 'entertainment'];
    for (const cat of categories) {
      try {
        const url = `https://newsdata.io/api/1/latest?apikey=${apiKey}&category=${cat}&language=en&size=10`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          if (data.results) {
            for (const article of data.results) {
              headlines.push({
                title: article.title || '',
                description: article.description || '',
                source: article.source_name || article.source_id || 'unknown',
                pubDate: article.pubDate || new Date().toISOString(),
                category: cat,
                link: article.link || '',
              });
            }
          }
        }
      } catch (err) {
        log.warn('NEWS', `Failed to fetch ${cat} headlines: ${err.message}`);
      }
    }
  }

  // Always include free RSS-based headlines (no API key needed)
  try {
    const rssHeadlines = await fetchRSSHeadlines();
    headlines.push(...rssHeadlines);
  } catch { /* skip RSS on failure */ }

  cachedHeadlines = headlines;
  lastFetchTime = new Date().toISOString();
  log.info('NEWS', `Fetched ${headlines.length} headlines`);

  // Cache to disk for persistence
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      headlines: headlines.slice(0, 200), // Keep last 200
      fetchedAt: lastFetchTime,
    }, null, 2));
  } catch { /* non-critical */ }

  return headlines;
}

/**
 * Fetch headlines from free RSS feeds (no API key needed).
 * Uses public JSON/RSS endpoints from major news sources.
 */
async function fetchRSSHeadlines() {
  const feeds = [
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', source: 'NYTimes' },
    { url: 'https://feeds.bbci.co.uk/news/rss.xml', source: 'BBC' },
  ];

  const headlines = [];

  for (const feed of feeds) {
    try {
      const resp = await fetch(feed.url, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) continue;
      const text = await resp.text();

      // Simple XML title extraction (no dependency needed)
      const itemMatches = text.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of itemMatches.slice(0, 10)) {
        const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
        const descMatch = item.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/);
        const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

        if (titleMatch) {
          headlines.push({
            title: titleMatch[1].replace(/<[^>]*>/g, '').trim(),
            description: descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim().slice(0, 200) : '',
            source: feed.source,
            pubDate: dateMatch ? dateMatch[1] : new Date().toISOString(),
            category: 'general',
            link: '',
          });
        }
      }
    } catch { /* skip failing feeds */ }
  }

  return headlines;
}

/**
 * Load cached headlines from disk on startup.
 */
function loadCachedHeadlines() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (data.headlines) {
        cachedHeadlines = data.headlines;
        lastFetchTime = data.fetchedAt;
        log.info('NEWS', `Loaded ${cachedHeadlines.length} cached headlines from disk`);
      }
    }
  } catch { /* start fresh */ }
}

// ─── Sentiment Analysis ──────────────────────────────────────────────

/**
 * Score a single headline for sentiment.
 * Returns a value from -5 to +5.
 *
 * Logic:
 * 1. Tokenize into words
 * 2. Score each word against lexicon
 * 3. Apply modifier words (boosters, dampeners, negators)
 * 4. Sum and normalize
 */
function scoreHeadline(text) {
  if (!text) return 0;

  const words = text.toLowerCase().replace(/[^\w\s'-]/g, '').split(/\s+/);
  let totalScore = 0;
  let wordCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prevWord = i > 0 ? words[i - 1] : '';
    const prevPrevWord = i > 1 ? words[i - 2] : '';

    let wordScore = 0;

    if (POSITIVE_WORDS[word]) wordScore = POSITIVE_WORDS[word];
    else if (NEGATIVE_WORDS[word]) wordScore = NEGATIVE_WORDS[word];
    else continue;

    // Check for negators (flip sentiment)
    if (NEGATORS.has(prevWord) || (prevWord.endsWith("n't"))) {
      wordScore *= -0.8; // Negation weakens slightly
    }
    if (NEGATORS.has(prevPrevWord)) {
      wordScore *= -0.5; // Two-word distance negation is weaker
    }

    // Check for boosters/dampeners
    if (BOOSTERS[prevWord]) wordScore *= BOOSTERS[prevWord];
    if (DAMPENERS[prevWord]) wordScore *= DAMPENERS[prevWord];

    totalScore += wordScore;
    wordCount++;
  }

  // Normalize: more relevant words → stronger signal
  return wordCount > 0 ? totalScore / Math.sqrt(wordCount) : 0;
}

/**
 * Match a Polymarket market to relevant headlines.
 * Uses keyword extraction from market question for fuzzy matching.
 */
function matchHeadlinesToMarket(market) {
  if (!cachedHeadlines.length || !market.question) return [];

  // Extract key entities from market question
  const q = market.question.toLowerCase();
  const keywords = extractKeywords(q);

  if (keywords.length === 0) return [];

  const matched = [];

  for (const headline of cachedHeadlines) {
    const hText = (headline.title + ' ' + headline.description).toLowerCase();
    let matchScore = 0;

    for (const kw of keywords) {
      if (hText.includes(kw.word)) {
        matchScore += kw.weight;
      }
    }

    if (matchScore >= 2) { // Minimum relevance threshold
      // Recency weight: headlines from last 2 hours → 1.0, 24 hours → 0.5, older → 0.2
      const ageHours = (Date.now() - new Date(headline.pubDate).getTime()) / 3600000;
      const recencyWeight = ageHours <= 2 ? 1.0 : ageHours <= 12 ? 0.7 : ageHours <= 24 ? 0.5 : 0.2;

      const sentimentScore = scoreHeadline(headline.title);

      if (Math.abs(sentimentScore) > 0.3) {
        matched.push({
          headline: headline.title,
          source: headline.source,
          ageHours: Math.round(ageHours * 10) / 10,
          matchScore,
          recencyWeight,
          rawSentiment: Math.round(sentimentScore * 100) / 100,
          weightedSentiment: Math.round(sentimentScore * recencyWeight * 100) / 100,
        });
      }
    }
  }

  return matched.sort((a, b) => Math.abs(b.weightedSentiment) - Math.abs(a.weightedSentiment)).slice(0, 5);
}

/**
 * Extract searchable keywords from a market question.
 * Filters out common words, returns weighted keywords.
 */
function extractKeywords(question) {
  const stopWords = new Set([
    'will', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'in', 'on', 'at',
    'to', 'for', 'of', 'with', 'by', 'from', 'this', 'that', 'these',
    'those', 'than', 'or', 'and', 'but', 'if', 'then', 'so', 'as',
    'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why',
    'before', 'after', 'during', 'above', 'below', 'between', 'into',
    'through', 'about', 'up', 'down', 'over', 'under', 'again', 'more',
    'most', 'other', 'some', 'such', 'no', 'not', 'only', 'same',
    'yes', 'win', 'event', 'market',
  ]);

  const words = question.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));

  // Entity detection: capitalize words are more important (names, teams)
  const keywords = [];
  const seen = new Set();

  // Multi-word entities (look for consecutive capitalized words in original)
  const entityPatterns = question.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  for (const entity of entityPatterns) {
    const lower = entity.toLowerCase();
    if (lower.length >= 3 && !seen.has(lower)) {
      seen.add(lower);
      keywords.push({ word: lower, weight: 3 });
    }
  }

  // Single meaningful words
  for (const word of words) {
    if (!seen.has(word)) {
      seen.add(word);
      // Names/proper nouns (longer words) get higher weight
      const weight = word.length >= 6 ? 2 : 1;
      keywords.push({ word, weight });
    }
  }

  return keywords.slice(0, 10); // Max 10 keywords per market
}

// ─── Integration: Sentiment Signal for Probability Model ─────────────

/**
 * Get sentiment-based probability adjustment for a market.
 *
 * Returns:
 * - adjustment: probability shift (e.g., +0.02 = sentiment suggests YES 2% more likely)
 * - confidence: how much to trust this signal
 * - headlines: the matched headlines that drove the signal
 *
 * This is designed to be consumed by the probability model as an additional
 * Bayesian evidence signal.
 */
function getSentimentSignal(market) {
  const matched = matchHeadlinesToMarket(market);

  if (matched.length === 0) {
    return { adjustment: 0, logLR: 0, confidence: 'NONE', headlines: [], data: null };
  }

  // Aggregate weighted sentiment across matched headlines
  const totalWeightedSentiment = matched.reduce((sum, h) => sum + h.weightedSentiment, 0);
  const avgSentiment = totalWeightedSentiment / matched.length;

  // Convert sentiment score to probability adjustment
  // Scale: sentiment of ±2 → ±3% probability adjustment (max)
  const maxAdjustment = 0.03;
  const rawAdjustment = Math.max(-maxAdjustment, Math.min(maxAdjustment, avgSentiment * 0.015));

  // Log-likelihood ratio for Bayesian model
  const logLR = rawAdjustment * 4; // Scale to log-odds space

  // Confidence based on # of matching headlines and their agreement
  const allSameDirection = matched.every(h => Math.sign(h.weightedSentiment) === Math.sign(avgSentiment));
  let confidence = 'LOW';
  if (matched.length >= 3 && allSameDirection && Math.abs(avgSentiment) > 1) confidence = 'HIGH';
  else if (matched.length >= 2 && Math.abs(avgSentiment) > 0.5) confidence = 'MEDIUM';

  return {
    adjustment: Math.round(rawAdjustment * 10000) / 10000,
    logLR: Math.round(logLR * 10000) / 10000,
    confidence,
    headlineCount: matched.length,
    avgSentiment: Math.round(avgSentiment * 100) / 100,
    headlines: matched.slice(0, 3).map(h => ({
      headline: h.headline.slice(0, 100),
      source: h.source,
      sentiment: h.rawSentiment,
    })),
    data: {
      totalHeadlinesSearched: cachedHeadlines.length,
      matchedCount: matched.length,
      avgSentiment: Math.round(avgSentiment * 100) / 100,
      lastFetch: lastFetchTime,
    },
  };
}

// ─── Background Fetch ────────────────────────────────────────────────
let fetchInterval = null;

function startPeriodicFetch(intervalMs = 900000) { // Default: 15 minutes
  if (fetchInterval) return;
  log.info('NEWS', `Starting periodic headline fetch every ${Math.round(intervalMs / 60000)} minutes`);

  // Immediate first fetch
  fetchHeadlines().catch(err => log.warn('NEWS', `Initial fetch failed: ${err.message}`));

  fetchInterval = setInterval(() => {
    fetchHeadlines().catch(err => log.warn('NEWS', `Periodic fetch failed: ${err.message}`));
  }, intervalMs);
}

function stopPeriodicFetch() {
  if (fetchInterval) {
    clearInterval(fetchInterval);
    fetchInterval = null;
  }
}

function getStatus() {
  return {
    hasKey: !!apiKey,
    cachedHeadlines: cachedHeadlines.length,
    lastFetch: lastFetchTime,
    isRunning: !!fetchInterval,
  };
}

// Load cached headlines on module init
loadCachedHeadlines();

module.exports = {
  setApiKey,
  hasApiKey,
  fetchHeadlines,
  getSentimentSignal,
  matchHeadlinesToMarket,
  scoreHeadline,
  startPeriodicFetch,
  stopPeriodicFetch,
  getStatus,
};
