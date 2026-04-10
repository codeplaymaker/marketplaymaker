/**
 * Adaptive Learner — Tracks win rates per entry type & session,
 * auto-adjusts weights and disables underperforming patterns.
 * Persists state to JSON file.
 */
const fs = require('fs');
const path = require('path');
const config = require('./config');
const log = require('../utils/logger');

const ENTRY_TYPES = ['FVG', 'OB', 'OTE', 'LiqSweep', 'Breaker'];
const SESSIONS = ['London', 'NY_AM', 'NY_PM', 'SilverAM', 'SilverPM', 'Macro'];

const STATE_FILE = path.join(__dirname, '../../data/ict-adaptive-state.json');
const TRADES_FILE = path.join(__dirname, '../../data/ict-trade-log.json');

let state = {
  entryStats: {},   // { FVG: { wins, total, winRate, weight }, ... }
  sessionStats: {}, // { London: { wins, total, winRate, enabled }, ... }
  consecLosses: 0,
  totalTrades: 0,
  trades: [],       // Rolling window of recent trades
};

function init() {
  // Init entry stats
  for (const t of ENTRY_TYPES) {
    state.entryStats[t] = { wins: 0, total: 0, winRate: 0.5, weight: 1.0 };
  }
  for (const s of SESSIONS) {
    state.sessionStats[s] = { wins: 0, total: 0, winRate: 0.5, enabled: true };
  }

  // Load persisted state
  load();
}

/**
 * Record a closed trade result
 */
function recordTrade(trade) {
  const { entryType, session, profit, isWin } = trade;

  // Track consecutive losses
  if (isWin) {
    state.consecLosses = 0;
  } else {
    state.consecLosses++;
  }
  state.totalTrades++;

  // Update entry stats
  if (state.entryStats[entryType]) {
    const es = state.entryStats[entryType];
    es.total++;
    if (isWin) es.wins++;
    es.winRate = es.total > 0 ? es.wins / es.total : 0.5;
  }

  // Update session stats
  if (session && state.sessionStats[session]) {
    const ss = state.sessionStats[session];
    ss.total++;
    if (isWin) ss.wins++;
    ss.winRate = ss.total > 0 ? ss.wins / ss.total : 0.5;

    // Auto-disable session if enough data and too low win rate
    if (ss.total >= 15 && ss.winRate < config.adaptMinWinRate) {
      ss.enabled = false;
      log.warn(`[ICT Adaptive] Disabled session ${session} — WR: ${(ss.winRate * 100).toFixed(1)}%`);
    } else {
      ss.enabled = true;
    }
  }

  // Recalc weights
  recalcWeights();

  // Add to rolling trade log
  state.trades.push({
    time: new Date().toISOString(),
    ...trade,
  });

  // Keep only last N trades
  if (state.trades.length > config.adaptWindowSize * 2) {
    state.trades = state.trades.slice(-config.adaptWindowSize);
  }

  // Persist
  save();

  log.info(`[ICT Adaptive] Trade recorded: ${isWin ? 'WIN' : 'LOSS'} | ${entryType} | ${session} | P/L: $${profit.toFixed(2)} | ConsecLoss: ${state.consecLosses}`);
}

/**
 * Recalculate entry type weights based on relative win rates
 */
function recalcWeights() {
  let avgWR = 0, count = 0;

  for (const t of ENTRY_TYPES) {
    const es = state.entryStats[t];
    if (es.total >= 5) {
      avgWR += es.winRate;
      count++;
    }
  }

  avgWR = count > 0 ? avgWR / count : 0.5;

  for (const t of ENTRY_TYPES) {
    const es = state.entryStats[t];
    if (es.total >= 5 && avgWR > 0) {
      es.weight = Math.max(0.3, Math.min(2.0, es.winRate / avgWR));
    } else {
      es.weight = 1.0; // Neutral until enough data
    }
  }
}

/**
 * Get the weight for an entry type (for confluence adjustment)
 */
function getWeight(entryType) {
  if (!config.useAdaptive) return 1.0;
  return state.entryStats[entryType]?.weight || 1.0;
}

/**
 * Check if an entry type should be skipped (win rate too low with enough data)
 */
function shouldSkipEntry(entryType) {
  if (!config.useAdaptive) return false;
  const es = state.entryStats[entryType];
  if (!es) return false;
  return es.total >= 10 && es.winRate < config.adaptMinWinRate;
}

/**
 * Check if a session is enabled
 */
function isSessionEnabled(session) {
  if (!config.useAdaptive) return true;
  return state.sessionStats[session]?.enabled !== false;
}

/**
 * Get lot size multiplier based on consecutive losses
 */
function getLotMultiplier() {
  if (!config.useAdaptive) return 1.0;
  if (state.consecLosses >= config.adaptConsecLossCut) {
    return config.adaptLossReduction;
  }
  return 1.0;
}

/**
 * Get summary for dashboard/telegram
 */
function getSummary() {
  const entries = {};
  for (const t of ENTRY_TYPES) {
    const es = state.entryStats[t];
    if (es.total > 0) {
      entries[t] = {
        winRate: `${(es.winRate * 100).toFixed(1)}%`,
        total: es.total,
        weight: es.weight.toFixed(2),
      };
    }
  }

  const sessions = {};
  for (const s of SESSIONS) {
    const ss = state.sessionStats[s];
    if (ss.total > 0) {
      sessions[s] = {
        winRate: `${(ss.winRate * 100).toFixed(1)}%`,
        total: ss.total,
        enabled: ss.enabled,
      };
    }
  }

  return {
    totalTrades: state.totalTrades,
    consecLosses: state.consecLosses,
    lotMultiplier: getLotMultiplier(),
    entries,
    sessions,
  };
}

// ── Persistence ──

function save() {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    log.error('[ICT Adaptive] Failed to save state:', e.message);
  }
}

function load() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      // Merge loaded data into state (preserving structure)
      if (data.entryStats) {
        for (const t of ENTRY_TYPES) {
          if (data.entryStats[t]) state.entryStats[t] = data.entryStats[t];
        }
      }
      if (data.sessionStats) {
        for (const s of SESSIONS) {
          if (data.sessionStats[s]) state.sessionStats[s] = data.sessionStats[s];
        }
      }
      state.consecLosses = data.consecLosses || 0;
      state.totalTrades = data.totalTrades || 0;
      state.trades = data.trades || [];
      log.info('[ICT Adaptive] State loaded — ' + state.totalTrades + ' historical trades');
    }
  } catch (e) {
    log.error('[ICT Adaptive] Failed to load state:', e.message);
  }
}

init();

module.exports = {
  recordTrade,
  getWeight,
  shouldSkipEntry,
  isSessionEnabled,
  getLotMultiplier,
  getSummary,
  getState: () => state,
};
