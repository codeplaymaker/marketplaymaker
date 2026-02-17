/**
 * Signal Credibility Tracker
 *
 * Tracks the historical accuracy of each signal type and strategy
 * to give users confidence metrics: "This signal type has been correct
 * X% of the time across Y resolved markets."
 *
 * This is what separates a toy from a professional tool — showing users
 * the statistical credibility of each recommendation.
 */

const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');

const DATA_FILE = path.join(__dirname, '..', 'logs', 'signal-credibility.json');

// Historical tracking per strategy
let credibility = {
  // strategy → { total, wins, losses, pending, winRate, avgScore, avgEdge, sampleSize, lastUpdated }
  NO_BETS: { total: 0, wins: 0, losses: 0, pending: 0, avgScore: 0, avgEdge: 0, scores: [] },
  ARBITRAGE: { total: 0, wins: 0, losses: 0, pending: 0, avgScore: 0, avgEdge: 0, scores: [] },
  SPORTS_EDGE: { total: 0, wins: 0, losses: 0, pending: 0, avgScore: 0, avgEdge: 0, scores: [] },
  ICT: { total: 0, wins: 0, losses: 0, pending: 0, avgScore: 0, avgEdge: 0, scores: [] },
};

// By confidence level
let byConfidence = {
  HIGH: { total: 0, wins: 0, losses: 0 },
  MEDIUM: { total: 0, wins: 0, losses: 0 },
  LOW: { total: 0, wins: 0, losses: 0 },
};

// By score bucket (for calibration)
let byScoreBucket = {};
// "70-80" → { total, wins, losses }

// Load from disk
try {
  if (fs.existsSync(DATA_FILE)) {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (saved.credibility) credibility = { ...credibility, ...saved.credibility };
    if (saved.byConfidence) byConfidence = { ...byConfidence, ...saved.byConfidence };
    if (saved.byScoreBucket) byScoreBucket = saved.byScoreBucket;
    log.info('CREDIBILITY', `Loaded signal credibility data`);
  }
} catch { /* fresh start */ }

function save() {
  try {
    fs.promises.writeFile(DATA_FILE, JSON.stringify({
      credibility, byConfidence, byScoreBucket, savedAt: new Date().toISOString(),
    }, null, 2));
  } catch { /* non-critical */ }
}

/**
 * Record that a signal was generated (pending outcome).
 */
function recordSignal(opportunity) {
  const strat = opportunity.strategy;
  if (!credibility[strat]) {
    credibility[strat] = { total: 0, wins: 0, losses: 0, pending: 0, avgScore: 0, avgEdge: 0, scores: [] };
  }

  credibility[strat].total++;
  credibility[strat].pending++;
  credibility[strat].scores.push(opportunity.score || 0);
  // Keep last 200 scores for rolling average
  if (credibility[strat].scores.length > 200) credibility[strat].scores.shift();
  credibility[strat].avgScore = credibility[strat].scores.reduce((a, b) => a + b, 0) / credibility[strat].scores.length;
}

/**
 * Record the resolution of a previously-generated signal.
 */
function recordResolution(strategy, won, score, edge) {
  const strat = strategy;
  if (!credibility[strat]) return;

  credibility[strat].pending = Math.max(0, credibility[strat].pending - 1);
  if (won) credibility[strat].wins++;
  else credibility[strat].losses++;

  // Score bucket tracking
  const bucket = `${Math.floor((score || 0) / 10) * 10}-${Math.floor((score || 0) / 10) * 10 + 10}`;
  if (!byScoreBucket[bucket]) byScoreBucket[bucket] = { total: 0, wins: 0, losses: 0 };
  byScoreBucket[bucket].total++;
  if (won) byScoreBucket[bucket].wins++;
  else byScoreBucket[bucket].losses++;

  save();
}

/**
 * Record resolution by confidence level.
 */
function recordConfidenceResult(confidence, won) {
  const level = confidence || 'LOW';
  if (!byConfidence[level]) byConfidence[level] = { total: 0, wins: 0, losses: 0 };
  byConfidence[level].total++;
  if (won) byConfidence[level].wins++;
  else byConfidence[level].losses++;
  save();
}

/**
 * Get the credibility report — the core value proposition for users.
 * Shows them exactly how reliable each signal type has been historically.
 */
function getReport() {
  const report = {};

  for (const [strat, data] of Object.entries(credibility)) {
    const resolved = data.wins + data.losses;
    const winRate = resolved > 0 ? data.wins / resolved : null;

    // Confidence interval (Wilson score interval at 95% confidence)
    let ci = null;
    if (resolved >= 10) {
      const z = 1.96;
      const p = winRate;
      const n = resolved;
      const denom = 1 + z * z / n;
      const center = (p + z * z / (2 * n)) / denom;
      const spread = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / denom;
      ci = {
        lower: Math.max(0, Math.round((center - spread) * 1000) / 1000),
        upper: Math.min(1, Math.round((center + spread) * 1000) / 1000),
      };
    }

    // Statistical significance tag
    let significance;
    if (resolved < 10) significance = 'INSUFFICIENT_DATA';
    else if (resolved < 30) significance = 'PRELIMINARY';
    else if (resolved < 100) significance = 'MODERATE';
    else significance = 'STRONG';

    // Sample size needed for 95% confidence at current win rate
    let samplesNeeded = null;
    if (winRate && winRate !== 0.5) {
      // For detecting edge at p<0.05: n > (z^2 * p * (1-p)) / E^2 where E = edge
      const edge = Math.abs(winRate - 0.5);
      samplesNeeded = Math.ceil((1.96 * 1.96 * winRate * (1 - winRate)) / (edge * edge));
    }

    report[strat] = {
      totalSignals: data.total,
      resolved,
      pending: data.pending,
      wins: data.wins,
      losses: data.losses,
      winRate: winRate != null ? Math.round(winRate * 1000) / 1000 : null,
      winRatePct: winRate != null ? `${(winRate * 100).toFixed(1)}%` : 'N/A',
      confidenceInterval: ci,
      significance,
      avgScore: Math.round(data.avgScore * 10) / 10,
      samplesNeeded,
      verdict: getVerdict(winRate, resolved, significance),
    };
  }

  return {
    strategies: report,
    byConfidence: Object.fromEntries(
      Object.entries(byConfidence).map(([level, data]) => {
        const resolved = data.wins + data.losses;
        return [level, {
          ...data,
          resolved,
          winRate: resolved > 0 ? Math.round(data.wins / resolved * 1000) / 1000 : null,
        }];
      })
    ),
    calibration: byScoreBucket,
    generatedAt: new Date().toISOString(),
  };
}

function getVerdict(winRate, resolved, significance) {
  if (significance === 'INSUFFICIENT_DATA') return 'Not enough data yet — need 10+ resolved signals';
  if (significance === 'PRELIMINARY') return 'Early results — treat with caution';
  if (winRate === null) return 'No data';
  if (winRate >= 0.60) return 'Strong performer — historically profitable';
  if (winRate >= 0.52) return 'Slight edge detected — monitor closely';
  if (winRate >= 0.48) return 'Near breakeven — edge may not cover fees';
  return 'Underperforming — consider reducing weight';
}

/**
 * Get a quick credibility badge for a single opportunity.
 * Returned as part of each opportunity for UI display.
 */
function getBadge(strategy, score) {
  const data = credibility[strategy];
  if (!data) return { label: 'NEW', color: 'gray', tooltip: 'No historical data' };

  const resolved = data.wins + data.losses;
  if (resolved < 5) return { label: 'NEW', color: 'gray', tooltip: `Only ${resolved} resolved signals` };

  const winRate = data.wins / resolved;
  if (winRate >= 0.60 && resolved >= 20) return { label: 'PROVEN', color: 'green', tooltip: `${(winRate * 100).toFixed(0)}% win rate across ${resolved} signals` };
  if (winRate >= 0.52 && resolved >= 15) return { label: 'PROMISING', color: 'blue', tooltip: `${(winRate * 100).toFixed(0)}% win rate across ${resolved} signals` };
  if (winRate >= 0.48) return { label: 'MIXED', color: 'yellow', tooltip: `${(winRate * 100).toFixed(0)}% win rate — near breakeven` };
  return { label: 'WEAK', color: 'red', tooltip: `${(winRate * 100).toFixed(0)}% win rate — below expectations` };
}

module.exports = {
  recordSignal,
  recordResolution,
  recordConfidenceResult,
  getReport,
  getBadge,
};
