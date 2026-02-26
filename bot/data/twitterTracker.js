/**
 * Twitter/X Tracker Signal Module — FREE Edition
 *
 * Tracks tweet counts and posting patterns WITHOUT paid Twitter API.
 *
 * Data sources (all free, no API key needed):
 *   1. Nitter instances — open-source Twitter frontend, public feeds
 *   2. X profile scraping — total tweet count from public profiles
 *   3. RapidAPI free tier — fallback if available
 *
 * For Polymarket markets like:
 *   "How many times will Elon tweet this week?"
 *   "Will @elonmusk post more than 120 tweets by Sunday?"
 *
 * Architecture:
 *   - Polls tweet count every 15-30 min via scan cycles
 *   - Diffs total count to get daily/weekly counts
 *   - Builds historical posting patterns (mean, std dev)
 *   - Calculates probability using statistical model
 *   - Cultural events module provides context (why more/fewer tweets)
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../logs/twitter-cache.json');

// ─── State ───────────────────────────────────────────────────────────
let rapidApiKey = null;       // Optional: RapidAPI key for fallback
let tweetCache = new Map();   // username → { dailyCounts, snapshots, totalAtSnapshot }
let marketMatches = new Map();

// ─── Nitter Instances (rotate to avoid rate limits) ──────────────────
const NITTER_INSTANCES = [
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
  'https://nitter.woodland.cafe',
  'https://nitter.esmailelbob.xyz',
  'https://nitter.1d4.us',
];
let nitterIdx = 0;

function getNextNitter() {
  const instance = NITTER_INSTANCES[nitterIdx % NITTER_INSTANCES.length];
  nitterIdx++;
  return instance;
}

// ─── Known Accounts ─────────────────────────────────────────────────
const TRACKED_ACCOUNTS = {
  'elonmusk':        { name: 'Elon Musk', avgDailyTweets: 35, stdDev: 12, peakDayMultiplier: 2.5, topics: ['tech', 'space', 'politics', 'crypto', 'ai'] },
  'realdonaldtrump': { name: 'Donald Trump', avgDailyTweets: 15, stdDev: 8, peakDayMultiplier: 3.0, topics: ['politics'] },
  'joebiden':        { name: 'Joe Biden', avgDailyTweets: 5, stdDev: 3, peakDayMultiplier: 2.0, topics: ['politics'] },
  'vaborehim':       { name: 'Vitalik Buterin', avgDailyTweets: 8, stdDev: 5, peakDayMultiplier: 2.5, topics: ['crypto', 'tech'] },
  'caborehim':       { name: 'CZ (Binance)', avgDailyTweets: 10, stdDev: 6, peakDayMultiplier: 2.0, topics: ['crypto'] },
};

// ─── Cache Management ────────────────────────────────────────────────
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (data.tweets) tweetCache = new Map(Object.entries(data.tweets));
      if (data.matches) marketMatches = new Map(Object.entries(data.matches));
      log.info('TW_TRACK', `Loaded ${tweetCache.size} tracked accounts, ${marketMatches.size} market matches`);
    }
  } catch { /* fresh start */ }
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      tweets: Object.fromEntries(tweetCache),
      matches: Object.fromEntries(marketMatches),
      savedAt: new Date().toISOString(),
    }, null, 2));
  } catch { /* non-critical */ }
}

// ─── Optional API Key (RapidAPI free tier) ───────────────────────────
function setApiKey(key) {
  if (!key || key.length < 10) throw new Error('Invalid RapidAPI key');
  rapidApiKey = key.trim();
  log.info('TW_TRACK', `RapidAPI key set for Twitter fallback (${rapidApiKey.slice(0, 6)}...)`);
}

function hasApiKey() { return !!rapidApiKey; }

// ─── Tweet Count Fetching (Multi-Source) ─────────────────────────────

/**
 * Get total tweet count for a user by scraping their X profile page.
 * X public profiles show total posts count without authentication.
 *
 * Falls through multiple sources:
 *   1. Nitter instance (structured HTML, easiest to parse)
 *   2. X.com profile (less reliable, may require JS)
 *   3. RapidAPI (if key provided)
 *   4. Cached baseline
 */
async function getTotalTweetCount(username) {
  // Try Nitter first (most reliable for scraping)
  const nitterCount = await tryNitterCount(username);
  if (nitterCount != null) return { count: nitterCount, source: 'nitter' };

  // Try X.com syndication endpoint
  const xCount = await tryXProfileCount(username);
  if (xCount != null) return { count: xCount, source: 'x.com' };

  // Try RapidAPI fallback
  if (rapidApiKey) {
    const rapidCount = await tryRapidApiCount(username);
    if (rapidCount != null) return { count: rapidCount, source: 'rapidapi' };
  }

  return null;
}

/**
 * Scrape tweet count from a Nitter instance.
 * Nitter renders plain HTML with tweet count in a stats element.
 */
async function tryNitterCount(username) {
  for (let i = 0; i < 3; i++) {
    const instance = getNextNitter();
    try {
      const url = `${instance}/${username}`;
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!resp.ok) continue;
      const html = await resp.text();

      // Nitter shows tweet count in various formats
      const patterns = [
        /class="posts"[^>]*>[\s\S]*?class="[^"]*stat-num[^"]*"[^>]*>([\d,]+)/i,
        /(?:tweets|posts)\s*<\/[^>]+>\s*[\s\S]*?>([\d,]+)/i,
        /stat-num[^>]*>([\d,KMkm.]+)<[\s\S]*?(?:tweet|post)/i,
        /([\d,]+)\s*<\/span>\s*[\s\S]{0,50}(?:tweet|post)/i,
      ];

      for (const pat of patterns) {
        const match = html.match(pat);
        if (match) {
          const count = parseCompactNumber(match[1]);
          if (count > 0) {
            log.info('TW_TRACK', `Nitter (${instance}): @${username} total tweets = ${count}`);
            return count;
          }
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Try to get tweet count from X.com syndication endpoint.
 */
async function tryXProfileCount(username) {
  try {
    const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) return null;
    const html = await resp.text();

    // Count tweet timestamps visible in the syndicated timeline
    const tweetDates = [];
    const dateMatches = html.matchAll(/datetime="(\d{4}-\d{2}-\d{2}T[\d:]+)/g);
    for (const m of dateMatches) {
      tweetDates.push(new Date(m[1]).getTime());
    }

    if (tweetDates.length > 0) {
      const now = Date.now();
      const last24h = tweetDates.filter(d => now - d < 86400000).length;
      log.info('TW_TRACK', `X syndication: @${username} visible recent tweets: ${last24h} (24h), ${tweetDates.length} total visible`);
      // Can't get total count from this; used as supplementary signal only
    }
  } catch {
    // Expected — syndication endpoint may be restricted
  }
  return null;
}

/**
 * RapidAPI fallback — various free Twitter scraper APIs.
 * Many offer 100-500 free requests/month.
 */
async function tryRapidApiCount(username) {
  if (!rapidApiKey) return null;

  try {
    const url = `https://twitter-api45.p.rapidapi.com/screenname.php?screenname=${username}`;
    const resp = await fetch(url, {
      headers: {
        'x-rapidapi-host': 'twitter-api45.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) return null;
    const data = await resp.json();

    const count = data.statuses_count || data.tweets_count || data.status_count;
    if (count && count > 0) {
      log.info('TW_TRACK', `RapidAPI: @${username} total tweets = ${count}`);
      return count;
    }
  } catch {
    // API error
  }
  return null;
}

// ─── Snapshot-Based Counting ─────────────────────────────────────────

/**
 * Record a total tweet count snapshot.
 * The diff between snapshots gives us tweets-per-period.
 */
function recordSnapshot(username, totalCount, source) {
  if (!tweetCache.has(username)) {
    tweetCache.set(username, { snapshots: [], dailyCounts: {}, lastChecked: null });
  }

  const entry = tweetCache.get(username);
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];

  // Avoid duplicate snapshots within 10 min
  const lastSnap = entry.snapshots[entry.snapshots.length - 1];
  if (lastSnap && now - lastSnap.ts < 600000) return;

  entry.snapshots.push({ total: totalCount, ts: now, source });
  entry.lastChecked = now;

  // Keep max 1000 snapshots (~7 days at 10min intervals)
  if (entry.snapshots.length > 1000) {
    entry.snapshots = entry.snapshots.slice(-1000);
  }

  // Calculate daily count from snapshot diffs
  if (entry.snapshots.length >= 2) {
    const todayStart = new Date(today).getTime();
    const todayFirstSnap = entry.snapshots.find(s => s.ts >= todayStart);
    if (todayFirstSnap) {
      entry.dailyCounts[today] = totalCount - todayFirstSnap.total;
    }
  }
}

/**
 * Get tweet count for a specific time period by diffing snapshots.
 */
function getTweetsInPeriod(username, sinceTs) {
  const entry = tweetCache.get(username);
  if (!entry?.snapshots || entry.snapshots.length < 2) return null;

  const snaps = entry.snapshots;
  const latest = snaps[snaps.length - 1];

  let closestToStart = null;
  let closestDiff = Infinity;

  for (const snap of snaps) {
    const diff = Math.abs(snap.ts - sinceTs);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestToStart = snap;
    }
  }

  if (!closestToStart) return null;

  if (closestDiff > 2 * 3600000) {
    log.warn('TW_TRACK', `Nearest snapshot to period start is ${Math.round(closestDiff / 3600000)}h away — estimate may be rough`);
  }

  const tweetsSince = latest.total - closestToStart.total;
  return Math.max(0, tweetsSince);
}

// ─── Posting Pattern Analysis ────────────────────────────────────────

function buildPattern(username) {
  const entry = tweetCache.get(username);
  if (!entry?.dailyCounts || Object.keys(entry.dailyCounts).length < 3) {
    const known = TRACKED_ACCOUNTS[username.toLowerCase()];
    if (known) {
      return {
        avgDaily: known.avgDailyTweets,
        stdDev: known.stdDev,
        peakMultiplier: known.peakDayMultiplier,
        source: 'baseline',
        dataPoints: 0,
      };
    }
    return null;
  }

  const counts = Object.values(entry.dailyCounts).filter(c => c >= 0);
  const n = counts.length;
  if (n < 2) return null;

  const mean = counts.reduce((a, b) => a + b, 0) / n;
  const variance = counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const maxDaily = Math.max(...counts);
  const peakMultiplier = mean > 0 ? maxDaily / mean : 1;

  const dayOfWeek = {};
  for (const [dateStr, count] of Object.entries(entry.dailyCounts)) {
    const day = new Date(dateStr).getDay();
    if (!dayOfWeek[day]) dayOfWeek[day] = [];
    dayOfWeek[day].push(count);
  }

  const dayAvgs = {};
  for (const [day, dayCounts] of Object.entries(dayOfWeek)) {
    dayAvgs[day] = dayCounts.reduce((a, b) => a + b, 0) / dayCounts.length;
  }

  return {
    avgDaily: Math.round(mean * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    dayOfWeekAvgs: dayAvgs,
    peakMultiplier: Math.round(peakMultiplier * 10) / 10,
    source: 'observed',
    dataPoints: n,
  };
}

function recordDailyCount(username, date, count) {
  const dateStr = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
  if (!tweetCache.has(username)) {
    tweetCache.set(username, { snapshots: [], dailyCounts: {}, lastChecked: null });
  }
  const entry = tweetCache.get(username);
  entry.dailyCounts[dateStr] = count;
  entry.lastChecked = Date.now();

  const dates = Object.keys(entry.dailyCounts).sort();
  if (dates.length > 90) {
    for (const old of dates.slice(0, dates.length - 90)) {
      delete entry.dailyCounts[old];
    }
  }
}

// ─── Probability Calculation ─────────────────────────────────────────

function calculateTweetProbability(username, currentCount, targetCount, hoursRemaining) {
  const pattern = buildPattern(username);
  if (!pattern) return null;

  const remaining = targetCount - currentCount;
  if (remaining <= 0) {
    return { prob: 0.95, confidence: 'HIGH', detail: `Already at ${currentCount} tweets (target: ${targetCount}) — already exceeded` };
  }

  const daysRemaining = hoursRemaining / 24;
  if (daysRemaining <= 0) {
    return { prob: currentCount >= targetCount ? 0.95 : 0.05, confidence: 'HIGH', detail: 'Deadline passed' };
  }

  const expectedRemaining = pattern.avgDaily * daysRemaining;
  const stdRemaining = pattern.stdDev * Math.sqrt(daysRemaining);

  const z = (remaining - expectedRemaining) / Math.max(stdRemaining, 0.1);
  const prob = 1 - normalCDF(z);
  const clampedProb = Math.max(0.02, Math.min(0.98, prob));

  const confidence =
    pattern.source === 'observed' && pattern.dataPoints >= 14 ? 'HIGH' :
    pattern.source === 'observed' && pattern.dataPoints >= 7 ? 'MEDIUM' : 'LOW';

  return {
    prob: Math.round(clampedProb * 1000) / 1000,
    confidence,
    detail: `${username}: ${currentCount} tweets so far, need ${remaining} more in ${daysRemaining.toFixed(1)} days | avg ${pattern.avgDaily}/day ±${pattern.stdDev} | expected remaining: ${Math.round(expectedRemaining)} | z-score: ${z.toFixed(2)}`,
    currentCount,
    targetCount,
    expectedRemaining: Math.round(expectedRemaining),
    zScore: Math.round(z * 100) / 100,
    pattern: pattern.source,
  };
}

function normalCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

// ─── Market Matching ─────────────────────────────────────────────────

function parseTwitterQuestion(question, marketEndDate) {
  if (!question) return null;
  const q = question.toLowerCase();

  const isTwitter = /tweet|twitter|elon.*post|post.*on x|x\.com|@\w+/i.test(q);
  if (!isTwitter) return null;

  let username = null;
  let accountInfo = null;

  const handleMatch = q.match(/@(\w+)/);
  if (handleMatch) {
    username = handleMatch[1].toLowerCase();
    accountInfo = TRACKED_ACCOUNTS[username] || null;
  }

  if (!username) {
    for (const [handle, info] of Object.entries(TRACKED_ACCOUNTS)) {
      if (q.includes(info.name.toLowerCase()) || q.includes(handle)) {
        username = handle;
        accountInfo = info;
        break;
      }
    }
  }

  if (!username && /elon/i.test(q)) {
    username = 'elonmusk';
    accountInfo = TRACKED_ACCOUNTS['elonmusk'];
  }

  if (!username) return null;

  let targetCount = null;
  const countPatterns = [
    /(?:over|more than|exceed|above)\s+(\d+)\s*(?:tweets|posts|times)/i,
    /(\d+)\s*(?:tweets|posts|times)\s*(?:or more|by|this|in)/i,
    /(?:reach|hit)\s+(\d+)\s*(?:tweets|posts)/i,
    /(\d+)\+?\s*(?:tweets|posts)/i,
  ];

  for (const pat of countPatterns) {
    const match = q.match(pat);
    if (match) {
      targetCount = parseInt(match[1]);
      break;
    }
  }

  const isOver = !/under|fewer|less than/i.test(q);

  let deadline = marketEndDate ? new Date(marketEndDate).getTime() : null;

  if (/this week/i.test(q) || /by sunday/i.test(q)) {
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() + (7 - now.getDay()));
    sunday.setHours(23, 59, 59);
    deadline = sunday.getTime();
  }

  return {
    username,
    accountInfo,
    targetCount,
    deadline,
    over: isOver,
    type: targetCount ? 'TWEET_COUNT' : 'GENERAL_TWITTER',
  };
}

// ─── Main Signal Function ────────────────────────────────────────────

async function getTwitterSignal(market) {
  const parsed = parseTwitterQuestion(market.question, market.endDate);
  if (!parsed) return null;

  const hoursRemaining = parsed.deadline
    ? (parsed.deadline - Date.now()) / 3600000
    : null;

  // Try to get live tweet count via scraping
  if (parsed.type === 'TWEET_COUNT' && parsed.targetCount && parsed.deadline) {
    try {
      const totalResult = await getTotalTweetCount(parsed.username);

      if (totalResult) {
        recordSnapshot(parsed.username, totalResult.count, totalResult.source);
        saveCache();

        const periodStart = getPeriodStartTs(market.question);
        const tweetsInPeriod = getTweetsInPeriod(parsed.username, periodStart);

        if (tweetsInPeriod != null) {
          const result = calculateTweetProbability(
            parsed.username, tweetsInPeriod, parsed.targetCount, hoursRemaining
          );

          if (result) {
            return {
              prob: parsed.over ? result.prob : 1 - result.prob,
              confidence: result.confidence,
              matchQuality: 0.85,
              matchValidated: true,
              detail: `[${totalResult.source}] ${result.detail}`,
              currentCount: result.currentCount,
              targetCount: result.targetCount,
              username: parsed.username,
              hoursRemaining: Math.round(hoursRemaining * 10) / 10,
              dataSource: totalResult.source,
            };
          }
        } else {
          log.info('TW_TRACK', `First snapshot for @${parsed.username}: ${totalResult.count} total tweets (${totalResult.source}). Need 2+ snapshots for period counting.`);
        }
      }
    } catch (err) {
      log.warn('TW_TRACK', `Live tweet count failed: ${err.message}`);
    }
  }

  // Fallback: use baseline pattern
  if (parsed.accountInfo && parsed.targetCount && hoursRemaining) {
    const result = calculateTweetProbability(
      parsed.username, 0, parsed.targetCount, hoursRemaining
    );
    if (result) {
      return {
        prob: parsed.over ? result.prob : 1 - result.prob,
        confidence: 'LOW',
        matchQuality: 0.6,
        matchValidated: false,
        detail: `BASELINE: ${result.detail} — waiting for scraping snapshots to build diff data`,
        username: parsed.username,
        isBaseline: true,
      };
    }
  }

  return null;
}

function getPeriodStartTs(question) {
  const q = question.toLowerCase();
  const now = new Date();

  if (/this week/i.test(q) || /by sunday/i.test(q)) {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return monday.getTime();
  }
  if (/this month/i.test(q)) {
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
  if (/today/i.test(q)) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

// ─── Helpers ─────────────────────────────────────────────────────────

function parseCompactNumber(str) {
  if (!str) return 0;
  str = str.replace(/,/g, '').trim();
  const lower = str.toLowerCase();
  if (lower.endsWith('k')) return parseFloat(lower) * 1000;
  if (lower.endsWith('m')) return parseFloat(lower) * 1000000;
  if (lower.endsWith('b')) return parseFloat(lower) * 1000000000;
  return parseInt(str) || 0;
}

function getStatus() {
  return {
    configured: true, // Always available — Nitter scraping needs no key
    hasRapidApi: !!rapidApiKey,
    trackedAccounts: tweetCache.size,
    matchedMarkets: marketMatches.size,
    source: 'Nitter Scraping + Snapshot Diffs (FREE)',
    knownAccounts: Object.keys(TRACKED_ACCOUNTS),
    nitterInstances: NITTER_INSTANCES.length,
  };
}

function getTrackedAccounts() {
  const result = [];
  for (const [username, data] of tweetCache) {
    const pattern = buildPattern(username);
    result.push({
      username,
      snapshots: data.snapshots?.length || 0,
      daysCounted: Object.keys(data.dailyCounts || {}).length,
      lastChecked: data.lastChecked,
      pattern,
    });
  }
  return result;
}

// Init
loadCache();

module.exports = {
  getTwitterSignal,
  setApiKey,
  hasApiKey,
  getStatus,
  getTrackedAccounts,
  parseTwitterQuestion,
  calculateTweetProbability,
  buildPattern,
  recordDailyCount,
  recordSnapshot,
  getTweetsInPeriod,
};
