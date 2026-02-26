/**
 * YouTube Tracker Signal Module
 *
 * Tracks video view velocity in real-time for Polymarket markets like:
 *   "Will MrBeast's next video hit 100M views by Friday?"
 *   "Will [video] reach X views in 24 hours?"
 *
 * How it works:
 * 1. Detects YouTube-related markets from question text
 * 2. Finds the relevant video via YouTube Data API v3
 * 3. Polls view count at intervals → builds velocity curve
 * 4. Extrapolates to deadline using decay-adjusted projection
 * 5. Returns data-driven probability (not guessing)
 *
 * Edge: Everyone else eyeballs it. We have the actual velocity math.
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../logs/youtube-cache.json');
const CACHE_TTL = 300000; // 5 min between API polls per video

// ─── State ───────────────────────────────────────────────────────────
let apiKey = null;
let videoCache = new Map();   // videoId → { snapshots: [{views, timestamp}], channelId, title }
let marketMatches = new Map(); // conditionId → { videoId, targetViews, deadline, channel }

// ─── YouTube Creator Database ────────────────────────────────────────
// Known creators with Polymarket-relevant audience sizes
const CREATORS = {
  'mrbeast':       { channelId: 'UCX6OQ3DkcsbYNE6H8uQQuVA', name: 'MrBeast', avgFirst24h: 80000000, avgFirst48h: 120000000 },
  'pewdiepie':     { channelId: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw', name: 'PewDiePie', avgFirst24h: 8000000, avgFirst48h: 15000000 },
  'markrober':     { channelId: 'UCY1kMZp36IQSyNx_9h4mpCg', name: 'Mark Rober', avgFirst24h: 20000000, avgFirst48h: 35000000 },
  'mkbhd':         { channelId: 'UCBJycsmduvYEL83R_U4JriQ', name: 'MKBHD', avgFirst24h: 5000000, avgFirst48h: 10000000 },
  'loganpaul':     { channelId: 'UCG8rbF3g2AMX70yOd8vqIZg', name: 'Logan Paul', avgFirst24h: 10000000, avgFirst48h: 18000000 },
  'ksi':           { channelId: 'UCGmnsW623G1ZkBMpNs68tg', name: 'KSI', avgFirst24h: 8000000, avgFirst48h: 14000000 },
  'ishowspeed':    { channelId: 'UCX6OQ3DkcsbYNE6H8uQQuVA', name: 'IShowSpeed', avgFirst24h: 12000000, avgFirst48h: 20000000 },
  'airrack':       { channelId: 'UCrHyYr15TKMblhsE0sgR_Cg', name: 'Airrack', avgFirst24h: 15000000, avgFirst48h: 25000000 },
  'dude perfect':  { channelId: 'UCRijo3ddMTht_IHyNSNXpNQ', name: 'Dude Perfect', avgFirst24h: 15000000, avgFirst48h: 25000000 },
  'ryan trahan':   { channelId: 'UCnmGIkw-KdI0W5siakKPKog', name: 'Ryan Trahan', avgFirst24h: 10000000, avgFirst48h: 18000000 },
};

// ─── Load / Save Cache ──────────────────────────────────────────────
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (data.videos) {
        videoCache = new Map(Object.entries(data.videos));
      }
      if (data.matches) {
        marketMatches = new Map(Object.entries(data.matches));
      }
      log.info('YT_TRACK', `Loaded ${videoCache.size} tracked videos, ${marketMatches.size} market matches`);
    }
  } catch { /* fresh start */ }
}

function saveCache() {
  try {
    const data = {
      videos: Object.fromEntries(videoCache),
      matches: Object.fromEntries(marketMatches),
      savedAt: new Date().toISOString(),
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  } catch { /* non-critical */ }
}

// ─── API Key ─────────────────────────────────────────────────────────
function setApiKey(key) {
  if (!key || key.length < 10) throw new Error('Invalid YouTube API key');
  apiKey = key.trim();
  log.info('YT_TRACK', `YouTube API key set (${apiKey.slice(0, 6)}...)`);
}

function hasApiKey() { return !!apiKey; }

// ─── YouTube API Calls ───────────────────────────────────────────────

/**
 * Get video statistics (views, likes, comments) from YouTube Data API v3.
 * Free quota: 10,000 units/day. videos.list = 1 unit per call.
 */
async function getVideoStats(videoId) {
  if (!apiKey) return null;

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,liveStreamingDetails&id=${videoId}&key=${apiKey}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      log.warn('YT_TRACK', `YouTube API error: ${resp.status}`);
      return null;
    }
    const data = await resp.json();
    if (!data.items || data.items.length === 0) return null;

    const item = data.items[0];
    return {
      videoId,
      title: item.snippet?.title,
      channelTitle: item.snippet?.channelTitle,
      channelId: item.snippet?.channelId,
      publishedAt: item.snippet?.publishedAt,
      viewCount: parseInt(item.statistics?.viewCount || '0'),
      likeCount: parseInt(item.statistics?.likeCount || '0'),
      commentCount: parseInt(item.statistics?.commentCount || '0'),
      isLive: !!item.liveStreamingDetails?.actualStartTime,
    };
  } catch (err) {
    log.warn('YT_TRACK', `Failed to get video stats: ${err.message}`);
    return null;
  }
}

/**
 * Search for a creator's most recent video.
 * Uses search.list (100 units per call — use sparingly).
 */
async function findLatestVideo(channelId, query = '') {
  if (!apiKey) return null;

  try {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=5&type=video&key=${apiKey}`;
    if (query) url += `&q=${encodeURIComponent(query)}`;

    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();

    if (!data.items || data.items.length === 0) return null;

    // Return most recent video
    const video = data.items[0];
    return {
      videoId: video.id?.videoId,
      title: video.snippet?.title,
      publishedAt: video.snippet?.publishedAt,
      channelTitle: video.snippet?.channelTitle,
    };
  } catch (err) {
    log.warn('YT_TRACK', `Search failed: ${err.message}`);
    return null;
  }
}

/**
 * Search YouTube for videos matching a query (when we don't know the channel).
 * 100 units per call.
 */
async function searchVideos(query, maxResults = 5) {
  if (!apiKey) return [];

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&order=viewCount&maxResults=${maxResults}&type=video&key=${apiKey}`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.items || []).map(item => ({
      videoId: item.id?.videoId,
      title: item.snippet?.title,
      channelTitle: item.snippet?.channelTitle,
      publishedAt: item.snippet?.publishedAt,
    }));
  } catch {
    return [];
  }
}

// ─── View Velocity Engine ────────────────────────────────────────────

/**
 * Record a view snapshot for a video.
 * Builds the velocity curve over time.
 */
function recordSnapshot(videoId, viewCount) {
  if (!videoCache.has(videoId)) {
    videoCache.set(videoId, { snapshots: [], firstSeen: Date.now() });
  }
  const entry = videoCache.get(videoId);
  entry.snapshots.push({ views: viewCount, ts: Date.now() });

  // Keep max 500 snapshots per video (at 5min intervals = ~42 hours)
  if (entry.snapshots.length > 500) {
    entry.snapshots = entry.snapshots.slice(-500);
  }
}

/**
 * Calculate current view velocity (views per hour) and acceleration.
 *
 * Returns:
 *   - currentVelocity: views/hour right now (last 30 min average)
 *   - avgVelocity: views/hour over entire tracking period
 *   - acceleration: % change in velocity (negative = slowing down)
 *   - projectedViews: extrapolated view count at deadline
 */
function calculateVelocity(videoId) {
  const entry = videoCache.get(videoId);
  if (!entry || entry.snapshots.length < 2) return null;

  const snaps = entry.snapshots;
  const latest = snaps[snaps.length - 1];
  const first = snaps[0];

  // Overall average velocity
  const totalHours = (latest.ts - first.ts) / 3600000;
  if (totalHours < 0.05) return null; // Need at least 3 min of data

  const totalViews = latest.views - first.views;
  const avgVelocity = totalViews / totalHours;

  // Recent velocity (last 30 min or last 6 snapshots)
  const recentIdx = Math.max(0, snaps.length - 7);
  const recentFirst = snaps[recentIdx];
  const recentHours = (latest.ts - recentFirst.ts) / 3600000;
  const recentViews = latest.views - recentFirst.views;
  const currentVelocity = recentHours > 0.05 ? recentViews / recentHours : avgVelocity;

  // Earlier velocity (for acceleration calc)
  let acceleration = 0;
  if (snaps.length >= 12) {
    const midIdx = Math.floor(snaps.length / 2);
    const earlyHours = (snaps[midIdx].ts - first.ts) / 3600000;
    const earlyViews = snaps[midIdx].views - first.views;
    const earlyVelocity = earlyHours > 0 ? earlyViews / earlyHours : avgVelocity;

    if (earlyVelocity > 0) {
      acceleration = (currentVelocity - earlyVelocity) / earlyVelocity;
    }
  }

  return {
    currentViews: latest.views,
    currentVelocity: Math.round(currentVelocity),
    avgVelocity: Math.round(avgVelocity),
    acceleration: Math.round(acceleration * 1000) / 1000, // e.g., -0.15 = slowing 15%
    hoursTracked: Math.round(totalHours * 100) / 100,
    snapshotCount: snaps.length,
  };
}

/**
 * Project views at a future deadline using decay-adjusted model.
 *
 * YouTube view decay follows a power-law curve:
 *   views(t) ≈ V₀ * t^α where α typically 0.5-0.8 for viral videos
 *
 * We fit α from observed data, then extrapolate.
 */
function projectViews(videoId, deadlineTs) {
  const vel = calculateVelocity(videoId);
  if (!vel) return null;

  const entry = videoCache.get(videoId);
  const hoursRemaining = (deadlineTs - Date.now()) / 3600000;
  if (hoursRemaining <= 0) {
    return { projected: vel.currentViews, confidence: 'HIGH', method: 'deadline_passed' };
  }

  // Method 1: Simple linear projection (baseline)
  const linearProjection = vel.currentViews + (vel.currentVelocity * hoursRemaining);

  // Method 2: Decay-adjusted projection
  // If velocity is decelerating, apply hourly decay rate
  let decayProjection = vel.currentViews;
  let hourlyVelocity = vel.currentVelocity;
  const hourlyDecay = vel.acceleration < 0
    ? Math.max(0.85, 1 + vel.acceleration / Math.max(vel.hoursTracked, 1)) // decay per hour
    : Math.min(1.05, 1 + vel.acceleration / Math.max(vel.hoursTracked, 1)); // growth per hour

  for (let h = 0; h < Math.min(hoursRemaining, 168); h++) { // max 1 week projection
    hourlyVelocity *= hourlyDecay;
    hourlyVelocity = Math.max(hourlyVelocity, vel.avgVelocity * 0.1); // floor at 10% of avg
    decayProjection += hourlyVelocity;
  }

  // Method 3: Power-law fit (if we have enough data)
  let powerLawProjection = null;
  if (entry.snapshots.length >= 6) {
    const snaps = entry.snapshots;
    const pubTime = entry.firstSeen;
    // Fit: log(views) = α * log(hours) + C
    const points = snaps.filter(s => s.ts > pubTime).map(s => ({
      logHours: Math.log(Math.max((s.ts - pubTime) / 3600000, 0.1)),
      logViews: Math.log(Math.max(s.views, 1)),
    }));

    if (points.length >= 4) {
      // Simple linear regression in log-log space
      const n = points.length;
      const sumX = points.reduce((s, p) => s + p.logHours, 0);
      const sumY = points.reduce((s, p) => s + p.logViews, 0);
      const sumXY = points.reduce((s, p) => s + p.logHours * p.logViews, 0);
      const sumX2 = points.reduce((s, p) => s + p.logHours * p.logHours, 0);

      const alpha = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const C = (sumY - alpha * sumX) / n;

      if (alpha > 0 && alpha < 2) {
        const totalHoursAtDeadline = (deadlineTs - pubTime) / 3600000;
        powerLawProjection = Math.exp(C + alpha * Math.log(totalHoursAtDeadline));
      }
    }
  }

  // Ensemble: weighted average of methods
  let projected;
  let method;
  if (powerLawProjection && vel.hoursTracked >= 2) {
    // Power law gets more weight as we get more data
    projected = Math.round(powerLawProjection * 0.4 + decayProjection * 0.4 + linearProjection * 0.2);
    method = 'ensemble_powerlaw';
  } else if (vel.hoursTracked >= 0.5) {
    projected = Math.round(decayProjection * 0.6 + linearProjection * 0.4);
    method = 'decay_adjusted';
  } else {
    projected = Math.round(linearProjection);
    method = 'linear';
  }

  // Confidence based on data quality
  const confidence =
    vel.hoursTracked >= 6 && vel.snapshotCount >= 20 ? 'HIGH' :
    vel.hoursTracked >= 1 && vel.snapshotCount >= 5 ? 'MEDIUM' : 'LOW';

  return {
    projected,
    linearProjection: Math.round(linearProjection),
    decayProjection: Math.round(decayProjection),
    powerLawProjection: powerLawProjection ? Math.round(powerLawProjection) : null,
    confidence,
    method,
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    currentVelocity: vel.currentVelocity,
    acceleration: vel.acceleration,
  };
}

// ─── Market Matching ─────────────────────────────────────────────────

/**
 * Parse a Polymarket question to detect YouTube view-count markets.
 *
 * Returns: { creator, targetViews, deadline, videoQuery } or null
 */
function parseYouTubeQuestion(question, marketEndDate) {
  if (!question) return null;
  const q = question.toLowerCase();

  // Must mention views/youtube/video + a creator or video reference
  const isYouTube = /youtube|video|views|watch|stream|subscriber|upload/i.test(q);
  if (!isYouTube) return null;

  // Detect creator
  let creator = null;
  for (const [key, info] of Object.entries(CREATORS)) {
    if (q.includes(key) || q.includes(info.name.toLowerCase())) {
      creator = { key, ...info };
      break;
    }
  }

  // Extract target view count
  // "100M views" → 100000000, "50 million views" → 50000000, "1B views" → 1000000000
  // Also handles "41 million or more views", "get 50M+ views", etc.
  let targetViews = null;
  const viewPatterns = [
    /(\d+(?:\.\d+)?)\s*[bB](?:illion)?\s*(?:or\s+more\s+|(?:\+\s*))?views/,
    /(\d+(?:\.\d+)?)\s*[mM](?:illion)?\s*(?:or\s+more\s+|(?:\+\s*))?views/,
    /(\d+(?:,\d{3})+)\s*(?:or\s+more\s+)?views/,
    /(\d+(?:\.\d+)?)\s*[kK]\s*(?:or\s+more\s+)?views/,
    /reach\s+(\d+(?:\.\d+)?)\s*[mMbBkK]/,
    /hit\s+(\d+(?:\.\d+)?)\s*[mMbBkK]/,
    /get\s+(\d+(?:\.\d+)?)\s*(?:million|[mM])\s*/,
    /(\d+(?:\.\d+)?)\s*million\s*(?:or\s+more\s+)?(?:views|hits|clicks)/,
  ];

  for (const pat of viewPatterns) {
    const match = q.match(pat);
    if (match) {
      let num = parseFloat(match[1].replace(/,/g, ''));
      if (/[bB](?:illion)?/.test(match[0])) num *= 1e9;
      else if (/million|[mM](?:illion)?/.test(match[0])) num *= 1e6;
      else if (/[kK]/.test(match[0])) num *= 1e3;
      targetViews = num;
      break;
    }
  }

  // Extract deadline from question or use market end date
  let deadline = marketEndDate ? new Date(marketEndDate).getTime() : null;
  const deadlinePatterns = [
    /by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /by\s+(\w+\s+\d{1,2})/i,
    /in\s+(\d+)\s*hours?/i,
    /in\s+(\d+)\s*days?/i,
    /within\s+(\d+)\s*hours?/i,
    /(\d+)\s*hours?/i,
  ];

  for (const pat of deadlinePatterns) {
    const match = q.match(pat);
    if (match) {
      if (/hours?/i.test(match[0])) {
        const hours = parseInt(match[1]);
        deadline = Date.now() + hours * 3600000;
      } else if (/days?/i.test(match[0])) {
        const days = parseInt(match[1]);
        deadline = Date.now() + days * 86400000;
      }
      // Day-of-week deadlines use market end date
      break;
    }
  }

  if (!creator && !targetViews) return null; // Not a YouTube market

  return {
    creator,
    targetViews,
    deadline,
    videoQuery: question.replace(/will|by|hit|reach|views|million|billion/gi, '').trim().slice(0, 50),
    type: targetViews ? 'VIEW_TARGET' : 'GENERAL_YOUTUBE',
  };
}

// ─── Main Signal Function ────────────────────────────────────────────

/**
 * Get YouTube signal for a market.
 * Returns probability based on real view velocity data.
 *
 * @param {Object} market - { question, conditionId, yesPrice, endDate }
 * @returns {Object|null} { prob, confidence, detail, ... }
 */
async function getYouTubeSignal(market) {
  const parsed = parseYouTubeQuestion(market.question, market.endDate);
  if (!parsed) return null;

  if (!apiKey) {
    log.warn('YT_TRACK', 'No YouTube API key — using baseline estimates only');
    return getBaselineEstimate(parsed, market);
  }

  try {
    // 1. Find the relevant video
    let videoId = null;
    let videoInfo = null;

    // Check if we already matched this market
    const cached = marketMatches.get(market.conditionId);
    if (cached?.videoId) {
      videoId = cached.videoId;
    }

    // Search for the video if not cached
    if (!videoId && parsed.creator) {
      const latest = await findLatestVideo(parsed.creator.channelId, parsed.videoQuery);
      if (latest?.videoId) {
        videoId = latest.videoId;
        log.info('YT_TRACK', `Matched "${market.question?.slice(0, 50)}" → "${latest.title}"`);
      }
    }

    if (!videoId && parsed.videoQuery) {
      const results = await searchVideos(parsed.videoQuery, 3);
      if (results.length > 0) {
        videoId = results[0].videoId;
        log.info('YT_TRACK', `Search match: "${results[0].title}"`);
      }
    }

    if (!videoId) {
      return getBaselineEstimate(parsed, market);
    }

    // 2. Get current stats
    videoInfo = await getVideoStats(videoId);
    if (!videoInfo) return getBaselineEstimate(parsed, market);

    // Cache the match
    marketMatches.set(market.conditionId, {
      videoId,
      title: videoInfo.title,
      channel: videoInfo.channelTitle,
      targetViews: parsed.targetViews,
      deadline: parsed.deadline,
    });

    // 3. Record snapshot for velocity tracking
    recordSnapshot(videoId, videoInfo.viewCount);

    // 4. Calculate probability
    if (parsed.type === 'VIEW_TARGET' && parsed.targetViews && parsed.deadline) {
      // SHORT-CIRCUIT: If current views already exceed target, it's near-certain
      if (videoInfo.viewCount >= parsed.targetViews) {
        const overshoot = videoInfo.viewCount / parsed.targetViews;
        // 0.95 base, scaling up to 0.99 as overshoot grows
        const prob = Math.min(0.99, 0.95 + 0.04 * Math.min((overshoot - 1) * 5, 1));
        saveCache();
        return {
          prob,
          confidence: 'HIGH',
          matchQuality: 0.99,
          matchValidated: true,
          detail: `TARGET ALREADY EXCEEDED — ${videoInfo.channelTitle}: ${formatViews(videoInfo.viewCount)} views (target was ${formatViews(parsed.targetViews)}, ${(overshoot).toFixed(2)}x overshoot)`,
          currentViews: videoInfo.viewCount,
          projectedViews: videoInfo.viewCount,
          targetViews: parsed.targetViews,
          velocity: null,
          method: 'target_exceeded',
          videoId,
          videoTitle: videoInfo.title,
          channel: videoInfo.channelTitle,
        };
      }

      const projection = projectViews(videoId, parsed.deadline);

      if (projection) {
        // Probability = P(views > target) using projection + uncertainty
        const ratio = projection.projected / parsed.targetViews;

        // Use a logistic function centered at ratio=1
        // steep near 1.0, asymptotes at 0 and 1
        const steepness = projection.confidence === 'HIGH' ? 8 : projection.confidence === 'MEDIUM' ? 5 : 3;
        const prob = 1 / (1 + Math.exp(-steepness * (ratio - 1)));
        const clampedProb = Math.max(0.02, Math.min(0.98, prob));

        saveCache();

        return {
          prob: Math.round(clampedProb * 1000) / 1000,
          confidence: projection.confidence,
          matchQuality: 0.95,
          matchValidated: true,
          detail: `${videoInfo.channelTitle}: ${formatViews(videoInfo.viewCount)} views → projected ${formatViews(projection.projected)} by deadline (target: ${formatViews(parsed.targetViews)}) | velocity: ${formatViews(projection.currentVelocity)}/hr (${projection.acceleration > 0 ? '+' : ''}${(projection.acceleration * 100).toFixed(1)}%/hr decay)`,
          currentViews: videoInfo.viewCount,
          projectedViews: projection.projected,
          targetViews: parsed.targetViews,
          velocity: projection.currentVelocity,
          acceleration: projection.acceleration,
          method: projection.method,
          videoId,
          videoTitle: videoInfo.title,
          channel: videoInfo.channelTitle,
        };
      }

      // SINGLE-SNAPSHOT FALLBACK: We have views but not enough data for velocity.
      // Use current views vs target ratio to estimate probability
      const hoursRemaining = (parsed.deadline - Date.now()) / 3600000;
      const currentRatio = videoInfo.viewCount / parsed.targetViews;

      if (hoursRemaining > 0 && currentRatio > 0) {
        // If already at 80%+ of target with time left, likely to hit
        // Simple model: logistic based on (currentRatio + timeBonus)
        const timeBonus = Math.min(hoursRemaining / 48, 0.3); // more time = higher chance
        const adjustedRatio = currentRatio + (currentRatio * timeBonus);
        const prob = 1 / (1 + Math.exp(-3 * (adjustedRatio - 1)));
        const clampedProb = Math.max(0.05, Math.min(0.95, prob));

        saveCache();
        return {
          prob: Math.round(clampedProb * 1000) / 1000,
          confidence: 'LOW',
          matchQuality: 0.8,
          matchValidated: true,
          detail: `${videoInfo.channelTitle}: ${formatViews(videoInfo.viewCount)} views (${(currentRatio * 100).toFixed(0)}% of ${formatViews(parsed.targetViews)} target) with ${Math.round(hoursRemaining)}h remaining — single-snapshot estimate, needs more polling for velocity`,
          currentViews: videoInfo.viewCount,
          targetViews: parsed.targetViews,
          method: 'single_snapshot',
          videoId,
          videoTitle: videoInfo.title,
          channel: videoInfo.channelTitle,
        };
      }
    }

    // Fallback: return view stats without projection
    saveCache();
    return {
      prob: null,
      confidence: 'LOW',
      detail: `Tracking ${videoInfo.channelTitle}: "${videoInfo.title}" — ${formatViews(videoInfo.viewCount)} views`,
      currentViews: videoInfo.viewCount,
      videoId,
      videoTitle: videoInfo.title,
    };

  } catch (err) {
    log.warn('YT_TRACK', `YouTube signal failed: ${err.message}`);
    return getBaselineEstimate(parsed, market);
  }
}

/**
 * Baseline estimate when we don't have real-time data.
 * Uses historical averages for known creators.
 */
function getBaselineEstimate(parsed, market) {
  if (!parsed.creator || !parsed.targetViews || !parsed.deadline) return null;

  const creator = parsed.creator;
  const hoursToDeadline = (parsed.deadline - Date.now()) / 3600000;
  if (hoursToDeadline <= 0) {
    // Deadline passed — can't estimate
    return { prob: 0.5, confidence: 'LOW', detail: 'Deadline has passed, no data available', isBaseline: true };
  }

  // Estimate using creator's historical average
  const daysToDeadline = hoursToDeadline / 24;
  // Rough model: views scale as sqrt(days) after first 48h
  let expectedViews;
  if (daysToDeadline <= 1) expectedViews = creator.avgFirst24h;
  else if (daysToDeadline <= 2) expectedViews = creator.avgFirst48h;
  else expectedViews = creator.avgFirst48h * Math.sqrt(daysToDeadline / 2);

  const ratio = expectedViews / parsed.targetViews;
  const prob = 1 / (1 + Math.exp(-3 * (ratio - 1)));
  const clampedProb = Math.max(0.05, Math.min(0.95, prob));

  return {
    prob: Math.round(clampedProb * 1000) / 1000,
    confidence: 'LOW',
    matchQuality: 0.6,
    matchValidated: false,
    detail: `Baseline estimate for ${creator.name}: avg ${formatViews(expectedViews)} in ${Math.round(daysToDeadline)}d (target: ${formatViews(parsed.targetViews)}) — NO REAL-TIME DATA, needs YouTube API key`,
    channel: creator.name,
    targetViews: parsed.targetViews,
    isBaseline: true,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────
function formatViews(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function getStatus() {
  return {
    configured: !!apiKey,
    trackedVideos: videoCache.size,
    matchedMarkets: marketMatches.size,
    source: 'YouTube Data API v3',
  };
}

function getTrackedVideos() {
  const result = [];
  for (const [videoId, data] of videoCache) {
    const vel = calculateVelocity(videoId);
    result.push({ videoId, ...vel, snapshotCount: data.snapshots?.length || 0 });
  }
  return result;
}

// Init
loadCache();

module.exports = {
  getYouTubeSignal,
  setApiKey,
  hasApiKey,
  getStatus,
  getTrackedVideos,
  calculateVelocity,
  projectViews,
  parseYouTubeQuestion,
  // For testing
  _recordSnapshot: recordSnapshot,
  _getVideoStats: getVideoStats,
};
