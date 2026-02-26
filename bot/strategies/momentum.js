/**
 * Momentum Strategy
 *
 * Detects markets where price momentum indicates informed trading.
 * Follows sharp moves that are confirmed by volume (not noise).
 *
 * Signals:
 * 1. Price acceleration — rate of price change is increasing
 * 2. Volume-confirmed moves — price moves with above-average volume
 * 3. Breakout detection — price breaks through recent range
 * 4. Trend strength via exponential MA crossover
 *
 * Edge: Prediction markets have persistent momentum because
 * information propagation is slow (hours/days, not seconds).
 * News/events get priced in gradually unlike equity markets.
 */

const log = require('../utils/logger');
const { estimateSlippage, feeAdjustedEV } = require('../engine/fees');

const STRATEGY_NAME = 'MOMENTUM';

// ─── Price History ───────────────────────────────────────────────────
const priceHistory = new Map(); // conditionId → [{price, volume, timestamp}]
const MAX_HISTORY = 200;

function recordPrice(conditionId, price, volume) {
  if (!priceHistory.has(conditionId)) priceHistory.set(conditionId, []);
  const history = priceHistory.get(conditionId);
  history.push({ price, volume: volume || 0, timestamp: Date.now() });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
}

// ─── Technical Indicators ────────────────────────────────────────────
function ema(data, period) {
  const k = 2 / (period + 1);
  let result = data[0];
  for (let i = 1; i < data.length; i++) {
    result = data[i] * k + result * (1 - k);
  }
  return result;
}

function rateOfChange(data, period) {
  if (data.length < period + 1) return 0;
  const old = data[data.length - period - 1];
  const current = data[data.length - 1];
  return old > 0 ? (current - old) / old : 0;
}

function volatility(data, period) {
  if (data.length < period) return 0;
  const slice = data.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length;
  return Math.sqrt(variance);
}

function zScore(value, data, period) {
  if (data.length < period) return 0;
  const slice = data.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const std = volatility(slice, period);
  return std > 0 ? (value - mean) / std : 0;
}

// ─── Momentum Analysis ──────────────────────────────────────────────
function analyzeMomentum(conditionId) {
  const history = priceHistory.get(conditionId);
  if (!history || history.length < 10) return null;

  const prices = history.map(h => h.price);
  const volumes = history.map(h => h.volume);

  // EMA crossover (fast vs slow)
  const emaFast = ema(prices, 5);
  const emaSlow = ema(prices, 15);
  const emaCrossover = emaFast - emaSlow;

  // Rate of change (price acceleration)
  const roc5 = rateOfChange(prices, 5);
  const roc10 = rateOfChange(prices, 10);
  const acceleration = roc5 - roc10; // Positive = accelerating

  // Volume analysis
  const avgVolume = volumes.length > 10
    ? volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length)
    : 0;
  const recentVolume = volumes.length > 0 ? volumes[volumes.length - 1] : 0;
  const volumeRatio = avgVolume > 0 ? recentVolume / avgVolume : 1;

  // Volume-confirmed momentum: price move + above-average volume
  const volumeConfirmed = volumeRatio > 1.5 && Math.abs(roc5) > 0.02;

  // Breakout detection: price outside 2-sigma band
  const priceZ = zScore(prices[prices.length - 1], prices, 20);
  const isBreakout = Math.abs(priceZ) > 2.0;

  // Trend strength composite score
  const trendStrength =
    (emaCrossover > 0 ? 1 : -1) *
    (Math.abs(roc5) * 200 + // Price change weight
     Math.abs(acceleration) * 100 + // Acceleration weight
     (volumeConfirmed ? 20 : 0) + // Volume confirmation bonus
     (isBreakout ? 15 : 0)); // Breakout bonus

  return {
    emaCrossover: Math.round(emaCrossover * 10000) / 10000,
    roc5: Math.round(roc5 * 10000) / 10000,
    roc10: Math.round(roc10 * 10000) / 10000,
    acceleration: Math.round(acceleration * 10000) / 10000,
    volumeRatio: Math.round(volumeRatio * 100) / 100,
    volumeConfirmed,
    priceZ: Math.round(priceZ * 100) / 100,
    isBreakout,
    trendStrength: Math.round(trendStrength * 100) / 100,
    direction: trendStrength > 0 ? 'UP' : 'DOWN',
    snapshots: history.length,
  };
}

// ─── Strategy Runner ─────────────────────────────────────────────────
function findOpportunities(allMarkets, bankroll = 1000) {
  const opportunities = [];

  for (const market of allMarkets) {
    const yesPrice = parseFloat(market.yesPrice || market.outcomePrices?.[0] || 0);
    const volume24h = parseFloat(market.volume24hr || 0);
    const liquidity = parseFloat(market.liquidity || 0);

    // Skip thin/extreme markets
    if (volume24h < 3000 || liquidity < 2000) continue;
    if (yesPrice < 0.08 || yesPrice > 0.92) continue;

    // Record current price
    recordPrice(market.conditionId, yesPrice, volume24h);

    // Analyze momentum
    const momentum = analyzeMomentum(market.conditionId);
    if (!momentum || momentum.snapshots < 10) continue;

    // Need strong momentum signal
    const absStrength = Math.abs(momentum.trendStrength);
    if (absStrength < 25) continue; // Min threshold
    if (!momentum.volumeConfirmed && absStrength < 40) continue; // Need volume OR very strong
    if (momentum.isBreakout && absStrength < 20) continue; // Breakouts get lower threshold

    // Determine trade direction
    const side = momentum.direction === 'UP' ? 'YES' : 'NO';
    const price = side === 'YES' ? yesPrice : (1 - yesPrice);

    // Edge estimate: momentum strength as proxy for mispricing
    const rawEdge = Math.min(0.15, absStrength / 300);
    const netEdge = feeAdjustedEV(rawEdge, price, bankroll * 0.02, liquidity);

    if (netEdge <= 0.003) continue;

    // Position sizing (conservative: 1.5% Kelly fraction for momentum)
    const kellyFraction = 0.15;
    const kellySize = bankroll * kellyFraction * rawEdge / Math.max(0.1, 1 - price);
    const positionSize = Math.min(bankroll * 0.025, Math.max(5, kellySize));

    const score = Math.round(
      absStrength * 0.4 +
      (momentum.volumeConfirmed ? 20 : 0) +
      (momentum.isBreakout ? 15 : 0) +
      (volume24h / 1000) * 0.5
    );

    opportunities.push({
      strategy: STRATEGY_NAME,
      type: momentum.isBreakout ? 'BREAKOUT' : 'TREND_FOLLOW',
      market: market.question?.slice(0, 100),
      conditionId: market.conditionId,
      slug: market.slug,
      side,
      yesPrice,
      noPrice: 1 - yesPrice,
      price,
      edge: Math.round(rawEdge * 10000) / 10000,
      netEV: Math.round(netEdge * 10000) / 10000,
      positionSize: Math.round(positionSize * 100) / 100,
      score,
      confidence: score >= 60 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW',
      momentum,
      volume24h,
      liquidity,
    });
  }

  // Sort by score descending
  opportunities.sort((a, b) => b.score - a.score);

  if (opportunities.length > 0) {
    log.info('STRATEGY', `${STRATEGY_NAME}: found ${opportunities.length} opportunities`);
  }

  return opportunities;
}

module.exports = {
  name: STRATEGY_NAME,
  findOpportunities,
  analyzeMomentum,
  recordPrice,
};
