/**
 * Picks Track Record System
 * 
 * Saves every generated acca to a history file, then uses The Odds API
 * /scores endpoint to automatically resolve legs once games complete.
 * 
 * Resolution logic:
 *   MONEYLINE (h2h) → did the picked team/draw win?
 *   SPREAD → did the picked team cover the spread?
 *   TOTAL (over/under) → was the total correct?
 * 
 * Tracks: win rate, ROI, P&L, streak, grade accuracy
 */

const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');

const HISTORY_FILE = path.join(__dirname, '..', 'logs', 'picks-history.json');
const SCORES_CACHE_FILE = path.join(__dirname, '..', 'logs', 'scores-cache.json');
const BASE_URL = 'https://api.the-odds-api.com/v4';

let picksHistory = [];       // All historical picks
let scoresCache = {};         // eventId → score data
let lastScoresFetch = null;

// ─── Persistence ─────────────────────────────────────────────────────
function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      picksHistory = raw.picks || [];
      log.info('PICKS_TRACKER', `Loaded ${picksHistory.length} historical picks`);
    }
  } catch (err) {
    log.warn('PICKS_TRACKER', `Failed to load history: ${err.message}`);
  }
}

function saveHistory() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify({
      picks: picksHistory,
      savedAt: new Date().toISOString(),
      totalPicks: picksHistory.length,
    }, null, 2));
  } catch (err) {
    log.warn('PICKS_TRACKER', `Failed to save history: ${err.message}`);
  }
}

function loadScoresCache() {
  try {
    if (fs.existsSync(SCORES_CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SCORES_CACHE_FILE, 'utf8'));
      scoresCache = raw.scores || {};
      lastScoresFetch = raw.lastFetch || null;
    }
  } catch { /* fresh start */ }
}

function saveScoresCache() {
  try {
    fs.writeFileSync(SCORES_CACHE_FILE, JSON.stringify({
      scores: scoresCache,
      lastFetch: lastScoresFetch,
      savedAt: new Date().toISOString(),
    }, null, 2));
  } catch { /* non-critical */ }
}

// Load on startup
loadHistory();
loadScoresCache();

// ─── Snapshot Accas into History ─────────────────────────────────────
/**
 * Called when new accas are built. Saves them to history if they're not
 * already there (dedup by acca ID + generatedAt date).
 */
function snapshotAccas(accas) {
  if (!accas || accas.length === 0) return;

  const today = new Date().toISOString().split('T')[0];
  let added = 0;

  for (const acca of accas) {
    // Create a stable ID for dedup: acca.id + date
    const historyId = `${acca.id}__${today}`;

    // Don't duplicate if already saved today with same legs
    if (picksHistory.some(p => p.historyId === historyId)) continue;

    picksHistory.push({
      historyId,
      accaId: acca.id,
      savedAt: new Date().toISOString(),
      generatedAt: acca.generatedAt,
      grade: acca.grade,
      numLegs: acca.numLegs,
      combinedOdds: acca.combinedOdds,
      evPercent: acca.evPercent,
      ev: acca.ev,
      crossSport: acca.crossSport,
      uniqueSports: acca.uniqueSports,
      kelly: acca.kelly,
      hypothetical: acca.hypothetical,
      dataQuality: acca.dataQuality,
      evConfidence: acca.evConfidence,
      legs: acca.legs.map(leg => ({
        match: leg.match,
        pick: leg.pick,
        odds: leg.odds,
        book: leg.book,
        sport: leg.sport,
        sportKey: leg.sportKey,
        betType: leg.betType,
        line: leg.line,
        legEV: leg.legEV,
        commenceTime: leg.commenceTime,
        eventId: leg.eventId || extractEventId(acca.id, leg),
        // Resolution fields (filled later)
        result: null,       // 'won' | 'lost' | 'push' | null
        score: null,        // { home: X, away: Y }
        resolvedAt: null,
      })),
      // Acca-level result
      result: 'pending',   // 'won' | 'lost' | 'partial' | 'pending'
      resolvedLegs: 0,
      wonLegs: 0,
      pnl: null,           // hypothetical P&L on $10 stake
      resolvedAt: null,
    });
    added++;
  }

  if (added > 0) {
    log.info('PICKS_TRACKER', `Saved ${added} new picks to history (total: ${picksHistory.length})`);
    saveHistory();
  }
}

/**
 * Extract event ID from the acca composite ID.
 * Acca IDs look like "eventId1:pick1|eventId2:pick2|..."
 */
function extractEventId(accaId, leg) {
  if (leg.eventId) return leg.eventId;
  // Try to parse from the acca ID
  const parts = (accaId || '').split('|');
  for (const part of parts) {
    const [evId, pick] = part.split(':');
    if (pick === leg.pick || part.includes(leg.pick)) return evId;
  }
  return null;
}

// ─── Fetch Scores from Odds API ──────────────────────────────────────
/**
 * Fetch completed game scores for sports that have pending picks.
 * Uses the /scores endpoint with daysFrom=3 (costs 2 credits per sport).
 */
async function fetchScores(apiKey) {
  if (!apiKey) {
    log.warn('PICKS_TRACKER', 'No API key available for scores');
    return 0;
  }

  // Find unique sports with pending legs
  const pendingSports = new Set();
  for (const pick of picksHistory) {
    if (pick.result === 'pending') {
      for (const leg of pick.legs) {
        if (!leg.result && leg.sportKey) {
          pendingSports.add(leg.sportKey);
        }
      }
    }
  }

  if (pendingSports.size === 0) {
    log.info('PICKS_TRACKER', 'No pending sports to check scores for');
    return 0;
  }

  log.info('PICKS_TRACKER', `Fetching scores for ${pendingSports.size} sports: ${[...pendingSports].join(', ')}`);

  let totalFetched = 0;
  for (const sport of pendingSports) {
    try {
      const url = `${BASE_URL}/sports/${sport}/scores/?apiKey=${apiKey}&daysFrom=3`;
      const res = await fetch(url);
      if (!res.ok) {
        log.warn('PICKS_TRACKER', `Scores API error for ${sport}: ${res.status}`);
        continue;
      }
      const data = await res.json();
      if (!Array.isArray(data)) continue;

      for (const game of data) {
        if (game.completed && game.scores) {
          scoresCache[game.id] = {
            sport_key: game.sport_key,
            home_team: game.home_team,
            away_team: game.away_team,
            scores: game.scores,
            completed: true,
            commence_time: game.commence_time,
            fetchedAt: new Date().toISOString(),
          };
          totalFetched++;
        }
      }
    } catch (err) {
      log.warn('PICKS_TRACKER', `Failed to fetch scores for ${sport}: ${err.message}`);
    }
  }

  lastScoresFetch = new Date().toISOString();
  if (totalFetched > 0) {
    saveScoresCache();
    log.info('PICKS_TRACKER', `Cached ${totalFetched} completed game scores`);
  }

  return totalFetched;
}

// ─── Resolve Picks ───────────────────────────────────────────────────
/**
 * Check each pending pick's legs against scores cache.
 * Resolve MONEYLINE, SPREAD, and TOTAL bets.
 */
function resolveAll() {
  let resolved = 0;

  for (const pick of picksHistory) {
    if (pick.result !== 'pending') continue;

    let allResolved = true;
    let allWon = true;
    let anyLost = false;

    for (const leg of pick.legs) {
      if (leg.result) continue; // Already resolved

      // Try to find score data for this leg
      const score = findScore(leg);
      if (!score) {
        allResolved = false;
        continue;
      }

      // Resolve the leg
      const result = resolveLeg(leg, score);
      leg.result = result;
      leg.score = score;
      leg.resolvedAt = new Date().toISOString();

      if (result === 'won') {
        pick.wonLegs++;
      } else if (result === 'lost') {
        anyLost = true;
        allWon = false;
      } else if (result === 'push') {
        // Push = neutral, doesn't break acca but doesn't count as won leg
      }
      pick.resolvedLegs++;
      resolved++;
    }

    // Determine acca-level result
    if (allResolved) {
      if (anyLost) {
        pick.result = 'lost';
        pick.pnl = -(pick.hypothetical?.stake || 10);
      } else if (allWon) {
        pick.result = 'won';
        pick.pnl = (pick.hypothetical?.payout || pick.combinedOdds * 10) - (pick.hypothetical?.stake || 10);
      } else {
        // Mix of won and push — calculate adjusted payout
        const pushLegs = pick.legs.filter(l => l.result === 'push').length;
        if (pushLegs === pick.numLegs) {
          pick.result = 'push';
          pick.pnl = 0;
        } else {
          // Adjust odds by removing push legs
          const activeOdds = pick.legs
            .filter(l => l.result === 'won')
            .reduce((acc, l) => acc * l.odds, 1);
          const stake = pick.hypothetical?.stake || 10;
          pick.result = 'won';
          pick.pnl = (activeOdds * stake) - stake;
        }
      }
      pick.resolvedAt = new Date().toISOString();
    }
  }

  if (resolved > 0) {
    log.info('PICKS_TRACKER', `Resolved ${resolved} legs`);
    saveHistory();
  }

  return resolved;
}

/**
 * Find score data for a leg — try by eventId first, then fuzzy match by teams.
 */
function findScore(leg) {
  // 1. Direct match by eventId
  if (leg.eventId && scoresCache[leg.eventId]) {
    const cached = scoresCache[leg.eventId];
    return parseScores(cached);
  }

  // 2. Fuzzy match by team names + commence time
  const matchParts = (leg.match || '').split(/\s+vs\.?\s+|\s+v\s+/i);
  if (matchParts.length < 2) return null;

  const team1 = matchParts[0].trim().toLowerCase();
  const team2 = matchParts[1].trim().toLowerCase();

  for (const [eventId, cached] of Object.entries(scoresCache)) {
    if (!cached.completed) continue;

    const home = (cached.home_team || '').toLowerCase();
    const away = (cached.away_team || '').toLowerCase();

    // Check if teams match (fuzzy — partial name match)
    const team1Matches = home.includes(team1) || away.includes(team1) ||
      team1.includes(home) || team1.includes(away);
    const team2Matches = home.includes(team2) || away.includes(team2) ||
      team2.includes(home) || team2.includes(away);

    if (team1Matches && team2Matches) {
      // Also check commence time is close (within 24h)
      if (leg.commenceTime) {
        const legTime = new Date(leg.commenceTime).getTime();
        const gameTime = new Date(cached.commence_time).getTime();
        if (Math.abs(legTime - gameTime) > 24 * 3600 * 1000) continue;
      }
      return parseScores(cached);
    }
  }

  return null;
}

function parseScores(cached) {
  if (!cached.scores || cached.scores.length < 2) return null;
  return {
    home: cached.home_team,
    away: cached.away_team,
    homeScore: parseInt(cached.scores[0]?.score || '0'),
    awayScore: parseInt(cached.scores[1]?.score || '0'),
    total: parseInt(cached.scores[0]?.score || '0') + parseInt(cached.scores[1]?.score || '0'),
  };
}

/**
 * Resolve a single leg based on bet type and scores.
 */
function resolveLeg(leg, score) {
  const pick = (leg.pick || '').trim();
  const betType = (leg.betType || 'MONEYLINE').toUpperCase();

  if (betType === 'MONEYLINE' || betType === 'H2H') {
    return resolveMoneyline(pick, score);
  } else if (betType === 'SPREAD') {
    return resolveSpread(pick, leg.line, score);
  } else if (betType === 'TOTAL') {
    return resolveTotal(pick, leg.line, score);
  }

  // Default: try moneyline
  return resolveMoneyline(pick, score);
}

function resolveMoneyline(pick, score) {
  const pickLower = pick.toLowerCase();

  // Check for draw/tie pick
  if (pickLower === 'draw' || pickLower === 'tie') {
    return score.homeScore === score.awayScore ? 'won' : 'lost';
  }

  // Determine winner
  const homeLower = score.home.toLowerCase();
  const awayLower = score.away.toLowerCase();

  const pickIsHome = homeLower.includes(pickLower) || pickLower.includes(homeLower) ||
    fuzzyTeamMatch(pickLower, homeLower);
  const pickIsAway = awayLower.includes(pickLower) || pickLower.includes(awayLower) ||
    fuzzyTeamMatch(pickLower, awayLower);

  if (pickIsHome) {
    if (score.homeScore > score.awayScore) return 'won';
    if (score.homeScore === score.awayScore) return 'push'; // Some books push on draw for h2h
    return 'lost';
  }

  if (pickIsAway) {
    if (score.awayScore > score.homeScore) return 'won';
    if (score.homeScore === score.awayScore) return 'push';
    return 'lost';
  }

  // Couldn't determine team — leave unresolved
  return null;
}

function resolveSpread(pick, line, score) {
  if (line == null) return null;

  const pickLower = pick.toLowerCase();
  const homeLower = score.home.toLowerCase();
  const awayLower = score.away.toLowerCase();

  const pickIsHome = homeLower.includes(pickLower) || pickLower.includes(homeLower) ||
    fuzzyTeamMatch(pickLower, homeLower);
  const pickIsAway = awayLower.includes(pickLower) || pickLower.includes(awayLower) ||
    fuzzyTeamMatch(pickLower, awayLower);

  let margin;
  if (pickIsHome) {
    margin = score.homeScore - score.awayScore + line;
  } else if (pickIsAway) {
    margin = score.awayScore - score.homeScore + line;
  } else {
    return null;
  }

  if (margin > 0) return 'won';
  if (margin === 0) return 'push';
  return 'lost';
}

function resolveTotal(pick, line, score) {
  if (line == null) return null;

  const pickLower = pick.toLowerCase();
  const total = score.total;

  if (pickLower.includes('over')) {
    if (total > line) return 'won';
    if (total === line) return 'push';
    return 'lost';
  }

  if (pickLower.includes('under')) {
    if (total < line) return 'won';
    if (total === line) return 'push';
    return 'lost';
  }

  return null;
}

/**
 * Fuzzy team matching — handles abbreviations and partial names.
 */
function fuzzyTeamMatch(pick, team) {
  // Split by spaces and check word overlap
  const pickWords = pick.split(/\s+/).filter(w => w.length > 2);
  const teamWords = team.split(/\s+/).filter(w => w.length > 2);

  if (pickWords.length === 0 || teamWords.length === 0) return false;

  const matches = pickWords.filter(pw =>
    teamWords.some(tw => tw.includes(pw) || pw.includes(tw))
  );

  return matches.length >= 1 && matches.length >= Math.min(pickWords.length, teamWords.length) * 0.5;
}

// ─── Track Record Stats ──────────────────────────────────────────────
function getTrackRecord() {
  const resolved = picksHistory.filter(p => p.result !== 'pending');
  const pending = picksHistory.filter(p => p.result === 'pending');
  const won = resolved.filter(p => p.result === 'won');
  const lost = resolved.filter(p => p.result === 'lost');
  const pushed = resolved.filter(p => p.result === 'push');

  const totalStake = resolved.reduce((s, p) => s + (p.hypothetical?.stake || 10), 0);
  const totalPnl = resolved.reduce((s, p) => s + (p.pnl || 0), 0);
  const roi = totalStake > 0 ? (totalPnl / totalStake * 100) : 0;

  // Streak calculation
  const sortedResolved = [...resolved].sort((a, b) =>
    new Date(b.resolvedAt || b.savedAt) - new Date(a.resolvedAt || a.savedAt)
  );
  let currentStreak = { type: null, count: 0 };
  for (const pick of sortedResolved) {
    if (pick.result === 'push') continue;
    if (!currentStreak.type) {
      currentStreak = { type: pick.result, count: 1 };
    } else if (pick.result === currentStreak.type) {
      currentStreak.count++;
    } else {
      break;
    }
  }

  // By grade breakdown
  const byGrade = {};
  for (const pick of resolved) {
    const g = pick.grade || '?';
    if (!byGrade[g]) byGrade[g] = { total: 0, won: 0, lost: 0, push: 0, pnl: 0 };
    byGrade[g].total++;
    byGrade[g][pick.result]++;
    byGrade[g].pnl += pick.pnl || 0;
  }

  // By sport breakdown
  const bySport = {};
  for (const pick of resolved) {
    const sports = [...new Set(pick.legs.map(l => l.sport || '?'))];
    for (const sp of sports) {
      if (!bySport[sp]) bySport[sp] = { total: 0, won: 0, lost: 0, pnl: 0 };
      bySport[sp].total++;
      bySport[sp][pick.result]++;
      bySport[sp].pnl += (pick.pnl || 0) / sports.length; // Split P&L across sports
    }
  }

  // Recent picks (last 20)
  const recent = [...picksHistory]
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    .slice(0, 20)
    .map(p => ({
      historyId: p.historyId,
      grade: p.grade,
      numLegs: p.numLegs,
      combinedOdds: round2(p.combinedOdds),
      evPercent: round2(p.evPercent),
      result: p.result,
      pnl: p.pnl != null ? round2(p.pnl) : null,
      savedAt: p.savedAt,
      resolvedAt: p.resolvedAt,
      wonLegs: p.wonLegs,
      resolvedLegs: p.resolvedLegs,
      legs: p.legs.map(l => ({
        match: l.match,
        pick: l.pick,
        sport: l.sport,
        betType: l.betType,
        odds: l.odds,
        result: l.result,
        score: l.score ? `${l.score.homeScore}-${l.score.awayScore}` : null,
      })),
    }));

  // Daily P&L for chart
  const dailyPnl = {};
  for (const pick of resolved) {
    const day = (pick.resolvedAt || pick.savedAt || '').split('T')[0];
    if (!day) continue;
    if (!dailyPnl[day]) dailyPnl[day] = { date: day, pnl: 0, won: 0, lost: 0 };
    dailyPnl[day].pnl += pick.pnl || 0;
    if (pick.result === 'won') dailyPnl[day].won++;
    if (pick.result === 'lost') dailyPnl[day].lost++;
  }

  return {
    summary: {
      totalPicks: picksHistory.length,
      resolved: resolved.length,
      pending: pending.length,
      won: won.length,
      lost: lost.length,
      pushed: pushed.length,
      winRate: resolved.length > 0 ? round2(won.length / (won.length + lost.length) * 100) : 0,
      totalStake: round2(totalStake),
      totalPnl: round2(totalPnl),
      roi: round2(roi),
      avgOdds: resolved.length > 0
        ? round2(resolved.reduce((s, p) => s + p.combinedOdds, 0) / resolved.length)
        : 0,
      currentStreak,
    },
    byGrade,
    bySport,
    recent,
    dailyPnl: Object.values(dailyPnl).sort((a, b) => a.date.localeCompare(b.date)),
    lastScoresFetch,
  };
}

/**
 * Get full history (paginated).
 */
function getHistory(page = 1, limit = 50) {
  const sorted = [...picksHistory].sort((a, b) =>
    new Date(b.savedAt) - new Date(a.savedAt)
  );
  const start = (page - 1) * limit;
  return {
    picks: sorted.slice(start, start + limit),
    total: picksHistory.length,
    page,
    totalPages: Math.ceil(picksHistory.length / limit),
  };
}

/**
 * Full check: fetch scores + resolve all pending picks.
 */
async function checkAndResolve(apiKey) {
  const fetched = await fetchScores(apiKey);
  const resolved = resolveAll();
  return { scoresFetched: fetched, legsResolved: resolved };
}

function round2(n) { return Math.round(n * 100) / 100; }

module.exports = {
  snapshotAccas,
  fetchScores,
  resolveAll,
  checkAndResolve,
  getTrackRecord,
  getHistory,
};
