const noBets = require('./noBets');
const arbitrage = require('./arbitrage');
const sportsEdge = require('./sportsEdge');
const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// New strategies — optional (graceful if missing)
let momentum = null;
let whaleDetection = null;
let relativeValue = null;
try { momentum = require('./momentum'); } catch { /* optional */ }
try { whaleDetection = require('./whaleDetection'); } catch { /* optional */ }
try { relativeValue = require('./relativeValue'); } catch { /* optional */ }

const strategies = [
  noBets, arbitrage, sportsEdge,
  ...(momentum ? [momentum] : []),
  ...(whaleDetection ? [whaleDetection] : []),
  ...(relativeValue ? [relativeValue] : []),
];

const PERSISTENCE_FILE = path.join(__dirname, '..', 'logs', 'signal-persistence.json');

// ─── Signal Persistence Tracker ──────────────────────────────────────
// Tracks how many consecutive scans an opportunity has appeared.
// Persistent signals (seen 3+ scans) are more reliable than one-off blips.
const persistenceMap = new Map(); // key → { firstSeen, lastSeen, count, sides, avgScore }
const PERSISTENCE_TTL = 300000;   // 5 minutes — forget signals older than this

// Load from disk on startup
try {
  if (fs.existsSync(PERSISTENCE_FILE)) {
    const raw = JSON.parse(fs.readFileSync(PERSISTENCE_FILE, 'utf8'));
    const now = Date.now();
    for (const [key, data] of Object.entries(raw)) {
      if (now - data.lastSeen < PERSISTENCE_TTL) persistenceMap.set(key, data);
    }
    if (persistenceMap.size > 0) log.info('STRATEGY', `Loaded ${persistenceMap.size} signal persistence entries from disk`);
  }
} catch { /* use fresh */ }

function savePersistence() {
  try {
    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(Object.fromEntries(persistenceMap), null, 2));
  } catch { /* non-critical */ }
}

function trackPersistence(opportunities) {
  const now = Date.now();

  // Clean stale entries
  for (const [key, data] of persistenceMap) {
    if (now - data.lastSeen > PERSISTENCE_TTL) persistenceMap.delete(key);
  }

  // Update persistence for current opportunities
  for (const opp of opportunities) {
    const key = `${opp.conditionId}:${opp.strategy}:${opp.side}`;
    const existing = persistenceMap.get(key);

    if (existing) {
      existing.lastSeen = now;
      existing.count++;
      existing.scores.push(opp.score || 0);
      if (existing.scores.length > 10) existing.scores.shift();
    } else {
      persistenceMap.set(key, {
        firstSeen: now,
        lastSeen: now,
        count: 1,
        scores: [opp.score || 0],
      });
    }

    // Apply persistence bonus/penalty
    const data = persistenceMap.get(key);
    const scanCount = data.count;
    const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;

    // Bonus: persistent signals across 3+ scans get up to 15% score boost
    if (scanCount >= 5) {
      opp.score = Math.min(100, Math.round(opp.score * 1.15));
      opp.persistence = { scans: scanCount, avgScore: Math.round(avgScore), boost: '+15%' };
    } else if (scanCount >= 3) {
      opp.score = Math.min(100, Math.round(opp.score * 1.08));
      opp.persistence = { scans: scanCount, avgScore: Math.round(avgScore), boost: '+8%' };
    } else if (scanCount === 1) {
      // New signals get a slight penalty (could be noise)
      opp.persistence = { scans: 1, avgScore: Math.round(avgScore), boost: 'new' };
    } else {
      opp.persistence = { scans: scanCount, avgScore: Math.round(avgScore), boost: 'none' };
    }
  }

  savePersistence();
  return opportunities;
}

/**
 * Run all strategies against the current market snapshot
 * Returns a unified list of opportunities, ranked by expected value
 */
async function runAll(markets, bankroll) {
  const allOpportunities = [];

  for (const strategy of strategies) {
    try {
      const opps = await strategy.findOpportunities(markets, bankroll);
      allOpportunities.push(...opps);
      log.info('STRATEGY', `${strategy.name}: found ${opps.length} opportunities`);
    } catch (err) {
      log.error('STRATEGY', `${strategy.name} failed: ${err.message}`);
    }
  }

  // Deduplicate by conditionId (same market, pick highest score)
  const deduped = {};
  for (const opp of allOpportunities) {
    const key = `${opp.conditionId}-${opp.strategy}`;
    if (!deduped[key] || (opp.score || 0) > (deduped[key].score || 0)) {
      deduped[key] = opp;
    }
  }

  const ranked = Object.values(deduped).sort((a, b) => (b.score || 0) - (a.score || 0));

  // Apply persistence tracking (boosts persistent signals, flags new ones)
  return trackPersistence(ranked);
}

function getStrategyNames() {
  return strategies.map((s) => s.name);
}

module.exports = {
  runAll,
  getStrategyNames,
  noBets,
  arbitrage,
  sportsEdge,
};
