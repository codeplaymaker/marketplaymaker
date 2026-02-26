/**
 * Cultural Events Context Engine
 *
 * Tracks real-world events that shift attention and behavior:
 *
 * For YouTube view markets:
 *   - Major YouTuber uploads (competing for attention)
 *   - Trending events that steal or boost attention
 *   - Holidays, award shows, major sports events
 *
 * For Elon tweet markets:
 *   - Tech news (AI launches, SpaceX events, Tesla earnings)
 *   - Political events (hearings, policy changes, elections)
 *   - X/Twitter platform news
 *   - Crypto market moves (Elon tweets more during crypto volatility)
 *
 * Feeds into youtubeTracker.js and twitterTracker.js as modifiers.
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../logs/cultural-events-cache.json');

// ─── State ───────────────────────────────────────────────────────────
let newsApiKey = null;    // Reuse NEWSDATA_API_KEY from newsSignal.js
let cachedEvents = [];
let lastFetchTime = null;
const FETCH_INTERVAL = 30 * 60 * 1000; // 30 min between fetches

// ─── Event Categories & Impact Weights ──────────────────────────────

// Events that STEAL YouTube attention (reduce views for other creators)
const YT_ATTENTION_STEALERS = {
  // Massive creators uploading = splits audience
  youtuber_uploads: {
    keywords: ['mrbeast', 'pewdiepie', 'mark rober', 'mkbhd', 'logan paul', 'ksi', 'ishowspeed', 'dude perfect', 'airrack'],
    impact: -0.15, // 15% view reduction when competing upload happens
    label: 'Competing YouTuber Upload',
  },
  // Events that pull attention away from YouTube entirely
  major_sports: {
    keywords: ['super bowl', 'world cup final', 'nba finals', 'champions league final', 'olympics opening ceremony', 'wrestlemania'],
    impact: -0.20, // 20% view reduction during mega events
    label: 'Major Sports Event',
  },
  award_shows: {
    keywords: ['oscars', 'grammys', 'emmys', 'golden globes', 'vmas', 'game awards'],
    impact: -0.10,
    label: 'Award Show',
  },
  breaking_news: {
    keywords: ['breaking:', 'mass shooting', 'earthquake', 'hurricane', 'war', 'assassination', 'emergency'],
    impact: -0.12,
    label: 'Breaking News Event',
  },
  holidays: {
    keywords: ['christmas', 'thanksgiving', 'new year', 'independence day', '4th of july'],
    impact: -0.08,
    label: 'Holiday / Low Activity Period',
  },
};

// Events that BOOST YouTube views (viral potential)
const YT_ATTENTION_BOOSTERS = {
  controversy: {
    keywords: ['drama', 'scandal', 'exposed', 'beef', 'callout', 'cancelled', 'apology video'],
    impact: 0.25,
    label: 'YouTube Drama/Controversy',
  },
  viral_trend: {
    keywords: ['viral', 'trending', 'challenge', 'everybody talking about'],
    impact: 0.15,
    label: 'Viral Trend',
  },
  collab: {
    keywords: ['collab', 'feat', 'featuring', 'together', 'crossover'],
    impact: 0.10,
    label: 'Major Creator Collab',
  },
};

// Events that make Elon tweet MORE
const ELON_TWEET_TRIGGERS = {
  tech_launches: {
    keywords: ['spacex launch', 'starship', 'falcon', 'tesla', 'neuralink', 'boring company', 'grok', 'xai'],
    multiplier: 1.8,
    label: 'SpaceX/Tesla/xAI Event',
  },
  political_heat: {
    keywords: ['doge department', 'government efficiency', 'hearing', 'congress', 'subpoena', 'investigation', 'senate', 'H-1B', 'immigration'],
    multiplier: 2.0,
    label: 'Political Event (Elon-related)',
  },
  x_platform: {
    keywords: ['x premium', 'twitter', 'x.com', 'community notes', 'free speech', 'content moderation', 'advertiser'],
    multiplier: 1.5,
    label: 'X/Twitter Platform News',
  },
  crypto_volatility: {
    keywords: ['bitcoin crash', 'bitcoin surge', 'crypto rally', 'dogecoin', 'memecoin', 'sec crypto'],
    multiplier: 1.6,
    label: 'Crypto Market Volatility',
  },
  ai_news: {
    keywords: ['openai', 'chatgpt', 'claude', 'gemini', 'artificial intelligence', 'agi', 'ai safety', 'ai regulation'],
    multiplier: 1.7,
    label: 'AI Industry News',
  },
  personal_drama: {
    keywords: ['elon musk lawsuit', 'musk sued', 'musk controversy', 'musk feud', 'musk vs'],
    multiplier: 2.2,
    label: 'Personal Drama/Controversy',
  },
  market_moves: {
    keywords: ['tesla stock', 'tsla', 'tesla earnings', 'tesla delivery', 'tesla recall'],
    multiplier: 1.5,
    label: 'Tesla Stock Movement',
  },
};

// Events that make Elon tweet LESS (rare)
const ELON_TWEET_SUPPRESSORS = {
  travel: {
    keywords: ['musk in china', 'musk visits', 'spacex launch day'], // He's busy at launches
    multiplier: 0.6,
    label: 'Travel/Busy Event',
  },
};

// ─── News Fetching ───────────────────────────────────────────────────

/**
 * Fetch relevant cultural events from news APIs.
 * Reuses the same NEWSDATA_API_KEY as newsSignal.js.
 */
async function fetchCulturalEvents() {
  if (lastFetchTime && Date.now() - lastFetchTime < FETCH_INTERVAL) {
    return cachedEvents; // Use cache
  }

  const events = [];

  // 1. NewsData.io API (if key available)
  if (newsApiKey) {
    const queries = [
      'youtube OR youtuber OR MrBeast OR viral video',
      'Elon Musk OR SpaceX OR Tesla OR X Twitter',
      'trending OR viral OR breaking news',
      'AI artificial intelligence OR tech launch',
    ];

    for (const query of queries) {
      try {
        const url = `https://newsdata.io/api/1/latest?apikey=${newsApiKey}&q=${encodeURIComponent(query)}&language=en&size=5`;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const data = await resp.json();

        for (const article of (data.results || [])) {
          events.push({
            title: article.title || '',
            description: article.description || '',
            source: article.source_name || article.source_id || 'News',
            pubDate: article.pubDate || new Date().toISOString(),
            link: article.link,
            category: article.category?.[0] || 'general',
          });
        }
      } catch (err) {
        log.warn('CULTURAL', `News fetch failed for "${query}": ${err.message}`);
      }
    }
  }

  // 2. RSS fallback — Google News trending topics (no API key needed)
  try {
    const rssUrl = 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';
    const resp = await fetch(rssUrl);
    if (resp.ok) {
      const text = await resp.text();
      // Simple XML parsing for RSS
      const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items.slice(0, 15)) {
        const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || '';
        const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
        events.push({
          title,
          description: '',
          source: 'Google News',
          pubDate,
          category: 'trending',
        });
      }
    }
  } catch {
    // Google News RSS is optional
  }

  cachedEvents = events;
  lastFetchTime = Date.now();
  saveEventCache();

  log.info('CULTURAL', `Fetched ${events.length} cultural events`);
  return events;
}

// ─── Impact Analysis ─────────────────────────────────────────────────

/**
 * Analyze cultural events impact on YouTube view velocity.
 *
 * @param {string} creatorName - e.g., "MrBeast"
 * @returns {{ modifier: number, events: Array, detail: string }}
 *   modifier: multiplier for view projection (1.0 = no impact, 0.85 = -15%)
 */
async function getYouTubeImpact(creatorName) {
  const events = await fetchCulturalEvents();
  if (events.length === 0) return { modifier: 1.0, events: [], detail: 'No cultural events data' };

  let totalModifier = 1.0;
  const impactEvents = [];

  const allText = events.map(e => `${e.title} ${e.description}`.toLowerCase()).join('\n');

  // Check attention stealers
  for (const [key, config] of Object.entries(YT_ATTENTION_STEALERS)) {
    for (const kw of config.keywords) {
      // Don't penalize the creator for their OWN upload
      if (creatorName && kw.toLowerCase() === creatorName.toLowerCase()) continue;

      if (allText.includes(kw.toLowerCase())) {
        totalModifier += config.impact;
        impactEvents.push({
          type: key,
          trigger: kw,
          impact: config.impact,
          label: config.label,
          direction: 'negative',
        });
        break; // One match per category is enough
      }
    }
  }

  // Check attention boosters
  for (const [key, config] of Object.entries(YT_ATTENTION_BOOSTERS)) {
    for (const kw of config.keywords) {
      if (allText.includes(kw.toLowerCase())) {
        // Boost only if it's related to the creator
        const creatorRelated = creatorName &&
          allText.includes(creatorName.toLowerCase()) &&
          allText.indexOf(kw.toLowerCase()) - allText.indexOf(creatorName.toLowerCase()) < 500;

        if (creatorRelated || key === 'viral_trend') {
          totalModifier += config.impact;
          impactEvents.push({
            type: key,
            trigger: kw,
            impact: config.impact,
            label: config.label,
            direction: 'positive',
          });
          break;
        }
      }
    }
  }

  // Clamp modifier
  totalModifier = Math.max(0.5, Math.min(1.5, totalModifier));

  const detail = impactEvents.length > 0
    ? impactEvents.map(e => `${e.direction === 'positive' ? '↑' : '↓'} ${e.label}: "${e.trigger}" (${e.impact > 0 ? '+' : ''}${(e.impact * 100).toFixed(0)}%)`).join(' | ')
    : 'No significant cultural events affecting views';

  return {
    modifier: Math.round(totalModifier * 1000) / 1000,
    events: impactEvents,
    detail,
    eventsScanned: events.length,
  };
}

/**
 * Analyze cultural events impact on Elon's tweeting frequency.
 *
 * @returns {{ multiplier: number, events: Array, detail: string }}
 *   multiplier: expected tweet rate multiplier (1.0 = normal, 2.0 = double)
 */
async function getElonTweetImpact() {
  const events = await fetchCulturalEvents();
  if (events.length === 0) return { multiplier: 1.0, events: [], detail: 'No cultural events data' };

  let maxMultiplier = 1.0;
  const impactEvents = [];

  // Focus on recent events (last 48 hours)
  const recentEvents = events.filter(e => {
    if (!e.pubDate) return true;
    const age = Date.now() - new Date(e.pubDate).getTime();
    return age < 48 * 3600000; // 48 hours
  });

  const allText = recentEvents.map(e => `${e.title} ${e.description}`.toLowerCase()).join('\n');

  // Check tweet triggers (take the HIGHEST multiplier, not additive)
  for (const [key, config] of Object.entries(ELON_TWEET_TRIGGERS)) {
    for (const kw of config.keywords) {
      if (allText.includes(kw.toLowerCase())) {
        if (config.multiplier > maxMultiplier) {
          maxMultiplier = config.multiplier;
        }
        impactEvents.push({
          type: key,
          trigger: kw,
          multiplier: config.multiplier,
          label: config.label,
          direction: 'increase',
        });
        break; // One match per category
      }
    }
  }

  // Check suppressors
  for (const [key, config] of Object.entries(ELON_TWEET_SUPPRESSORS)) {
    for (const kw of config.keywords) {
      if (allText.includes(kw.toLowerCase())) {
        maxMultiplier = Math.min(maxMultiplier, config.multiplier);
        impactEvents.push({
          type: key,
          trigger: kw,
          multiplier: config.multiplier,
          label: config.label,
          direction: 'decrease',
        });
        break;
      }
    }
  }

  // If multiple triggers found, compound slightly (but cap at 2.5x)
  if (impactEvents.filter(e => e.direction === 'increase').length >= 2) {
    maxMultiplier = Math.min(maxMultiplier * 1.2, 2.5);
  }

  const detail = impactEvents.length > 0
    ? impactEvents.map(e => `${e.direction === 'increase' ? '🔥' : '🔇'} ${e.label}: "${e.trigger}" (${e.multiplier}x)`).join(' | ')
    : 'No significant events affecting Elon tweet rate';

  return {
    multiplier: Math.round(maxMultiplier * 100) / 100,
    events: impactEvents,
    detail,
    eventsScanned: recentEvents.length,
  };
}

/**
 * Generic cultural context for any market keyword.
 * Useful for other social media / trending markets.
 */
async function getGenericContext(keywords = []) {
  const events = await fetchCulturalEvents();
  if (events.length === 0 || keywords.length === 0) return { relevant: [], count: 0 };

  const relevant = events.filter(e => {
    const text = `${e.title} ${e.description}`.toLowerCase();
    return keywords.some(kw => text.includes(kw.toLowerCase()));
  });

  return {
    relevant: relevant.slice(0, 10).map(e => ({
      title: e.title,
      source: e.source,
      pubDate: e.pubDate,
    })),
    count: relevant.length,
  };
}

// ─── Cache ───────────────────────────────────────────────────────────
function saveEventCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      events: cachedEvents.slice(0, 100),
      lastFetch: lastFetchTime,
      savedAt: new Date().toISOString(),
    }, null, 2));
  } catch { /* non-critical */ }
}

function loadEventCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      cachedEvents = data.events || [];
      lastFetchTime = data.lastFetch || null;
    }
  } catch { /* fresh start */ }
}

// ─── API Key ─────────────────────────────────────────────────────────
function setNewsApiKey(key) {
  newsApiKey = key;
  log.info('CULTURAL', 'News API key set for cultural events');
}

function getStatus() {
  return {
    configured: true, // Google News RSS works without key
    hasNewsApi: !!newsApiKey,
    cachedEvents: cachedEvents.length,
    lastFetch: lastFetchTime ? new Date(lastFetchTime).toISOString() : null,
  };
}

// Init
loadEventCache();

module.exports = {
  fetchCulturalEvents,
  getYouTubeImpact,
  getElonTweetImpact,
  getGenericContext,
  setNewsApiKey,
  getStatus,
};
