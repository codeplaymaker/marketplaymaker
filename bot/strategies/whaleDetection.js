/**
 * Whale Detection Strategy
 *
 * Monitors for large trades that signal informed money entering a market.
 * When a whale (large position) enters, follow their direction if confirmed
 * by other signals.
 *
 * Signals:
 * 1. Outsized volume spikes — sudden volume 3x+ above average
 * 2. Price impact trades — visible slippage indicates large orders
 * 3. Orderbook imbalance — heavy one-sided depth suggests pending large orders
 * 4. Sequential price moves — steady accumulation pattern (not spikes)
 *
 * Edge: Whale trades often contain non-public information. Following
 * confirmed whale activity with a slight delay captures the move while
 * avoiding front-running noise.
 */

const log = require('../utils/logger');
const { feeAdjustedEV } = require('../engine/fees');

const STRATEGY_NAME = 'WHALE_DETECTION';

// ─── Volume Tracking ─────────────────────────────────────────────────
const volumeHistory = new Map(); // conditionId → [{volume, price, timestamp}]
const MAX_HISTORY = 100;

function recordVolume(conditionId, volume24h, price) {
  if (!volumeHistory.has(conditionId)) volumeHistory.set(conditionId, []);
  const history = volumeHistory.get(conditionId);
  history.push({ volume: volume24h, price, timestamp: Date.now() });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
}

// ─── Whale Detection Analysis ────────────────────────────────────────
function detectWhaleActivity(conditionId, currentVolume, currentPrice, liquidity) {
  const history = volumeHistory.get(conditionId);
  if (!history || history.length < 5) return null;

  // Volume spike detection
  const avgVolume = history.slice(-20).reduce((a, b) => a + b.volume, 0) / Math.min(20, history.length);
  const volumeSpike = avgVolume > 0 ? currentVolume / avgVolume : 1;

  // Price movement with volume
  const prices = history.map(h => h.price);
  const priceChange = prices.length >= 5
    ? prices[prices.length - 1] - prices[Math.max(0, prices.length - 5)]
    : 0;
  const priceChangePercent = prices[0] > 0 ? priceChange / prices[0] : 0;

  // Volume-weighted price direction
  const recentEntries = history.slice(-5);
  let vwapDirection = 0;
  let totalVw = 0;
  for (let i = 1; i < recentEntries.length; i++) {
    const priceDelta = recentEntries[i].price - recentEntries[i - 1].price;
    const weight = recentEntries[i].volume;
    vwapDirection += priceDelta * weight;
    totalVw += weight;
  }
  vwapDirection = totalVw > 0 ? vwapDirection / totalVw : 0;

  // Accumulation pattern: steady price moves in same direction with increasing volume
  let accumulationScore = 0;
  if (recentEntries.length >= 3) {
    const directions = [];
    for (let i = 1; i < recentEntries.length; i++) {
      directions.push(recentEntries[i].price > recentEntries[i - 1].price ? 1 : -1);
    }
    const consistency = Math.abs(directions.reduce((a, b) => a + b, 0)) / directions.length;
    const volumeIncreasing = recentEntries[recentEntries.length - 1].volume > recentEntries[0].volume;
    accumulationScore = consistency * (volumeIncreasing ? 1.5 : 0.8);
  }

  // Price impact: how much did price move per unit of volume?
  const priceImpact = avgVolume > 0 ? Math.abs(priceChangePercent) / (currentVolume / avgVolume) : 0;
  const highImpact = priceImpact > 0.02; // >2% price per volume unit = big player

  // Orderbook imbalance proxy: if price is moving consistently with volume,
  // someone is absorbing liquidity on one side
  const imbalanceProxy = Math.abs(vwapDirection) > 0.005 && volumeSpike > 2;

  // Whale confidence score (0-100)
  let whaleScore = 0;
  if (volumeSpike >= 3) whaleScore += 30;
  else if (volumeSpike >= 2) whaleScore += 20;
  else if (volumeSpike >= 1.5) whaleScore += 10;

  if (highImpact) whaleScore += 20;
  if (accumulationScore > 0.7) whaleScore += 25;
  if (imbalanceProxy) whaleScore += 15;
  if (Math.abs(priceChangePercent) > 0.05) whaleScore += 10;

  const direction = vwapDirection > 0 ? 'BUYING' : vwapDirection < 0 ? 'SELLING' : 'NEUTRAL';

  return {
    volumeSpike: Math.round(volumeSpike * 100) / 100,
    priceChange: Math.round(priceChangePercent * 10000) / 10000,
    vwapDirection: Math.round(vwapDirection * 10000) / 10000,
    accumulationScore: Math.round(accumulationScore * 100) / 100,
    priceImpact: Math.round(priceImpact * 10000) / 10000,
    highImpact,
    imbalanceProxy,
    whaleScore,
    direction,
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

    // Need decent volume to detect whales
    if (volume24h < 5000 || liquidity < 3000) continue;
    if (yesPrice < 0.05 || yesPrice > 0.95) continue;

    // Record volume
    recordVolume(market.conditionId, volume24h, yesPrice);

    // Detect whale activity
    const whale = detectWhaleActivity(market.conditionId, volume24h, yesPrice, liquidity);
    if (!whale || whale.whaleScore < 40) continue;
    if (whale.direction === 'NEUTRAL') continue;

    // Follow the whale: buy in their direction
    const side = whale.direction === 'BUYING' ? 'YES' : 'NO';
    const price = side === 'YES' ? yesPrice : (1 - yesPrice);

    // Edge estimate: whale score as proxy for information asymmetry
    const rawEdge = Math.min(0.12, whale.whaleScore / 500);
    const netEdge = feeAdjustedEV(rawEdge, price, bankroll * 0.02, liquidity);

    if (netEdge <= 0.003) continue;

    // Position sizing: 1/5 Kelly (whales are high-conviction but risky)
    const kellyFraction = 0.20;
    const kellySize = bankroll * kellyFraction * rawEdge / Math.max(0.1, 1 - price);
    const positionSize = Math.min(bankroll * 0.03, Math.max(5, kellySize));

    const score = Math.round(
      whale.whaleScore * 0.6 +
      (whale.highImpact ? 15 : 0) +
      (whale.accumulationScore > 0.7 ? 10 : 0) +
      Math.min(15, volume24h / 5000)
    );

    opportunities.push({
      strategy: STRATEGY_NAME,
      type: whale.accumulationScore > 0.7 ? 'ACCUMULATION' : 'SPIKE',
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
      confidence: score >= 55 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW',
      whale,
      volume24h,
      liquidity,
    });
  }

  opportunities.sort((a, b) => b.score - a.score);

  if (opportunities.length > 0) {
    log.info('STRATEGY', `${STRATEGY_NAME}: found ${opportunities.length} opportunities`);
  }

  return opportunities;
}

module.exports = {
  name: STRATEGY_NAME,
  findOpportunities,
  detectWhaleActivity,
  recordVolume,
};
