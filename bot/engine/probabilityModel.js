/**
 * Bayesian Probability Model — v3 (Professional Grade)
 *
 * COMPLETE REWRITE from v2 heuristic weighted-sum approach.
 *
 * Architecture: Bayesian updating with independent likelihood signals.
 *
 * Prior:     Category-specific + historical calibration prior
 * Signal 1:  Orderbook Imbalance (likelihood ratio from bid/ask asymmetry)
 * Signal 2:  Price Stability (volatility-scaled confidence)
 * Signal 3:  Time Decay (resolution proximity convergence)
 * Signal 4:  Volume-Weighted Market Efficiency (precision scaling)
 * Signal 5:  Historical Calibration (Platt-scaled from resolution data)
 * Signal 6:  Bookmaker Consensus (cross-reference when available)
 * Signal 7:  Orderbook Depth Profile (liquidity concentration analysis)
 *
 * Key improvements over v2:
 * - Bayesian posterior instead of linear weighted sum
 * - Log-odds space for proper probability combining
 * - Isotonic regression on calibration data (monotonic fit)
 * - Confidence intervals (not just point estimates)
 * - Automatic signal weight learning from resolution outcomes
 * - Bookmaker consensus integration as a signal
 * - Multi-timeframe volatility (not just single window)
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

let newsSignal = null;
try { newsSignal = require('../data/newsSignal'); } catch { /* optional */ }

const CALIBRATION_FILE = path.join(__dirname, '../logs/calibration.json');

// ─── Calibration & Learning State ────────────────────────────────────
let calibration = {
  buckets: {},              // Price bucket → { total, resolvedYes }
  totalRecorded: 0,
  signalPerformance: {},    // Signal name → { correct, total, avgEdge }
  isotonicMap: null,        // Learned isotonic calibration curve
  lastTrainedAt: null,
};

function loadCalibration() {
  try {
    if (fs.existsSync(CALIBRATION_FILE)) {
      const loaded = JSON.parse(fs.readFileSync(CALIBRATION_FILE, 'utf8'));
      calibration = { ...calibration, ...loaded };
      log.info('PROB_MODEL', `Loaded calibration: ${calibration.totalRecorded} resolutions, ${Object.keys(calibration.signalPerformance).length} tracked signals`);
    }
  } catch { /* start fresh */ }
}

function saveCalibration() {
  try {
    fs.mkdirSync(path.dirname(CALIBRATION_FILE), { recursive: true });
    fs.writeFileSync(CALIBRATION_FILE, JSON.stringify(calibration, null, 2));
  } catch (err) {
    log.warn('PROB_MODEL', `Failed to save calibration: ${err.message}`);
  }
}

// ─── Math Utilities ──────────────────────────────────────────────────
function probToLogOdds(p) {
  p = Math.max(0.001, Math.min(0.999, p));
  return Math.log(p / (1 - p));
}

function logOddsToProb(lo) {
  return 1 / (1 + Math.exp(-lo));
}

function r4(n) { return Math.round(n * 10000) / 10000; }

/**
 * Beta distribution parameters from mean and sample size.
 * Used for Bayesian credible intervals.
 */
function betaParams(mean, n) {
  const alpha = mean * n;
  const beta = (1 - mean) * n;
  return { alpha: Math.max(alpha, 0.5), beta: Math.max(beta, 0.5) };
}

/**
 * Approximate beta distribution 95% credible interval.
 * Uses normal approximation which is good for n > 10.
 */
function betaCredibleInterval(alpha, beta) {
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  const std = Math.sqrt(variance);
  return {
    lower: Math.max(0.01, mean - 1.96 * std),
    upper: Math.min(0.99, mean + 1.96 * std),
    mean,
    std,
  };
}

// ─── Signal 1: Orderbook Imbalance (Likelihood Ratio) ────────────────
/**
 * Converts bid/ask volume asymmetry into a Bayesian likelihood ratio.
 *
 * New approach: Instead of a linear adjustment, we compute a log-likelihood
 * ratio. If the orderbook shows 2:1 bid dominance, the likelihood that
 * true_prob > market_prob is proportional to the imbalance.
 *
 * Multi-band analysis: tight (±3%), medium (±8%), wide (±15%)
 * with decreasing weight for wider bands.
 */
function orderbookSignal(orderbook, currentPrice) {
  if (!orderbook?.bids?.length || !orderbook?.asks?.length) return { adjustment: 0, logLR: 0, data: null };

  const bands = [
    { range: 0.03, weight: 0.50, label: 'tight' },
    { range: 0.08, weight: 0.35, label: 'medium' },
    { range: 0.15, weight: 0.15, label: 'wide' },
  ];

  let weightedLogLR = 0;
  let totalBandWeight = 0;
  const bandData = {};

  for (const band of bands) {
    let bidVol = 0, askVol = 0;
    let bidOrders = 0, askOrders = 0;
    let bidWeightedVol = 0, askWeightedVol = 0;

    for (const bid of orderbook.bids) {
      const p = parseFloat(bid.price);
      const s = parseFloat(bid.size);
      const dist = Math.abs(p - currentPrice);
      if (dist <= band.range) {
        bidVol += s;
        bidOrders++;
        // Distance-weighted: orders closer to price are more informative
        bidWeightedVol += s * (1 - dist / band.range);
      }
    }
    for (const ask of orderbook.asks) {
      const p = parseFloat(ask.price);
      const s = parseFloat(ask.size);
      const dist = Math.abs(p - currentPrice);
      if (dist <= band.range) {
        askVol += s;
        askOrders++;
        askWeightedVol += s * (1 - dist / band.range);
      }
    }

    const totalVol = bidWeightedVol + askWeightedVol;
    if (totalVol < 200) continue;

    const ratio = bidWeightedVol / (askWeightedVol || 1);
    // Log-likelihood ratio: bounded ±0.5 in log-odds space
    const rawLR = Math.log(ratio) * 0.15;
    const lr = Math.max(-0.5, Math.min(0.5, rawLR));

    weightedLogLR += lr * band.weight;
    totalBandWeight += band.weight;

    bandData[band.label] = {
      bidVol: Math.round(bidVol),
      askVol: Math.round(askVol),
      ratio: Math.round(ratio * 100) / 100,
      bidOrders,
      askOrders,
      logLR: r4(lr),
    };
  }

  if (totalBandWeight === 0) return { adjustment: 0, logLR: 0, data: bandData };

  const finalLogLR = weightedLogLR / totalBandWeight;
  // Convert log-odds shift to probability adjustment at current price
  const currentLogOdds = probToLogOdds(currentPrice);
  const shiftedProb = logOddsToProb(currentLogOdds + finalLogLR);
  const adjustment = shiftedProb - currentPrice;

  return {
    adjustment: r4(adjustment),
    logLR: r4(finalLogLR),
    data: bandData,
  };
}

// ─── Signal 2: Price Stability (Multi-Timeframe) ─────────────────────
/**
 * Multi-timeframe realized volatility analysis.
 *
 * New: Analyzes volatility at 3 timeframes (short/medium/long)
 * and uses volatility regime detection for smarter adjustment.
 *
 * Low vol + high prob = positive adjustment (market is right, spread noise)
 * Low vol + mid prob = small positive (stable but uncertain)
 * High vol = negative (adjust down for parameter uncertainty)
 * Decreasing vol = positive (market converging to truth)
 */
function stabilitySignal(priceHistory) {
  if (!priceHistory?.length || priceHistory.length < 5) {
    return { adjustment: 0, logLR: 0, data: { volatility: null, stable: null } };
  }

  const prices = priceHistory.map(h => h.p);
  const n = prices.length;

  // Multi-timeframe volatility
  const shortPrices = prices.slice(-5);
  const medPrices = prices.slice(-12);
  const longPrices = prices.slice(-24);

  const calcVol = (arr) => {
    if (arr.length < 3) return null;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((s, p) => s + (p - mean) ** 2, 0) / arr.length);
  };

  const shortVol = calcVol(shortPrices);
  const medVol = calcVol(medPrices);
  const longVol = calcVol(longPrices);

  const mean = prices.reduce((a, b) => a + b, 0) / n;
  const mainVol = medVol || shortVol || 0;

  // Max drawdown
  let maxDD = 0, peak = prices[0];
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = peak - p;
    if (dd > maxDD) maxDD = dd;
  }

  // Volatility regime: is vol decreasing? (converging to truth)
  const volTrend = shortVol && longVol ? (shortVol - longVol) / (longVol || 0.01) : 0;
  const isConverging = volTrend < -0.2; // Short vol < long vol by 20%+

  let adjustment = 0;
  let logLR = 0;

  if (mainVol < 0.012) {
    // Very stable
    if (mean >= 0.90) { adjustment = 0.018; logLR = 0.15; }
    else if (mean >= 0.80) { adjustment = 0.010; logLR = 0.08; }
    else if (mean >= 0.60) { adjustment = 0.005; logLR = 0.04; }
    else { adjustment = 0.002; logLR = 0.02; }
    // Convergence bonus
    if (isConverging) { adjustment *= 1.3; logLR *= 1.3; }
  } else if (mainVol < 0.025) {
    // Moderately stable
    if (mean >= 0.85) { adjustment = 0.006; logLR = 0.05; }
    else { adjustment = 0; logLR = 0; }
  } else {
    // Volatile — penalize confidence
    adjustment = -mainVol * 0.15;
    logLR = -mainVol * 0.8;
  }

  return {
    adjustment: r4(adjustment),
    logLR: r4(logLR),
    data: {
      shortVol: shortVol ? r4(shortVol) : null,
      medVol: medVol ? r4(medVol) : null,
      longVol: longVol ? r4(longVol) : null,
      maxDrawdown: r4(maxDD),
      mean: r4(mean),
      volTrend: r4(volTrend),
      isConverging,
      stable: mainVol < 0.015,
    },
  };
}

// ─── Signal 3: Volume Efficiency ─────────────────────────────────────
/**
 * Market efficiency proxy with smarter scaling.
 * Returns 0-1 where 1 = perfectly efficient (minimal edge).
 * Now uses log-scaling for volume (diminishing returns).
 */
function volumeEfficiency(volume24hr, liquidity) {
  // Log-scaled: going from $10k to $100k vol is as meaningful as $100k to $1M
  const volScore = Math.min(Math.log10(Math.max(volume24hr, 1)) / 6, 1); // $1M = 1.0
  const liqScore = Math.min(Math.log10(Math.max(liquidity, 1)) / 5.5, 1); // $300k = 1.0
  return volScore * 0.55 + liqScore * 0.45;
}

// ─── Signal 4: Time Decay ────────────────────────────────────────────
/**
 * Markets approaching resolution converge to truth.
 * New: Exponential convergence model instead of step function.
 * Also applies directional adjustment only for high-certainty events.
 */
function timeDecaySignal(endDate, currentPrice) {
  if (!endDate) return { adjustment: 0, logLR: 0, data: { daysLeft: null } };

  const msLeft = new Date(endDate).getTime() - Date.now();
  const daysLeft = msLeft / 86400000;

  if (daysLeft <= 0) return { adjustment: 0, logLR: 0, data: { daysLeft: 0, expired: true } };

  // Exponential convergence: adjustment = base * e^(-days/tau)
  // tau = characteristic time constant
  const tau = 3; // 3-day characteristic time
  const timeFactor = Math.exp(-daysLeft / tau);

  let adjustment = 0;
  let logLR = 0;

  // For high-probability events: spread noise depresses displayed from true
  if (currentPrice >= 0.90) {
    adjustment = 0.020 * timeFactor;
    logLR = 0.18 * timeFactor;
  } else if (currentPrice >= 0.80) {
    adjustment = 0.012 * timeFactor;
    logLR = 0.10 * timeFactor;
  } else if (currentPrice >= 0.65) {
    adjustment = 0.005 * timeFactor;
    logLR = 0.04 * timeFactor;
  }
  // Near 50/50: no directional adjustment from time alone

  return {
    adjustment: r4(adjustment),
    logLR: r4(logLR),
    data: {
      daysLeft: Math.round(daysLeft * 10) / 10,
      timeFactor: r4(timeFactor),
    },
  };
}

// ─── Signal 5: Category Efficiency ───────────────────────────────────
const CATEGORY_EFFICIENCY = {
  sports: 0.88,
  politics: 0.78,
  crypto: 0.58,
  business: 0.72,
  science: 0.52,
  'pop culture': 0.45,
  weather: 0.42,
  unknown: 0.62,
};

function detectCategory(category, question) {
  let cat = (category || 'unknown').toLowerCase();

  if (cat === 'unknown' && question) {
    const q = question.toLowerCase();
    if (/\b(nba|nfl|mlb|nhl|ufc|soccer|football|basketball|tennis|baseball|premier league|la liga|serie a|epl|champions league|playoff|bowl|world cup|wimbledon|f1|formula|grand prix)\b/.test(q)) cat = 'sports';
    else if (/\b(trump|biden|harris|president|election|congress|senate|governor|democrat|republican|poll|vote|party|primary|cabinet|impeach|vance|desantis|rfk)\b/.test(q)) cat = 'politics';
    else if (/\b(bitcoin|ethereum|btc|eth|crypto|token|defi|sol|solana|doge|memecoin|nft|blockchain|binance|coinbase)\b/.test(q)) cat = 'crypto';
    else if (/\b(stock|company|ceo|ipo|earnings|market cap|revenue|s&p|nasdaq|dow|fed|interest rate|gdp|inflation|unemployment)\b/.test(q)) cat = 'business';
    else if (/\b(temperature|weather|hurricane|earthquake|climate|rain|snow|tornado|wildfire)\b/.test(q)) cat = 'weather';
    else if (/\b(oscar|grammy|emmy|movie|album|song|celebrity|influencer|tiktok|youtube|twitter|x\.com|netflix|spotify)\b/.test(q)) cat = 'pop culture';
  }

  return {
    category: cat,
    efficiency: CATEGORY_EFFICIENCY[cat] || CATEGORY_EFFICIENCY.unknown,
  };
}

// ─── Signal 6: Historical Calibration (Isotonic) ─────────────────────
/**
 * Bayesian calibration using isotonic regression on historical data.
 *
 * Instead of raw bucket rates, we fit a monotonic (isotonic) calibration
 * curve that guarantees: if market price A > B, calibrated prob A ≥ B.
 *
 * Also uses finer 2.5% buckets (up from 5%) for more precision.
 */
function recordResolution(marketYesPrice, outcome, signals = {}) {
  const bucket = priceBucket(marketYesPrice);
  if (!calibration.buckets[bucket]) {
    calibration.buckets[bucket] = { total: 0, resolvedYes: 0 };
  }
  calibration.buckets[bucket].total++;
  if (outcome === 'YES') calibration.buckets[bucket].resolvedYes++;
  calibration.totalRecorded++;

  // Track which signals were correct (with rolling window for decay detection)
  for (const [sigName, sigData] of Object.entries(signals)) {
    if (!calibration.signalPerformance[sigName]) {
      calibration.signalPerformance[sigName] = {
        correct: 0, total: 0, sumEdge: 0,
        recentResults: [],  // Rolling window of last 30 results
      };
    }
    const perf = calibration.signalPerformance[sigName];
    perf.total++;
    if (sigData.wasCorrect) perf.correct++;
    if (sigData.edgeContribution) perf.sumEdge += sigData.edgeContribution;

    // Rolling window for recent accuracy tracking
    if (!perf.recentResults) perf.recentResults = [];
    perf.recentResults.push(sigData.wasCorrect ? 1 : 0);
    if (perf.recentResults.length > 30) perf.recentResults.shift();
  }

  // Retrain isotonic map every 25 resolutions
  if (calibration.totalRecorded % 25 === 0) {
    trainIsotonicCalibration();
  }

  // Check for performance decay every 10 resolutions
  if (calibration.totalRecorded % 10 === 0) {
    detectPerformanceDecay();
  }

  saveCalibration();
}

/**
 * Detect when a signal's recent accuracy is significantly worse than its
 * all-time accuracy. If so, temporarily reduce its weight (via getSignalWeight).
 */
function detectPerformanceDecay() {
  for (const [name, perf] of Object.entries(calibration.signalPerformance)) {
    if (!perf.recentResults || perf.recentResults.length < 10) continue;

    const allTimeAccuracy = perf.total > 0 ? perf.correct / perf.total : 0.5;
    const recentAccuracy = perf.recentResults.reduce((a, b) => a + b, 0) / perf.recentResults.length;

    // If recent accuracy dropped 15%+ below all-time, flag it
    if (allTimeAccuracy > 0 && recentAccuracy < allTimeAccuracy * 0.85) {
      perf.decaying = true;
      perf.decayFactor = recentAccuracy / Math.max(allTimeAccuracy, 0.01);
      log.warn('PROB_MODEL', `Signal "${name}" decaying: recent ${(recentAccuracy * 100).toFixed(0)}% vs all-time ${(allTimeAccuracy * 100).toFixed(0)}%`);
    } else {
      perf.decaying = false;
      perf.decayFactor = 1.0;
    }
  }
}

/**
 * Train isotonic (monotone) calibration from bucket data.
 * Pool Adjacent Violators Algorithm (PAVA).
 */
function trainIsotonicCalibration() {
  const sortedBuckets = Object.entries(calibration.buckets)
    .map(([key, data]) => {
      const mid = parseFloat(key.split('-')[0]) + 0.0125;
      return { mid, rate: data.total > 0 ? data.resolvedYes / data.total : mid, n: data.total };
    })
    .filter(b => b.n >= 5)
    .sort((a, b) => a.mid - b.mid);

  if (sortedBuckets.length < 3) {
    calibration.isotonicMap = null;
    return;
  }

  // PAVA: Pool Adjacent Violators
  const blocks = sortedBuckets.map(b => ({
    sum: b.rate * b.n,
    weight: b.n,
    mid: b.mid,
  }));

  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < blocks.length - 1; i++) {
      const avg_i = blocks[i].sum / blocks[i].weight;
      const avg_next = blocks[i + 1].sum / blocks[i + 1].weight;
      if (avg_i > avg_next) {
        // Pool: merge blocks i and i+1
        blocks[i].sum += blocks[i + 1].sum;
        blocks[i].weight += blocks[i + 1].weight;
        blocks.splice(i + 1, 1);
        changed = true;
        break;
      }
    }
  }

  // Build lookup: price → calibrated probability
  calibration.isotonicMap = blocks.map(b => ({
    mid: b.mid,
    calibratedProb: r4(b.sum / b.weight),
    sampleSize: b.weight,
  }));

  calibration.lastTrainedAt = new Date().toISOString();
  log.info('PROB_MODEL', `Isotonic calibration trained: ${calibration.isotonicMap.length} segments from ${calibration.totalRecorded} resolutions`);
}

function historicalCalibrationSignal(marketImpliedProb) {
  // Try isotonic map first (more accurate)
  if (calibration.isotonicMap && calibration.isotonicMap.length >= 3) {
    const map = calibration.isotonicMap;
    // Linear interpolation on isotonic curve
    let calibratedProb = marketImpliedProb;

    if (marketImpliedProb <= map[0].mid) {
      calibratedProb = map[0].calibratedProb;
    } else if (marketImpliedProb >= map[map.length - 1].mid) {
      calibratedProb = map[map.length - 1].calibratedProb;
    } else {
      for (let i = 0; i < map.length - 1; i++) {
        if (marketImpliedProb >= map[i].mid && marketImpliedProb <= map[i + 1].mid) {
          const t = (marketImpliedProb - map[i].mid) / (map[i + 1].mid - map[i].mid);
          calibratedProb = map[i].calibratedProb + t * (map[i + 1].calibratedProb - map[i].calibratedProb);
          break;
        }
      }
    }

    const diff = calibratedProb - marketImpliedProb;
    const totalSamples = map.reduce((s, m) => s + m.sampleSize, 0);
    const weight = Math.min(totalSamples / 200, 1);

    return {
      adjustment: r4(diff * weight),
      logLR: r4(probToLogOdds(calibratedProb) - probToLogOdds(marketImpliedProb)),
      data: {
        calibratedProb: r4(calibratedProb),
        marketRate: r4(marketImpliedProb),
        diff: r4(diff),
        method: 'isotonic',
        totalSamples,
        weight: r4(weight),
      },
    };
  }

  // Fallback: raw bucket data (same as v2 but with finer buckets)
  const bucket = priceBucket(marketImpliedProb);
  const data = calibration.buckets[bucket];

  if (!data || data.total < 10) return { adjustment: 0, logLR: 0, data: { sampleSize: data?.total || 0 } };

  const historicalRate = data.resolvedYes / data.total;
  const diff = historicalRate - marketImpliedProb;
  const weight = Math.min(data.total / 80, 1);

  return {
    adjustment: r4(diff * weight),
    logLR: r4((probToLogOdds(historicalRate) - probToLogOdds(marketImpliedProb)) * weight),
    data: {
      historicalRate: r4(historicalRate),
      marketRate: r4(marketImpliedProb),
      diff: r4(diff),
      method: 'bucket',
      sampleSize: data.total,
      weight: r4(weight),
    },
  };
}

function priceBucket(prob) {
  const b = Math.floor(prob * 40) / 40; // 2.5% buckets (was 5%)
  return `${b.toFixed(3)}-${(b + 0.025).toFixed(3)}`;
}

// ─── Signal 7: Orderbook Depth Profile ───────────────────────────────
/**
 * NEW: Analyzes the shape of liquidity around the current price.
 * Thick liquidity on one side = wall (support/resistance).
 * Thin liquidity on one side = easy to push through (breakout risk).
 *
 * Separate from the imbalance signal which uses volume ratios.
 * This looks at where the big orders are clustered.
 */
function depthProfileSignal(orderbook, currentPrice) {
  if (!orderbook?.bids?.length || !orderbook?.asks?.length) return { adjustment: 0, logLR: 0, data: null };

  // Find the largest order clusters (institutional walls)
  const findWalls = (orders, type) => {
    const clusters = {};
    for (const order of orders) {
      const p = parseFloat(order.price);
      const s = parseFloat(order.size);
      // Group into 1-cent price levels
      const level = Math.round(p * 100) / 100;
      if (!clusters[level]) clusters[level] = 0;
      clusters[level] += s;
    }
    return Object.entries(clusters)
      .map(([price, size]) => ({ price: parseFloat(price), size, type }))
      .sort((a, b) => b.size - a.size);
  };

  const bidWalls = findWalls(orderbook.bids, 'bid');
  const askWalls = findWalls(orderbook.asks, 'ask');

  // Large bid wall close to price = support = bullish
  // Large ask wall close to price = resistance = bearish
  let adjustment = 0;
  let logLR = 0;
  const nearRange = 0.05;

  const nearBigBid = bidWalls.find(w => Math.abs(w.price - currentPrice) < nearRange && w.size >= 5000);
  const nearBigAsk = askWalls.find(w => Math.abs(w.price - currentPrice) < nearRange && w.size >= 5000);

  if (nearBigBid && !nearBigAsk) {
    // Strong support, no resistance → mildly bullish
    const strength = Math.min(nearBigBid.size / 20000, 1);
    adjustment = 0.008 * strength;
    logLR = 0.06 * strength;
  } else if (nearBigAsk && !nearBigBid) {
    // Strong resistance, no support → mildly bearish
    const strength = Math.min(nearBigAsk.size / 20000, 1);
    adjustment = -0.008 * strength;
    logLR = -0.06 * strength;
  }

  return {
    adjustment: r4(adjustment),
    logLR: r4(logLR),
    data: {
      topBidWall: bidWalls[0] ? { price: bidWalls[0].price, size: Math.round(bidWalls[0].size) } : null,
      topAskWall: askWalls[0] ? { price: askWalls[0].price, size: Math.round(askWalls[0].size) } : null,
      nearSupport: nearBigBid ? Math.round(nearBigBid.size) : 0,
      nearResistance: nearBigAsk ? Math.round(nearBigAsk.size) : 0,
    },
  };
}

// ─── Bayesian Composite Probability Estimate ─────────────────────────
/**
 * Bayesian posterior combining all signals in log-odds space.
 *
 * The proper way to combine independent evidence:
 * log_posterior = log_prior + sum(log_likelihood_ratios)
 *
 * Each signal contributes a log-likelihood ratio (logLR) which
 * represents how much evidence it provides for/against the market price.
 *
 * Adaptive weighting: signals that have historically been more accurate
 * (tracked in calibration.signalPerformance) get higher weight.
 *
 * @param {Object} market - Normalized market data
 * @param {Object} [orderbook] - Live orderbook
 * @param {Array} [priceHistory] - Price history points
 * @param {Object} [bookmakerData] - Optional bookmaker consensus from oddsApi
 * @returns {Object} Bayesian estimate with credible interval
 */
function estimateProbability(market, orderbook = null, priceHistory = null, bookmakerData = null) {
  const marketProb = market.yesPrice;

  // ─── Prior: start with market price in log-odds space ───
  const cat = detectCategory(market.category, market.question);
  let priorLogOdds = probToLogOdds(marketProb);

  // Category-based prior adjustment: less efficient categories get *slight*
  // prior shift toward our model (we trust the market less)
  const categoryTrust = cat.efficiency; // 0-1: how much we trust the market
  // This is small — just sets the stage for signals to have more/less impact
  const categoryPriorShift = 0; // We let signals do the work, not the prior

  priorLogOdds += categoryPriorShift;

  // ─── Collect all signal log-likelihood ratios ───
  const signals = [];
  let totalLogLR = 0;

  // Adaptive weights from historical signal performance
  // Includes decay detection: if a signal's recent accuracy dropped significantly,
  // its weight is reduced until it recovers.
  const getSignalWeight = (name, defaultWeight) => {
    const perf = calibration.signalPerformance[name];
    if (!perf || perf.total < 20) return defaultWeight;

    // Base adaptive weight from all-time accuracy
    const accuracy = perf.correct / perf.total;
    let weight = defaultWeight * Math.max(0.3, accuracy * 2);

    // Apply decay penalty if signal is underperforming recently
    if (perf.decaying && perf.decayFactor < 1.0) {
      weight *= Math.max(0.4, perf.decayFactor);
    }

    // Boost from recent accuracy (rolling window) if signal is hot
    if (perf.recentResults && perf.recentResults.length >= 10) {
      const recentAcc = perf.recentResults.reduce((a, b) => a + b, 0) / perf.recentResults.length;
      if (recentAcc > 0.7) weight *= 1.15; // Hot streak bonus
    }

    return weight;
  };

  // 1. Orderbook Imbalance (logLR from bid/ask asymmetry)
  if (orderbook) {
    const ob = orderbookSignal(orderbook, marketProb);
    const w = getSignalWeight('Orderbook', 0.30);
    if (ob.logLR !== 0) {
      const scaledLR = ob.logLR * w;
      totalLogLR += scaledLR;
      signals.push({ name: 'Orderbook', ...ob, weight: r4(w), scaledLR: r4(scaledLR) });
    }
  }

  // 2. Price Stability
  if (priceHistory) {
    const ps = stabilitySignal(priceHistory);
    const w = getSignalWeight('Stability', 0.20);
    if (ps.logLR !== 0) {
      const scaledLR = ps.logLR * w;
      totalLogLR += scaledLR;
      signals.push({ name: 'Stability', ...ps, weight: r4(w), scaledLR: r4(scaledLR) });
    }
  }

  // 3. Time Decay
  const td = timeDecaySignal(market.endDate, marketProb);
  if (td.logLR !== 0) {
    const w = getSignalWeight('TimeDec', 0.15);
    const scaledLR = td.logLR * w;
    totalLogLR += scaledLR;
    signals.push({ name: 'TimeDec', ...td, weight: r4(w), scaledLR: r4(scaledLR) });
  }

  // 4. Historical Calibration (highest weight when data available)
  const hc = historicalCalibrationSignal(marketProb);
  if (hc.logLR !== 0) {
    const w = getSignalWeight('Calibration', 0.35);
    const scaledLR = hc.logLR * w;
    totalLogLR += scaledLR;
    signals.push({ name: 'Calibration', ...hc, weight: r4(w), scaledLR: r4(scaledLR) });
  }

  // 5. Orderbook Depth Profile
  if (orderbook) {
    const dp = depthProfileSignal(orderbook, marketProb);
    const w = getSignalWeight('DepthProfile', 0.10);
    if (dp.logLR !== 0) {
      const scaledLR = dp.logLR * w;
      totalLogLR += scaledLR;
      signals.push({ name: 'DepthProfile', ...dp, weight: r4(w), scaledLR: r4(scaledLR) });
    }
  }

  // 6. News Sentiment (external data signal)
  if (newsSignal) {
    try {
      const ns = newsSignal.getSentimentSignal(market);
      if (ns && ns.logLR !== 0) {
        const w = getSignalWeight('News', 0.15);
        const scaledLR = ns.logLR * w;
        totalLogLR += scaledLR;
        signals.push({
          name: 'News',
          adjustment: ns.adjustment,
          logLR: ns.logLR,
          weight: r4(w),
          scaledLR: r4(scaledLR),
          data: {
            sentiment: ns.avgSentiment,
            headlineCount: ns.headlineCount,
            confidence: ns.confidence,
            headlines: ns.headlines,
          },
        });
      }
    } catch { /* news signal optional */ }
  }

  // 7. Bookmaker Consensus (highest-alpha external signal)
  if (bookmakerData && bookmakerData.consensusProb) {
    const bmProb = bookmakerData.consensusProb;
    const divergence = bmProb - marketProb;
    const bmLogLR = probToLogOdds(bmProb) - probToLogOdds(marketProb);
    // Scale by number of bookmakers (more consensus = more confidence)
    const bmWeight = Math.min(bookmakerData.bookmakerCount / 8, 1) * 0.40;
    const scaledLR = bmLogLR * bmWeight;
    totalLogLR += scaledLR;
    signals.push({
      name: 'Bookmaker',
      adjustment: r4(divergence),
      logLR: r4(bmLogLR),
      weight: r4(bmWeight),
      scaledLR: r4(scaledLR),
      data: {
        consensusProb: bmProb,
        divergence: r4(divergence),
        bookmakerCount: bookmakerData.bookmakerCount,
        pinnacleProb: bookmakerData.pinnacleProb,
      },
    });
  }

  // ─── Market efficiency damping ───
  // In highly efficient markets, scale down ALL signal contributions
  const volEff = volumeEfficiency(market.volume24hr, market.liquidity);
  const efficiencyDamper = 1 - (volEff * categoryTrust * 0.25); // Range: 0.78 – 1.0
  const dampedLogLR = totalLogLR * efficiencyDamper;

  signals.push({
    name: 'Efficiency',
    category: cat.category,
    categoryEfficiency: cat.efficiency,
    volumeEfficiency: r4(volEff),
    damper: r4(efficiencyDamper),
  });

  // ─── Posterior = Prior + Evidence ───
  const posteriorLogOdds = priorLogOdds + dampedLogLR;
  const estimatedProb = logOddsToProb(posteriorLogOdds);
  const edge = estimatedProb - marketProb;
  const absEdge = Math.abs(edge);

  // ─── Credible interval (uncertainty quantification) ───
  // Use number of active signals and their agreement to estimate uncertainty
  const activeSignals = signals.filter(s => s.logLR && Math.abs(s.logLR) > 0.01).length;
  const signalAgreement = signals.filter(s => s.logLR).every(s => Math.sign(s.logLR) === Math.sign(dampedLogLR));

  // Effective sample size: more signals agreeing = tighter interval
  const effectiveN = 5 + activeSignals * (signalAgreement ? 15 : 8) + calibration.totalRecorded * 0.1;
  const beta = betaParams(estimatedProb, effectiveN);
  const ci = betaCredibleInterval(beta.alpha, beta.beta);

  // ─── Confidence: Bayesian posterior strength ───
  let confidence = 'LOW';
  if (absEdge >= 0.015 && activeSignals >= 3 && signalAgreement) confidence = 'HIGH';
  else if (absEdge >= 0.008 && activeSignals >= 2) confidence = 'MEDIUM';
  else if (absEdge >= 0.004 && activeSignals >= 1) confidence = 'LOW';

  return {
    estimatedProb: r4(estimatedProb),
    marketProb: r4(marketProb),
    edge: r4(edge),
    absEdge: r4(absEdge),
    confidence,
    activeSignals,
    signalAgreement,
    credibleInterval: {
      lower: r4(ci.lower),
      upper: r4(ci.upper),
      width: r4(ci.upper - ci.lower),
    },
    posteriorLogOdds: r4(posteriorLogOdds),
    totalLogLR: r4(dampedLogLR),
    signals,
    category: cat.category,
    calibrationDataPoints: calibration.totalRecorded,
  };
}

// ─── Signal Performance Analytics ────────────────────────────────────
function getSignalPerformance() {
  const result = {};
  for (const [name, perf] of Object.entries(calibration.signalPerformance)) {
    const recentResults = perf.recentResults || [];
    const recentAccuracy = recentResults.length >= 5
      ? r4(recentResults.reduce((a, b) => a + b, 0) / recentResults.length)
      : null;

    result[name] = {
      accuracy: perf.total > 0 ? r4(perf.correct / perf.total) : null,
      recentAccuracy,
      total: perf.total,
      avgEdge: perf.total > 0 ? r4(perf.sumEdge / perf.total) : 0,
      decaying: perf.decaying || false,
      decayFactor: perf.decayFactor || 1.0,
      recentSampleSize: recentResults.length,
    };
  }
  return result;
}

function getCalibrationData() {
  return {
    buckets: calibration.buckets,
    totalRecorded: calibration.totalRecorded,
    isotonicMap: calibration.isotonicMap,
    lastTrainedAt: calibration.lastTrainedAt,
    signalPerformance: getSignalPerformance(),
  };
}

// Load calibration on module init
loadCalibration();

module.exports = {
  estimateProbability,
  recordResolution,
  getCalibrationData,
  getSignalPerformance,
  loadCalibration,
  // Exported for testing / direct use by strategies
  orderbookSignal,
  stabilitySignal,
  volumeEfficiency,
  timeDecaySignal,
  historicalCalibrationSignal,
  depthProfileSignal,
  detectCategory,
  CATEGORY_EFFICIENCY,
  // Log-odds utilities (useful for other modules)
  probToLogOdds,
  logOddsToProb,
};
