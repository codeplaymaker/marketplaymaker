/**
 * Picks Learning Engine
 * 
 * Analyzes historical pick outcomes to generate calibration adjustments.
 * These adjustments are fed back into the accaBuilder to improve future picks.
 * 
 * What it learns:
 *   1. Sport reliability    — which sports hit more often → boost/penalize sport weights
 *   2. Bet type performance — ML vs spread vs total → prefer winning types
 *   3. Odds range sweet spot — which odds ranges produce more wins
 *   4. Grade calibration    — are our grades accurate predictors?
 *   5. Bookmaker accuracy   — which sharp sources produce correct lines
 *   6. EV threshold tuning  — what min EV actually produces +ROI
 *   7. Leg count optimization — 2-leg vs 3-leg vs 4-leg hit rates
 *   8. Data quality validation — does "excellent" really beat "good"?
 * 
 * Minimum sample sizes enforced to avoid overfitting on small data.
 */

const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');

const HISTORY_FILE = path.join(__dirname, '..', 'logs', 'picks-history.json');
const LEARNING_FILE = path.join(__dirname, '..', 'logs', 'picks-learning.json');
const MIN_SAMPLES = 5;  // Minimum resolved picks before generating adjustments

let learningState = null;
let lastLearnTime = null;

// Load existing learning state
try {
  if (fs.existsSync(LEARNING_FILE)) {
    learningState = JSON.parse(fs.readFileSync(LEARNING_FILE, 'utf8'));
    lastLearnTime = learningState?.learnedAt || null;
    log.info('LEARNER', `Loaded learning state (${learningState?.totalResolved || 0} resolved picks)`);
  }
} catch { /* fresh start */ }

/**
 * Load resolved picks from history and analyze patterns.
 */
function learn() {
  let picks = [];
  try {
    if (!fs.existsSync(HISTORY_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    picks = (raw.picks || []).filter(p => p.result !== 'pending');
  } catch {
    return null;
  }

  if (picks.length < MIN_SAMPLES) {
    log.info('LEARNER', `Only ${picks.length} resolved picks — need ${MIN_SAMPLES} minimum to learn`);
    return null;
  }

  const won = picks.filter(p => p.result === 'won');
  const lost = picks.filter(p => p.result === 'lost');

  // ─── 1. Sport Win Rates ──────────────────────────────────────────
  const sportStats = {};
  for (const pick of picks) {
    const sports = [...new Set((pick.legs || []).map(l => getSportGroup(l.sportKey || l.sport)))];
    for (const sp of sports) {
      if (!sportStats[sp]) sportStats[sp] = { total: 0, won: 0, legWins: 0, legTotal: 0 };
      sportStats[sp].total++;
      if (pick.result === 'won') sportStats[sp].won++;
    }
    // Per-leg stats
    for (const leg of (pick.legs || [])) {
      const sp = getSportGroup(leg.sportKey || leg.sport);
      if (!sportStats[sp]) sportStats[sp] = { total: 0, won: 0, legWins: 0, legTotal: 0 };
      sportStats[sp].legTotal++;
      if (leg.result === 'won') sportStats[sp].legWins++;
    }
  }

  const sportAdjustments = {};
  for (const [sport, stats] of Object.entries(sportStats)) {
    if (stats.legTotal < MIN_SAMPLES) continue;
    const legWinRate = stats.legWins / stats.legTotal;
    // Baseline expectation: ~55-65% leg win rate for +EV picks
    // Adjustment: if a sport wins way more/less, shift the EV multiplier
    const adjustment = legWinRate > 0.65 ? 1.15 :
                       legWinRate > 0.55 ? 1.05 :
                       legWinRate > 0.45 ? 1.00 :
                       legWinRate > 0.35 ? 0.90 : 0.80;
    sportAdjustments[sport] = {
      legWinRate: round(legWinRate),
      legTotal: stats.legTotal,
      accaWinRate: stats.total > 0 ? round(stats.won / stats.total) : 0,
      adjustment,
    };
  }

  // ─── 2. Bet Type Performance ─────────────────────────────────────
  const betTypeStats = {};
  for (const pick of picks) {
    for (const leg of (pick.legs || [])) {
      const bt = (leg.betType || 'MONEYLINE').toUpperCase();
      if (!betTypeStats[bt]) betTypeStats[bt] = { total: 0, won: 0 };
      betTypeStats[bt].total++;
      if (leg.result === 'won') betTypeStats[bt].won++;
    }
  }

  const betTypeAdjustments = {};
  for (const [bt, stats] of Object.entries(betTypeStats)) {
    if (stats.total < MIN_SAMPLES) continue;
    const winRate = stats.won / stats.total;
    betTypeAdjustments[bt] = {
      winRate: round(winRate),
      total: stats.total,
      adjustment: winRate > 0.60 ? 1.10 :
                  winRate > 0.50 ? 1.00 :
                  winRate > 0.40 ? 0.90 : 0.80,
    };
  }

  // ─── 3. Odds Range Analysis ──────────────────────────────────────
  const oddsRanges = [
    { label: '1.20-1.60', min: 1.20, max: 1.60 },
    { label: '1.60-2.00', min: 1.60, max: 2.00 },
    { label: '2.00-2.50', min: 2.00, max: 2.50 },
    { label: '2.50-3.50', min: 2.50, max: 3.50 },
    { label: '3.50-4.50', min: 3.50, max: 4.50 },
  ];

  const oddsRangeStats = {};
  for (const range of oddsRanges) {
    oddsRangeStats[range.label] = { total: 0, won: 0 };
  }

  for (const pick of picks) {
    for (const leg of (pick.legs || [])) {
      const odds = leg.odds || 0;
      for (const range of oddsRanges) {
        if (odds >= range.min && odds < range.max) {
          oddsRangeStats[range.label].total++;
          if (leg.result === 'won') oddsRangeStats[range.label].won++;
          break;
        }
      }
    }
  }

  const bestOddsRange = Object.entries(oddsRangeStats)
    .filter(([, s]) => s.total >= MIN_SAMPLES)
    .sort((a, b) => (b[1].won / b[1].total) - (a[1].won / a[1].total))[0];

  // ─── 4. Grade Calibration ───────────────────────────────────────
  const gradeStats = {};
  for (const pick of picks) {
    const g = pick.grade || '?';
    if (!gradeStats[g]) gradeStats[g] = { total: 0, won: 0, pnl: 0 };
    gradeStats[g].total++;
    if (pick.result === 'won') gradeStats[g].won++;
    gradeStats[g].pnl += pick.pnl || 0;
  }

  const gradeCalibration = {};
  for (const [grade, stats] of Object.entries(gradeStats)) {
    if (stats.total < 3) continue;
    const winRate = stats.won / stats.total;
    const roi = stats.pnl / (stats.total * 10) * 100; // $10 per pick
    gradeCalibration[grade] = {
      winRate: round(winRate),
      roi: round(roi),
      total: stats.total,
      // Is the grade honestly calibrated?
      calibrated: (grade === 'S' && winRate > 0.30) ||
                  (grade === 'A' && winRate > 0.25) ||
                  (grade === 'B' && winRate > 0.15) ||
                  (grade === 'C'),
    };
  }

  // ─── 5. Bookmaker Accuracy ──────────────────────────────────────
  const bookStats = {};
  for (const pick of picks) {
    for (const leg of (pick.legs || [])) {
      const book = leg.book || '?';
      if (!bookStats[book]) bookStats[book] = { total: 0, won: 0 };
      bookStats[book].total++;
      if (leg.result === 'won') bookStats[book].won++;
    }
  }

  const bookReliability = {};
  for (const [book, stats] of Object.entries(bookStats)) {
    if (stats.total < MIN_SAMPLES) continue;
    bookReliability[book] = {
      winRate: round(stats.won / stats.total),
      total: stats.total,
    };
  }

  // ─── 6. EV Threshold Analysis ───────────────────────────────────
  const evBuckets = [
    { label: '1.5-3%', min: 1.5, max: 3 },
    { label: '3-5%', min: 3, max: 5 },
    { label: '5-8%', min: 5, max: 8 },
    { label: '8-15%', min: 8, max: 15 },
    { label: '15%+', min: 15, max: 100 },
  ];

  const evStats = {};
  for (const bucket of evBuckets) {
    evStats[bucket.label] = { total: 0, won: 0, pnl: 0 };
  }
  for (const pick of picks) {
    const ev = pick.evPercent || 0;
    for (const bucket of evBuckets) {
      if (ev >= bucket.min && ev < bucket.max) {
        evStats[bucket.label].total++;
        if (pick.result === 'won') evStats[bucket.label].won++;
        evStats[bucket.label].pnl += pick.pnl || 0;
        break;
      }
    }
  }

  // Find the EV range with best ROI
  const bestEvRange = Object.entries(evStats)
    .filter(([, s]) => s.total >= 3)
    .sort((a, b) => (b[1].pnl / Math.max(b[1].total, 1)) - (a[1].pnl / Math.max(a[1].total, 1)))[0];

  // ─── 7. Leg Count Optimization ──────────────────────────────────
  const legCountStats = {};
  for (const pick of picks) {
    const n = pick.numLegs || pick.legs?.length || 0;
    if (!legCountStats[n]) legCountStats[n] = { total: 0, won: 0, pnl: 0 };
    legCountStats[n].total++;
    if (pick.result === 'won') legCountStats[n].won++;
    legCountStats[n].pnl += pick.pnl || 0;
  }

  const legCountCalibration = {};
  let bestLegCount = null;
  let bestLegRoi = -Infinity;
  for (const [n, stats] of Object.entries(legCountStats)) {
    if (stats.total < 3) continue;
    const winRate = stats.won / stats.total;
    const roi = stats.pnl / (stats.total * 10) * 100;
    legCountCalibration[n] = { winRate: round(winRate), roi: round(roi), total: stats.total };
    if (roi > bestLegRoi) { bestLegRoi = roi; bestLegCount = parseInt(n); }
  }

  // ─── 8. Data Quality Validation ─────────────────────────────────
  const dqStats = {};
  for (const pick of picks) {
    const dq = pick.dataQuality || '?';
    if (!dqStats[dq]) dqStats[dq] = { total: 0, won: 0, pnl: 0 };
    dqStats[dq].total++;
    if (pick.result === 'won') dqStats[dq].won++;
    dqStats[dq].pnl += pick.pnl || 0;
  }

  // ─── Compile Adjustments ────────────────────────────────────────
  const adjustments = {
    // Sport-specific EV multipliers (applied to legEV in accaBuilder)
    sportMultipliers: {},
    // Bet type preferences (applied as bonus/penalty to leg selection)
    betTypeMultipliers: {},
    // Recommended min/max odds
    preferredOddsRange: bestOddsRange ? bestOddsRange[0] : null,
    // Recommended leg count
    preferredLegCount: bestLegCount,
    // Min EV that's actually profitable
    minProfitableEV: bestEvRange ? parseFloat(bestEvRange[0].split('-')[0]) : null,
    // Grade score adjustments
    gradeBoosts: {},
  };

  // Build sport multipliers
  for (const [sport, data] of Object.entries(sportAdjustments)) {
    adjustments.sportMultipliers[sport] = data.adjustment;
  }

  // Build bet type multipliers
  for (const [bt, data] of Object.entries(betTypeAdjustments)) {
    adjustments.betTypeMultipliers[bt] = data.adjustment;
  }

  // Grade boosts: if a grade consistently wins, boost it
  for (const [grade, data] of Object.entries(gradeCalibration)) {
    if (data.roi > 10) adjustments.gradeBoosts[grade] = 5;
    else if (data.roi > 0) adjustments.gradeBoosts[grade] = 2;
    else if (data.roi < -20) adjustments.gradeBoosts[grade] = -5;
  }

  // ─── Save Learning State ────────────────────────────────────────
  learningState = {
    learnedAt: new Date().toISOString(),
    totalResolved: picks.length,
    totalWon: won.length,
    totalLost: lost.length,
    overallWinRate: round(won.length / picks.length),
    overallROI: round(picks.reduce((s, p) => s + (p.pnl || 0), 0) / (picks.length * 10) * 100),
    sportStats: sportAdjustments,
    betTypeStats: betTypeAdjustments,
    oddsRangeStats,
    gradeCalibration,
    bookReliability,
    evStats,
    legCountCalibration,
    dataQualityStats: dqStats,
    adjustments,
    insights: generateInsights(picks, sportAdjustments, betTypeAdjustments, gradeCalibration, legCountCalibration, bestOddsRange, bestEvRange),
  };

  lastLearnTime = learningState.learnedAt;

  try {
    fs.writeFileSync(LEARNING_FILE, JSON.stringify(learningState, null, 2));
    log.info('LEARNER', `Learning complete: ${picks.length} picks analyzed, ${Object.keys(adjustments.sportMultipliers).length} sport adjustments`);
  } catch (err) {
    log.warn('LEARNER', `Failed to save learning state: ${err.message}`);
  }

  return learningState;
}

/**
 * Generate human-readable insights from the data.
 */
function generateInsights(picks, sportAdj, betTypeAdj, gradeCalib, legCountCalib, bestOddsRange, bestEvRange) {
  const insights = [];

  // Overall
  const won = picks.filter(p => p.result === 'won').length;
  const winRate = picks.length > 0 ? (won / picks.length * 100).toFixed(1) : 0;
  insights.push(`Overall: ${won}/${picks.length} picks won (${winRate}% win rate)`);

  // Best sport
  const bestSport = Object.entries(sportAdj)
    .filter(([, d]) => d.legTotal >= MIN_SAMPLES)
    .sort((a, b) => b[1].legWinRate - a[1].legWinRate)[0];
  if (bestSport) {
    insights.push(`Best sport: ${bestSport[0]} (${(bestSport[1].legWinRate * 100).toFixed(0)}% leg win rate, ${bestSport[1].legTotal} legs)`);
  }

  // Worst sport  
  const worstSport = Object.entries(sportAdj)
    .filter(([, d]) => d.legTotal >= MIN_SAMPLES)
    .sort((a, b) => a[1].legWinRate - b[1].legWinRate)[0];
  if (worstSport && worstSport[0] !== bestSport?.[0]) {
    insights.push(`Weakest sport: ${worstSport[0]} (${(worstSport[1].legWinRate * 100).toFixed(0)}% leg win rate) — reducing weight`);
  }

  // Best bet type
  const bestBT = Object.entries(betTypeAdj)
    .filter(([, d]) => d.total >= MIN_SAMPLES)
    .sort((a, b) => b[1].winRate - a[1].winRate)[0];
  if (bestBT) {
    insights.push(`Best bet type: ${bestBT[0]} (${(bestBT[1].winRate * 100).toFixed(0)}% win rate)`);
  }

  // Best odds range
  if (bestOddsRange) {
    const wr = bestOddsRange[1].total > 0 ? (bestOddsRange[1].won / bestOddsRange[1].total * 100).toFixed(0) : 0;
    insights.push(`Sweet spot odds: ${bestOddsRange[0]} (${wr}% win rate)`);
  }

  // Best EV range
  if (bestEvRange && bestEvRange[1].total >= 3) {
    const roi = (bestEvRange[1].pnl / (bestEvRange[1].total * 10) * 100).toFixed(1);
    insights.push(`Most profitable EV range: ${bestEvRange[0]} (${roi}% ROI)`);
  }

  // Leg count
  const bestLC = Object.entries(legCountCalib)
    .filter(([, d]) => d.total >= 3)
    .sort((a, b) => b[1].roi - a[1].roi)[0];
  if (bestLC) {
    insights.push(`Best leg count: ${bestLC[0]}-leg accas (${bestLC[1].roi}% ROI)`);
  }

  // Grade accuracy
  for (const [grade, data] of Object.entries(gradeCalib)) {
    if (data.total >= 3) {
      const verdict = data.roi > 0 ? '✅ profitable' : '❌ losing';
      insights.push(`Grade ${grade}: ${(data.winRate * 100).toFixed(0)}% win rate, ${data.roi > 0 ? '+' : ''}${data.roi}% ROI — ${verdict}`);
    }
  }

  return insights;
}

/**
 * Get the current adjustments for accaBuilder to consume.
 * Returns null if not enough data.
 */
function getAdjustments() {
  if (!learningState || !learningState.adjustments) return null;
  if (learningState.totalResolved < MIN_SAMPLES) return null;
  return learningState.adjustments;
}

/**
 * Get full learning report for the frontend.
 */
function getLearningReport() {
  if (!learningState) {
    // Try to learn now
    learn();
  }
  return learningState || {
    learnedAt: null,
    totalResolved: 0,
    adjustments: null,
    insights: ['Not enough data yet. Keep generating and resolving picks.'],
  };
}

function getSportGroup(sportKey) {
  if (!sportKey) return 'other';
  if (sportKey.includes('basketball')) return 'basketball';
  if (sportKey.includes('football') || sportKey.includes('nfl') || sportKey.includes('ncaaf')) return 'football';
  if (sportKey.includes('soccer')) return 'soccer';
  if (sportKey.includes('baseball')) return 'baseball';
  if (sportKey.includes('hockey')) return 'hockey';
  if (sportKey.includes('mma') || sportKey.includes('boxing')) return 'combat';
  if (sportKey.includes('tennis')) return 'tennis';
  return 'other';
}

function round(n) { return Math.round(n * 1000) / 1000; }

module.exports = {
  learn,
  getAdjustments,
  getLearningReport,
};
