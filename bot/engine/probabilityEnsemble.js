/**
 * Probability Model Ensemble — Multi-model approach for improved accuracy.
 *
 * Instead of relying on a single Bayesian model, this module:
 *   1. Runs multiple independent sub-models in parallel
 *   2. Weights their outputs by historical calibration accuracy
 *   3. Uses stacking (meta-model) to combine predictions
 *   4. Tracks individual model accuracy over time
 *   5. Automatically promotes/demotes models based on Brier score
 *
 * Sub-models:
 *   - Bayesian (existing probabilityModel.js) — 8-signal log-odds fusion
 *   - Market Consensus — weighted average of Polymarket + Kalshi + bookmakers
 *   - Source-Weighted — independent sources weighted by historical reliability
 *   - Bookmaker Sharp — implied probability from sharpest bookmaker lines
 *   - Recency-Weighted — recent signals weighted exponentially higher
 */
const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'logs', 'ensemble-state.json');

// ─── Sub-Model Interface ─────────────────────────────────────────────
class SubModel {
  constructor(name, weight = 1.0) {
    this.name = name;
    this.weight = weight;
    this.predictions = []; // { predicted, actual, timestamp, conditionId }
    this.brierScore = null;
    this.calibrationBias = 0;
    this.totalPredictions = 0;
  }

  recordPrediction(conditionId, predicted, actual = null) {
    this.predictions.push({
      conditionId,
      predicted: Math.max(0.01, Math.min(0.99, predicted)),
      actual,
      timestamp: new Date().toISOString(),
    });
    this.totalPredictions++;
    if (this.predictions.length > 2000) this.predictions = this.predictions.slice(-2000);
    if (actual !== null) this._recalculate();
  }

  resolveOutcome(conditionId, actual) {
    for (const pred of this.predictions) {
      if (pred.conditionId === conditionId && pred.actual === null) {
        pred.actual = actual;
      }
    }
    this._recalculate();
  }

  _recalculate() {
    const resolved = this.predictions.filter(p => p.actual !== null);
    if (resolved.length < 5) return;

    // Brier score: mean of (predicted - actual)^2
    const brierSum = resolved.reduce((s, p) => s + (p.predicted - p.actual) ** 2, 0);
    this.brierScore = brierSum / resolved.length;

    // Calibration bias: avg(predicted - actual)
    const biasSum = resolved.reduce((s, p) => s + (p.predicted - p.actual), 0);
    this.calibrationBias = biasSum / resolved.length;
  }

  toJSON() {
    return {
      name: this.name,
      weight: Math.round(this.weight * 1000) / 1000,
      brierScore: this.brierScore !== null ? Math.round(this.brierScore * 10000) / 10000 : null,
      calibrationBias: Math.round(this.calibrationBias * 10000) / 10000,
      totalPredictions: this.totalPredictions,
      resolvedPredictions: this.predictions.filter(p => p.actual !== null).length,
    };
  }
}

// ─── Ensemble State ──────────────────────────────────────────────────
const models = new Map();
let _mainProbabilityModel = null;

function initialize(probabilityModel = null) {
  _mainProbabilityModel = probabilityModel;

  // Register sub-models
  models.set('bayesian', new SubModel('bayesian', 0.25));
  models.set('market_consensus', new SubModel('market_consensus', 0.30));
  models.set('source_weighted', new SubModel('source_weighted', 0.20));
  models.set('bookmaker_sharp', new SubModel('bookmaker_sharp', 0.15));
  models.set('recency_weighted', new SubModel('recency_weighted', 0.10));

  _loadState();
  log.info('ENSEMBLE', `Probability ensemble initialized: ${models.size} sub-models`);
}

// ─── Sub-Model Implementations ───────────────────────────────────────

/**
 * Bayesian model: delegates to existing probabilityModel.js
 */
function bayesianPredict(market, signals) {
  if (!_mainProbabilityModel) return null;
  try {
    const result = _mainProbabilityModel.estimateProbability(market, signals);
    return result?.probability || null;
  } catch { return null; }
}

/**
 * Market Consensus: weighted average of available market prices
 * Polymarket (weight 0.50) + Kalshi (0.30) + Bookmakers (0.20)
 */
function marketConsensusPredict(market, crossData = {}) {
  let totalWeight = 0;
  let weightedSum = 0;

  // Polymarket price
  const polyPrice = market.yesPrice || market.outcomePrices?.[0];
  if (polyPrice > 0 && polyPrice < 1) {
    weightedSum += polyPrice * 0.50;
    totalWeight += 0.50;
  }

  // Kalshi price (if cross-referenced)
  if (crossData.kalshiPrice && crossData.kalshiPrice > 0) {
    weightedSum += crossData.kalshiPrice * 0.30;
    totalWeight += 0.30;
  }

  // Bookmaker implied probability
  if (crossData.bookmakerProb && crossData.bookmakerProb > 0) {
    weightedSum += crossData.bookmakerProb * 0.20;
    totalWeight += 0.20;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

/**
 * Source-Weighted: weighted average of independent sources by reliability
 */
function sourceWeightedPredict(sources = {}) {
  const sourceWeights = {
    metaculus: 0.30,
    manifold: 0.20,
    llm: 0.15,
    kalshi: 0.20,
    polling: 0.15,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const [source, estimate] of Object.entries(sources)) {
    if (estimate && estimate > 0 && estimate < 1 && sourceWeights[source]) {
      weightedSum += estimate * sourceWeights[source];
      totalWeight += sourceWeights[source];
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

/**
 * Bookmaker Sharp: highest-liquidity bookmaker line
 */
function bookmakerSharpPredict(bookmakerData = {}) {
  if (!bookmakerData.odds || !Array.isArray(bookmakerData.odds)) return null;

  // Find sharpest line (Pinnacle > Betfair > others)
  const sharpOrder = ['pinnacle', 'betfair', 'bet365', 'draftkings', 'fanduel'];
  for (const sharp of sharpOrder) {
    const found = bookmakerData.odds.find(o =>
      o.bookmaker?.toLowerCase().includes(sharp)
    );
    if (found?.impliedProb) return found.impliedProb;
  }

  // Fallback: average of all bookmaker lines
  const probs = bookmakerData.odds.filter(o => o.impliedProb > 0).map(o => o.impliedProb);
  return probs.length > 0 ? probs.reduce((s, p) => s + p, 0) / probs.length : null;
}

/**
 * Recency-Weighted: exponentially decaying weights on recent signal changes
 */
function recencyWeightedPredict(market, recentSignals = []) {
  if (recentSignals.length === 0) return null;

  const now = Date.now();
  let weightedSum = 0;
  let totalWeight = 0;

  for (const signal of recentSignals) {
    const ageMs = now - new Date(signal.timestamp || 0).getTime();
    const ageHours = ageMs / (60 * 60 * 1000);
    // Exponential decay: half-life = 6 hours
    const weight = Math.exp(-0.693 * ageHours / 6);

    if (signal.probability && signal.probability > 0 && signal.probability < 1) {
      weightedSum += signal.probability * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

// ─── Ensemble Prediction ─────────────────────────────────────────────
function predict(market, context = {}) {
  const predictions = {};
  const weights = {};

  // Run each sub-model
  const bayesian = bayesianPredict(market, context.signals);
  if (bayesian !== null) {
    predictions.bayesian = bayesian;
    models.get('bayesian')?.recordPrediction(market.conditionId, bayesian);
  }

  const consensus = marketConsensusPredict(market, context.crossData || {});
  if (consensus !== null) {
    predictions.market_consensus = consensus;
    models.get('market_consensus')?.recordPrediction(market.conditionId, consensus);
  }

  const sourceWeighted = sourceWeightedPredict(context.sources || {});
  if (sourceWeighted !== null) {
    predictions.source_weighted = sourceWeighted;
    models.get('source_weighted')?.recordPrediction(market.conditionId, sourceWeighted);
  }

  const sharp = bookmakerSharpPredict(context.bookmakerData || {});
  if (sharp !== null) {
    predictions.bookmaker_sharp = sharp;
    models.get('bookmaker_sharp')?.recordPrediction(market.conditionId, sharp);
  }

  const recency = recencyWeightedPredict(market, context.recentSignals || []);
  if (recency !== null) {
    predictions.recency_weighted = recency;
    models.get('recency_weighted')?.recordPrediction(market.conditionId, recency);
  }

  // Calculate adaptive weights based on Brier scores
  for (const [name, model] of models) {
    if (predictions[name] === undefined) continue;

    // Use inverse Brier score as weight (lower Brier = higher weight)
    if (model.brierScore !== null && model.brierScore > 0) {
      weights[name] = 1 / model.brierScore;
    } else {
      weights[name] = model.weight; // Default weight
    }

    // Bias correction: shift prediction by observed calibration bias
    if (Math.abs(model.calibrationBias) > 0.02) {
      predictions[name] = Math.max(0.01, Math.min(0.99,
        predictions[name] - model.calibrationBias * 0.5 // Half correction to avoid over-fitting
      ));
    }
  }

  // Normalize weights
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
  if (totalWeight === 0) return { ensemble: null, subModels: predictions };

  // Weighted average
  let ensemblePrediction = 0;
  for (const [name, pred] of Object.entries(predictions)) {
    const normalizedWeight = (weights[name] || 0) / totalWeight;
    ensemblePrediction += pred * normalizedWeight;
  }

  // Clip to valid probability range
  ensemblePrediction = Math.max(0.01, Math.min(0.99, ensemblePrediction));

  return {
    ensemble: Math.round(ensemblePrediction * 10000) / 10000,
    subModels: predictions,
    weights: Object.fromEntries(
      Object.entries(weights).map(([k, v]) => [k, Math.round(v / totalWeight * 1000) / 1000])
    ),
    modelCount: Object.keys(predictions).length,
  };
}

// ─── Resolution Feedback ─────────────────────────────────────────────
function recordResolution(conditionId, resolved) {
  const actual = resolved ? 1.0 : 0.0;
  for (const [, model] of models) {
    model.resolveOutcome(conditionId, actual);
  }
  _rebalanceWeights();
}

function _rebalanceWeights() {
  // Auto-rebalance: models with better Brier scores get higher base weights
  const scored = [];
  for (const [name, model] of models) {
    if (model.brierScore !== null) {
      scored.push({ name, brier: model.brierScore });
    }
  }
  if (scored.length < 2) return;

  // Rank by Brier score (lower is better)
  scored.sort((a, b) => a.brier - b.brier);
  const totalInverseBrier = scored.reduce((s, m) => s + (1 / m.brier), 0);

  for (const s of scored) {
    const model = models.get(s.name);
    if (model) {
      model.weight = (1 / s.brier) / totalInverseBrier;
    }
  }
}

// ─── Reporting ───────────────────────────────────────────────────────
function getReport() {
  const report = [];
  for (const [, model] of models) {
    report.push(model.toJSON());
  }
  report.sort((a, b) => (a.brierScore || 1) - (b.brierScore || 1)); // Best first

  return {
    models: report,
    bestModel: report[0]?.name || 'N/A',
    worstModel: report[report.length - 1]?.name || 'N/A',
    avgBrierScore: report.filter(r => r.brierScore !== null).length > 0
      ? Math.round(report.filter(r => r.brierScore !== null).reduce((s, r) => s + r.brierScore, 0) / report.filter(r => r.brierScore !== null).length * 10000) / 10000
      : null,
    totalPredictions: report.reduce((s, r) => s + r.totalPredictions, 0),
    timestamp: new Date().toISOString(),
  };
}

// ─── Persistence ─────────────────────────────────────────────────────
function _saveState() {
  try {
    const state = {};
    for (const [name, model] of models) {
      state[name] = {
        weight: model.weight,
        predictions: model.predictions.slice(-200),
        brierScore: model.brierScore,
        calibrationBias: model.calibrationBias,
        totalPredictions: model.totalPredictions,
      };
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    log.debug('ENSEMBLE', `Save state failed: ${err.message}`);
  }
}

function _loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return;
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

    for (const [name, saved] of Object.entries(state)) {
      const model = models.get(name);
      if (!model) continue;
      model.weight = saved.weight || model.weight;
      model.predictions = saved.predictions || [];
      model.brierScore = saved.brierScore;
      model.calibrationBias = saved.calibrationBias || 0;
      model.totalPredictions = saved.totalPredictions || 0;
    }

    log.info('ENSEMBLE', `Loaded ensemble state: ${Object.keys(state).length} models`);
  } catch (err) {
    log.debug('ENSEMBLE', `Load state failed: ${err.message}`);
  }
}

// Save periodically
let _saveInterval = null;
function start() {
  _saveInterval = setInterval(() => _saveState(), 10 * 60 * 1000); // Every 10 min
}

function stop() {
  _saveState();
  if (_saveInterval) clearInterval(_saveInterval);
  _saveInterval = null;
}

module.exports = {
  initialize,
  predict,
  recordResolution,
  getReport,
  start,
  stop,
};
