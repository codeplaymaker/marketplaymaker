/**
 * Strategy Auto-Optimizer — Dynamically adjusts strategy weights based on performance.
 *
 * Instead of manual config tuning, this module:
 *   1. Tracks every strategy's P&L, win rate, Sharpe ratio over rolling windows
 *   2. Uses Thompson Sampling (Bayesian bandits) to allocate capital
 *   3. Promotes/demotes strategies based on evidence, not gut feeling
 *   4. Adjusts risk parameters per-strategy based on observed volatility
 *   5. Generates weekly optimization reports
 *
 * Runs every 30 minutes, adjusting allocations based on recent performance.
 */
const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');

const STATE_FILE = path.join(__dirname, '..', 'logs', 'optimizer-state.json');

// ─── Strategy Performance Tracker ────────────────────────────────────
class StrategyTracker {
  constructor(name) {
    this.name = name;
    this.trades = []; // { pnl, size, timestamp, edge, resolution }
    this.alpha = 1;   // Beta distribution α (successes + 1)
    this.beta = 1;    // Beta distribution β (failures + 1)
    this.allocation = 1.0; // Current capital allocation multiplier (0.0 - 2.0)
    this.enabled = true;
    this.demotionReason = null;
    this.lastOptimized = null;

    // Rolling performance windows
    this.rollingPnl7d = 0;
    this.rollingPnl30d = 0;
    this.sharpe7d = 0;
    this.sharpe30d = 0;
    this.winRate7d = 0;
    this.winRate30d = 0;
    this.maxDrawdown = 0;
  }

  recordTrade(trade) {
    this.trades.push({
      pnl: trade.pnl || 0,
      size: trade.positionSize || trade.size || 0,
      edge: trade.edge || 0,
      timestamp: trade.timestamp || new Date().toISOString(),
      resolution: trade.resolution,
    });

    // Update Beta distribution
    if (trade.pnl > 0) {
      this.alpha += 1;
    } else if (trade.pnl < 0) {
      this.beta += 1;
    }

    // Keep max 500 trades per strategy
    if (this.trades.length > 500) {
      this.trades = this.trades.slice(-500);
    }

    this._recalculate();
  }

  _recalculate() {
    const now = Date.now();
    const d7 = 7 * 24 * 60 * 60 * 1000;
    const d30 = 30 * 24 * 60 * 60 * 1000;

    const trades7d = this.trades.filter(t => (now - new Date(t.timestamp).getTime()) < d7);
    const trades30d = this.trades.filter(t => (now - new Date(t.timestamp).getTime()) < d30);

    // PnL
    this.rollingPnl7d = trades7d.reduce((s, t) => s + t.pnl, 0);
    this.rollingPnl30d = trades30d.reduce((s, t) => s + t.pnl, 0);

    // Win rate
    this.winRate7d = trades7d.length > 0 ? trades7d.filter(t => t.pnl > 0).length / trades7d.length : 0;
    this.winRate30d = trades30d.length > 0 ? trades30d.filter(t => t.pnl > 0).length / trades30d.length : 0;

    // Sharpe ratio (daily returns annualized)
    this.sharpe7d = this._calcSharpe(trades7d);
    this.sharpe30d = this._calcSharpe(trades30d);

    // Max drawdown
    this.maxDrawdown = this._calcMaxDrawdown(trades30d);
  }

  _calcSharpe(trades) {
    if (trades.length < 3) return 0;
    const returns = trades.map(t => t.pnl / Math.max(t.size, 1));
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
    const std = Math.sqrt(variance);
    if (std === 0) return 0;
    return (mean / std) * Math.sqrt(252); // Annualized
  }

  _calcMaxDrawdown(trades) {
    let peak = 0;
    let cumPnl = 0;
    let maxDd = 0;
    for (const t of trades) {
      cumPnl += t.pnl;
      if (cumPnl > peak) peak = cumPnl;
      const dd = peak - cumPnl;
      if (dd > maxDd) maxDd = dd;
    }
    return maxDd;
  }

  // Thompson Sampling: sample from Beta(α, β) distribution
  sampleThompson() {
    return _betaSample(this.alpha, this.beta);
  }

  toJSON() {
    return {
      name: this.name,
      allocation: Math.round(this.allocation * 100) / 100,
      enabled: this.enabled,
      tradeCount: this.trades.length,
      alpha: this.alpha,
      beta: this.beta,
      winRate7d: Math.round(this.winRate7d * 1000) / 10,
      winRate30d: Math.round(this.winRate30d * 1000) / 10,
      pnl7d: Math.round(this.rollingPnl7d * 100) / 100,
      pnl30d: Math.round(this.rollingPnl30d * 100) / 100,
      sharpe7d: Math.round(this.sharpe7d * 100) / 100,
      sharpe30d: Math.round(this.sharpe30d * 100) / 100,
      maxDrawdown: Math.round(this.maxDrawdown * 100) / 100,
      demotionReason: this.demotionReason,
      lastOptimized: this.lastOptimized,
    };
  }
}

// Beta distribution sampling using Gamma sampling (Marsaglia method)
function _betaSample(alpha, beta) {
  const x = _gammaSample(alpha);
  const y = _gammaSample(beta);
  return x / (x + y);
}

function _gammaSample(shape) {
  if (shape < 1) {
    return _gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = _normalSample();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function _normalSample() {
  let u, v, s;
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);
  return u * Math.sqrt(-2 * Math.log(s) / s);
}

// ─── Optimizer State ─────────────────────────────────────────────────
const strategies = new Map(); // name → StrategyTracker
let _interval = null;
let _config = null;

function initialize(config) {
  _config = config;

  // Register known strategies
  const knownStrategies = [
    'NO_BETS', 'ARBITRAGE', 'SPORTS_EDGE', 'MOMENTUM', 'CONTRARIAN',
    'SHARP_MONEY', 'EARLY_MOVER', 'CROSS_PLATFORM', 'PROVEN_EDGE',
    'NEW_MARKET', 'NEWS_BREAK', 'PANIC_DIP',
  ];

  for (const name of knownStrategies) {
    if (!strategies.has(name)) {
      strategies.set(name, new StrategyTracker(name));
    }
  }

  // Load persisted state
  _loadState();

  log.info('OPTIMIZER', `Strategy auto-optimizer initialized: ${strategies.size} strategies tracked`);
}

function recordTrade(strategyName, trade) {
  if (!strategies.has(strategyName)) {
    strategies.set(strategyName, new StrategyTracker(strategyName));
  }
  strategies.get(strategyName).recordTrade(trade);
}

// ─── Optimization Run ────────────────────────────────────────────────
function optimize() {
  const MIN_TRADES_FOR_DECISION = 10;
  const results = [];

  for (const [name, tracker] of strategies) {
    if (tracker.trades.length < MIN_TRADES_FOR_DECISION) {
      tracker.allocation = 1.0; // Default allocation until enough data
      results.push({ strategy: name, action: 'insufficient_data', allocation: 1.0 });
      continue;
    }

    // Thompson Sampling to determine relative allocation
    const sample = tracker.sampleThompson();

    // Map sample to allocation: 0.3 (minimum) to 2.0 (maximum)
    // sample ∈ (0, 1), median ~0.5 for balanced strategy
    tracker.allocation = Math.max(0.3, Math.min(2.0, sample * 2.5));

    // Hard demotion rules
    let action = 'optimized';

    // Rule 1: Demotion if 30d Sharpe < -1.0 (consistently losing)
    if (tracker.sharpe30d < -1.0 && tracker.trades.length >= 20) {
      tracker.allocation = 0.3;
      tracker.demotionReason = `Sharpe 30d: ${tracker.sharpe30d.toFixed(2)}`;
      action = 'demoted_sharpe';
    }

    // Rule 2: Demotion if max drawdown > $200 AND win rate < 40%
    if (tracker.maxDrawdown > 200 && tracker.winRate30d < 0.40 && tracker.trades.length >= 15) {
      tracker.allocation = Math.min(tracker.allocation, 0.5);
      tracker.demotionReason = `DD: $${tracker.maxDrawdown.toFixed(0)}, WR: ${(tracker.winRate30d * 100).toFixed(0)}%`;
      action = 'demoted_drawdown';
    }

    // Rule 3: Promotion if Sharpe > 1.5 and consistent
    if (tracker.sharpe30d > 1.5 && tracker.winRate30d >= 0.55) {
      tracker.allocation = Math.max(tracker.allocation, 1.5);
      action = 'promoted';
    }

    // Rule 4: Disable if 30+ trades and < 30% win rate
    if (tracker.trades.length >= 30 && tracker.winRate30d < 0.30) {
      tracker.enabled = false;
      tracker.demotionReason = `Win rate: ${(tracker.winRate30d * 100).toFixed(0)}% over ${tracker.trades.length} trades`;
      action = 'disabled';
    }

    // Rule 5: Re-enable previously disabled strategies if they show recovery
    // Check 7d window which has fresher data — if win rate recovers above 40%
    // and they have enough recent trades, give them another chance on probation
    if (!tracker.enabled && tracker.winRate7d >= 0.40 && tracker.trades.filter(t => {
      return (Date.now() - new Date(t.timestamp).getTime()) < 7 * 24 * 60 * 60 * 1000;
    }).length >= 5) {
      tracker.enabled = true;
      tracker.allocation = 0.5; // Probation: half allocation
      tracker.demotionReason = null;
      action = 're-enabled_probation';
      log.info('OPTIMIZER', `Re-enabled ${name} on probation (7d WR: ${(tracker.winRate7d * 100).toFixed(0)}%)`);
    }

    tracker.lastOptimized = new Date().toISOString();
    tracker.allocation = Math.round(tracker.allocation * 100) / 100;
    results.push({ strategy: name, action, allocation: tracker.allocation, sample: Math.round(sample * 1000) / 1000 });
  }

  _saveState();

  log.info('OPTIMIZER', `Optimization complete: ${results.filter(r => r.action !== 'insufficient_data').length} strategies adjusted`);
  return results;
}

// ─── Capital Allocation Query ────────────────────────────────────────
function getAllocation(strategyName) {
  const tracker = strategies.get(strategyName);
  if (!tracker) return 1.0;
  if (!tracker.enabled) return 0;
  return tracker.allocation;
}

function isEnabled(strategyName) {
  const tracker = strategies.get(strategyName);
  return tracker ? tracker.enabled : true;
}

function getReport() {
  const report = [];
  for (const [, tracker] of strategies) {
    report.push(tracker.toJSON());
  }
  report.sort((a, b) => b.pnl30d - a.pnl30d);
  return {
    strategies: report,
    totalStrategies: report.length,
    enabledCount: report.filter(r => r.enabled !== false).length,
    topPerformer: report[0]?.name || 'N/A',
    worstPerformer: report[report.length - 1]?.name || 'N/A',
    timestamp: new Date().toISOString(),
  };
}

// ─── Persistence ─────────────────────────────────────────────────────
function _saveState() {
  try {
    const state = {};
    for (const [name, tracker] of strategies) {
      state[name] = {
        alpha: tracker.alpha,
        beta: tracker.beta,
        allocation: tracker.allocation,
        enabled: tracker.enabled,
        demotionReason: tracker.demotionReason,
        lastOptimized: tracker.lastOptimized,
        trades: tracker.trades.slice(-100), // Keep last 100 for recovery
      };
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    log.debug('OPTIMIZER', `Save state failed: ${err.message}`);
  }
}

function _loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return;
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

    for (const [name, saved] of Object.entries(state)) {
      let tracker = strategies.get(name);
      if (!tracker) {
        tracker = new StrategyTracker(name);
        strategies.set(name, tracker);
      }
      tracker.alpha = saved.alpha || 1;
      tracker.beta = saved.beta || 1;
      tracker.allocation = saved.allocation || 1.0;
      tracker.enabled = saved.enabled !== false;
      tracker.demotionReason = saved.demotionReason;
      tracker.lastOptimized = saved.lastOptimized;
      if (Array.isArray(saved.trades)) {
        tracker.trades = saved.trades;
        tracker._recalculate();
      }
    }

    log.info('OPTIMIZER', `Loaded optimizer state: ${Object.keys(state).length} strategies`);
  } catch (err) {
    log.debug('OPTIMIZER', `Load state failed: ${err.message}`);
  }
}

// ─── Scheduled Optimization ──────────────────────────────────────────
function start(intervalMs = 30 * 60 * 1000) { // Default: every 30 min
  _interval = setInterval(() => {
    try { optimize(); } catch (err) { log.warn('OPTIMIZER', `Optimization failed: ${err.message}`); }
  }, intervalMs);
  log.info('OPTIMIZER', `Auto-optimizer started: runs every ${intervalMs / 60000}min`);
}

function stop() {
  if (_interval) clearInterval(_interval);
  _interval = null;
}

module.exports = {
  initialize,
  recordTrade,
  optimize,
  getAllocation,
  isEnabled,
  getReport,
  start,
  stop,
};
