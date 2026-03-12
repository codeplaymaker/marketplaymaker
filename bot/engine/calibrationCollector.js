/**
 * Active Calibration Collector v1
 *
 * The probability model's accuracy depends on resolution data.
 * Currently: random sampling every 10th scan → ~5 samples/scan.
 * Problem: At 15-min intervals, that's ~50 samples/day — very slow.
 *
 * This module actively seeks resolution data to accelerate calibration:
 *
 * 1. Polls Polymarket for recently-resolved markets (not just active ones)
 * 2. Records every resolution with the market's price history
 * 3. Cross-references with our predictions to measure accuracy
 * 4. Feeds data to the probability model's isotonic regression
 * 5. Tracks calibration drift over time (are we getting better or worse?)
 *
 * Target: 200+ resolution samples/week (vs current ~50/week)
 * This 4x increase means isotonic regression retrains faster and the
 * probability model becomes meaningfully more accurate in weeks, not months.
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'logs', 'calibration-collector-state.json');

// ─── Optional Dependencies ───────────────────────────────────────────
let polyClient = null;
let probabilityModel = null;
try { polyClient = require('../polymarket/client'); } catch { /* required */ }
try { probabilityModel = require('./probabilityModel'); } catch { /* required */ }

// ─── State ───────────────────────────────────────────────────────────
let resolvedMarketIds = new Set();    // Markets we've already recorded
let resolutionLog = [];               // Full log of all resolutions
let calibrationDrift = [];            // Track calibration accuracy over time
let pollInterval = null;
let isRunning = false;

let stats = {
  totalResolutions: 0,
  yesResolutions: 0,
  noResolutions: 0,
  pollCount: 0,
  lastPollTime: null,
  avgBrier: null,                     // Brier score (lower = better calibration)
  recentBrier: null,                  // Last 50 resolutions Brier
  calibrationImproving: null,         // true if recent Brier < overall Brier
};

// ─── Configuration ───────────────────────────────────────────────────
const CONFIG = {
  pollIntervalMs: 10 * 60 * 1000,    // Every 10 minutes
  maxResolutionsPerPoll: 100,         // Check up to 100 markets per cycle
  maxHistorySize: 5000,               // Keep 5000 resolution records
  brierWindowSize: 50,                // Rolling Brier score window
  minSamplesForRetrain: 10,           // Retrain isotonic after this many new samples
};

// ─── Load/Save State ─────────────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      resolvedMarketIds = new Set(data.resolvedIds || []);
      resolutionLog = data.resolutionLog || [];
      calibrationDrift = data.calibrationDrift || [];
      stats = { ...stats, ...(data.stats || {}) };
      log.info('CAL_COL', `Loaded state: ${resolvedMarketIds.size} resolved markets, ${resolutionLog.length} resolution entries`);
    }
  } catch { /* fresh start */ }
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      resolvedIds: [...resolvedMarketIds].slice(-5000),
      resolutionLog: resolutionLog.slice(-CONFIG.maxHistorySize),
      calibrationDrift: calibrationDrift.slice(-500),
      stats,
      savedAt: new Date().toISOString(),
    }, null, 2));
  } catch (err) { log.debug('CAL_COL', `Save failed: ${err.message}`); }
}

// ─── Resolution Collection ───────────────────────────────────────────

/**
 * Fetch recently closed/resolved markets and record their outcomes.
 */
async function collectResolutions() {
  stats.pollCount++;
  stats.lastPollTime = new Date().toISOString();

  if (!polyClient) {
    log.warn('CAL_COL', 'Polymarket client not available');
    return { newResolutions: 0 };
  }

  let newResolutions = 0;
  let brierSum = 0;
  let brierCount = 0;

  try {
    // Fetch recently closed markets
    const closedMarkets = await polyClient.getMarkets({
      limit: CONFIG.maxResolutionsPerPoll,
      offset: 0,
      closed: true,
      active: false,
      order: 'endDate',
      ascending: false,
    });

    for (const raw of closedMarkets) {
      if (!raw.conditionId) continue;
      if (resolvedMarketIds.has(raw.conditionId)) continue;

      // Parse outcome
      const outcomePrices = raw.outcomePrices ? JSON.parse(raw.outcomePrices) : [];
      const yesPrice = parseFloat(outcomePrices[0] || 0.5);

      // Determine resolution from prices (resolved YES → price ~$1, NO → price ~$0)
      let outcome = null;
      if (yesPrice >= 0.95) outcome = 'YES';
      else if (yesPrice <= 0.05) outcome = 'NO';
      else continue; // Not fully resolved or indeterminate

      // Try CLOB API for definitive resolution confirmation
      try {
        const details = await polyClient.getMarketById(raw.conditionId);
        if (details && details.resolved) {
          outcome = details.resolution || outcome;
        } else if (details && !details.resolved && !details.closed) {
          continue; // Not actually resolved
        }
      } catch { /* use price-based determination */ }

      // Record this resolution
      resolvedMarketIds.add(raw.conditionId);

      // The pre-resolution price (what the market priced it at before close)
      // Try to get from volume-weighted price or last trading price
      const impliedProb = parseFloat(raw.volumeWeightedPrice || raw.lastTradePrice || 0) || yesPrice;
      // Use original price if close to extremes — it's already resolved
      const preResolutionPrice = (impliedProb > 0.05 && impliedProb < 0.95)
        ? impliedProb
        : yesPrice; // Fallback

      // If the price was already very close to the outcome, this isn't useful for calibration
      // (Market was already >90% sure of the outcome)
      if (Math.abs(preResolutionPrice - (outcome === 'YES' ? 1 : 0)) < 0.10) continue;

      const isYes = outcome === 'YES';

      // Brier score for this prediction
      const predicted = preResolutionPrice;
      const actual = isYes ? 1 : 0;
      const brier = (predicted - actual) ** 2;
      brierSum += brier;
      brierCount++;

      const entry = {
        conditionId: raw.conditionId,
        question: (raw.question || '').slice(0, 150),
        category: raw.category || 'unknown',
        preResolutionPrice: Math.round(preResolutionPrice * 10000) / 10000,
        outcome,
        brier: Math.round(brier * 10000) / 10000,
        resolvedAt: new Date().toISOString(),
        liquidity: parseFloat(raw.liquidity || 0),
        volume: parseFloat(raw.volumeNum || 0),
      };

      resolutionLog.push(entry);
      newResolutions++;

      // Feed to probability model's calibration system
      if (probabilityModel && probabilityModel.recordResolution) {
        try {
          probabilityModel.recordResolution(preResolutionPrice, outcome, {}, true);
        } catch (err) {
          log.debug('CAL_COL', `Model recording failed: ${err.message}`);
        }
      }

      stats.totalResolutions++;
      if (isYes) stats.yesResolutions++;
      else stats.noResolutions++;
    }

    // Update Brier scores
    if (brierCount > 0) {
      const pollBrier = brierSum / brierCount;
      log.info('CAL_COL', `Collected ${newResolutions} new resolutions (Brier: ${pollBrier.toFixed(4)})`);
    }

    updateCalibrationMetrics();

    if (newResolutions > 0) saveState();

    return { newResolutions };

  } catch (err) {
    log.warn('CAL_COL', `Resolution collection failed: ${err.message}`);
    return { newResolutions: 0, error: err.message };
  }
}

// ─── Calibration Metrics ─────────────────────────────────────────────

/**
 * Calculate and track calibration quality over time.
 */
function updateCalibrationMetrics() {
  if (resolutionLog.length < 10) return;

  // Overall Brier score
  const allBrier = resolutionLog
    .filter(e => e.brier != null)
    .map(e => e.brier);

  if (allBrier.length > 0) {
    stats.avgBrier = Math.round(allBrier.reduce((s, b) => s + b, 0) / allBrier.length * 10000) / 10000;
  }

  // Recent Brier score (last N)
  const recentBrier = allBrier.slice(-CONFIG.brierWindowSize);
  if (recentBrier.length > 0) {
    stats.recentBrier = Math.round(recentBrier.reduce((s, b) => s + b, 0) / recentBrier.length * 10000) / 10000;
  }

  // Is calibration improving?
  if (stats.avgBrier != null && stats.recentBrier != null) {
    stats.calibrationImproving = stats.recentBrier < stats.avgBrier;
  }

  // Track drift over time (weekly snapshots)
  const lastDrift = calibrationDrift[calibrationDrift.length - 1];
  const shouldSnapshot = !lastDrift || (Date.now() - new Date(lastDrift.time).getTime() > 24 * 60 * 60 * 1000);

  if (shouldSnapshot && allBrier.length >= 20) {
    calibrationDrift.push({
      time: new Date().toISOString(),
      avgBrier: stats.avgBrier,
      recentBrier: stats.recentBrier,
      sampleCount: allBrier.length,
      improving: stats.calibrationImproving,
    });
  }
}

/**
 * Get a calibration quality report.
 */
function getCalibrationReport() {
  const bucketAnalysis = {};

  // Group resolutions by price bucket for calibration curve
  for (const entry of resolutionLog) {
    if (entry.preResolutionPrice == null) continue;
    const bucket = Math.round(entry.preResolutionPrice * 10) / 10; // 10% buckets
    const key = `${(bucket * 100).toFixed(0)}%`;
    if (!bucketAnalysis[key]) {
      bucketAnalysis[key] = { predicted: bucket, total: 0, resolvedYes: 0 };
    }
    bucketAnalysis[key].total++;
    if (entry.outcome === 'YES') bucketAnalysis[key].resolvedYes++;
  }

  // Calculate actual resolution rate per bucket
  const calibrationCurve = Object.entries(bucketAnalysis)
    .map(([key, data]) => ({
      bucket: key,
      predicted: data.predicted,
      actual: data.total > 0 ? Math.round(data.resolvedYes / data.total * 10000) / 10000 : null,
      sampleSize: data.total,
      deviation: data.total > 0 ? Math.round(Math.abs(data.predicted - data.resolvedYes / data.total) * 10000) / 10000 : null,
    }))
    .sort((a, b) => a.predicted - b.predicted);

  return {
    totalResolutions: stats.totalResolutions,
    avgBrier: stats.avgBrier,
    recentBrier: stats.recentBrier,
    calibrationImproving: stats.calibrationImproving,
    calibrationCurve,
    drift: calibrationDrift.slice(-30),
    yesRate: stats.totalResolutions > 0 ? Math.round(stats.yesResolutions / stats.totalResolutions * 10000) / 10000 : null,
  };
}

// ─── Lifecycle ───────────────────────────────────────────────────────

function start() {
  if (isRunning) return;
  loadState();
  isRunning = true;

  log.info('CAL_COL', `Starting calibration collector (${CONFIG.pollIntervalMs / 60000}min interval, ${resolvedMarketIds.size} known resolutions)`);

  // Immediate first collection
  collectResolutions().catch(err => log.warn('CAL_COL', `Initial collection failed: ${err.message}`));

  pollInterval = setInterval(() => {
    collectResolutions().catch(err => log.warn('CAL_COL', `Collection failed: ${err.message}`));
  }, CONFIG.pollIntervalMs);
}

function stop() {
  if (!isRunning) return;
  isRunning = false;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  saveState();
  log.info('CAL_COL', 'Calibration collector stopped');
}

function getStatus() {
  return {
    running: isRunning,
    totalResolutions: stats.totalResolutions,
    avgBrier: stats.avgBrier,
    recentBrier: stats.recentBrier,
    calibrationImproving: stats.calibrationImproving,
    knownResolutions: resolvedMarketIds.size,
    ...stats,
  };
}

module.exports = {
  start,
  stop,
  collectResolutions,
  getCalibrationReport,
  getStatus,
  CONFIG,
};
