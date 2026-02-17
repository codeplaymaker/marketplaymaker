const config = require('../config');
const log = require('../utils/logger');
const fees = require('../engine/fees');
const probabilityModel = require('../engine/probabilityModel');
const client = require('../polymarket/client');

let newsSignal = null;
try { newsSignal = require('../data/newsSignal'); } catch { /* optional */ }

// Lazy-load paperTrader to avoid circular deps
let _paperTrader = null;
function getPaperTrader() {
  if (!_paperTrader) { try { _paperTrader = require('../engine/paperTrader'); } catch { _paperTrader = null; } }
  return _paperTrader;
}

const CONF = config.strategies.noBets;

/**
 * Strategy 1: Systematic NO Bets (Risk Underwriting) — v2
 *
 * WHAT CHANGED FROM v1:
 * v1 used market price as the "true probability" → Kelly saw 0 edge → no real EV.
 * v2 uses an independent probability model that combines orderbook, stability,
 * time-decay, category, and historical calibration signals to estimate the TRUE
 * probability independently. Only trades when model edge > fees + slippage.
 *
 * Core thesis (unchanged): Retail optimism bias causes YES to be overpriced
 * on high-probability events. But now we MEASURE the bias instead of assuming it.
 *
 * Edge requirements:
 * - Independent probability estimate must exceed market price by > 2.5% (raw)
 * - After fees (2%) and slippage (0.3-0.5%), net edge must be > 0.5%
 * - Multiple signals must agree (at least 2 active signals for MEDIUM+ confidence)
 * - Sized with fee-adjusted Kelly criterion (never oversized)
 */

/**
 * Score a NO bet opportunity from 0-100.
 * Incorporates edge quality, market quality, and model confidence.
 */
function scoreOpportunity(market, modelResult, evResult) {
  let score = 0;

  // ── Edge quality (40 points max) ──
  const netEdge = evResult.edgeAfterCosts;
  if (netEdge >= 0.04) score += 40;       // 4%+ net edge — excellent
  else if (netEdge >= 0.025) score += 30;  // 2.5%+ net edge — strong
  else if (netEdge >= 0.015) score += 20;  // 1.5%+ net edge — decent
  else if (netEdge >= 0.008) score += 10;  // 0.8%+ — marginal
  else return 0;                           // Below threshold

  // ── Model confidence (20 points max) ──
  if (modelResult.confidence === 'HIGH') score += 20;
  else if (modelResult.confidence === 'MEDIUM') score += 12;
  else score += 5;

  // ── Market quality (25 points max) ──
  const liq = market.liquidity;
  if (liq >= 50000) score += 12;
  else if (liq >= 10000) score += 8;
  else if (liq >= CONF.minLiquidity) score += 4;
  else return 0;

  const vol = market.volume24hr;
  if (vol >= 20000) score += 8;
  else if (vol >= 5000) score += 5;
  else if (vol >= CONF.minVolume24h) score += 3;

  if (market.spread !== null && market.spread <= 0.03) score += 5;

  // ── Time value (15 points max) ──
  if (market.endDate) {
    const daysLeft = (new Date(market.endDate) - Date.now()) / 86400000;
    if (daysLeft > 0 && daysLeft <= 3) score += 15;   // Resolving very soon
    else if (daysLeft <= 7) score += 10;               // This week
    else if (daysLeft <= 30) score += 5;
  }

  return Math.min(score, 100);
}

/**
 * Scan markets and return ranked NO bet opportunities.
 * Now uses probability model + fee-adjusted Kelly for real edge.
 */
async function findOpportunities(markets, bankroll) {
  if (!CONF.enabled) return [];

  const opportunities = [];

  for (const market of markets) {
    // Basic filters
    if (market.noPrice < CONF.minNoPrice) continue;
    if (market.liquidity < CONF.minLiquidity) continue;
    if (market.volume24hr < CONF.minVolume24h) continue;
    if (market.spread !== null && market.spread > CONF.maxSpread) continue;

    // ── Get independent probability estimate ──
    // Fetch orderbook + price history for model input
    let orderbook = null;
    let priceHistory = null;
    let noOrderbook = null;
    try {
      [orderbook, priceHistory, noOrderbook] = await Promise.all([
        market.yesTokenId ? client.getOrderbook(market.yesTokenId).catch(() => null) : null,
        market.yesTokenId ? client.getPriceHistory(market.yesTokenId, 'max', 50).catch(() => null) : null,
        market.noTokenId ? client.getOrderbook(market.noTokenId).catch(() => null) : null,
      ]);
    } catch { /* continue without enrichment */ }

    const modelResult = probabilityModel.estimateProbability(market, orderbook, priceHistory);

    // For NO bets, we want estimatedProb (YES) to be LOWER than market thinks
    // meaning NO is MORE likely than market implies
    // Actually: we're buying NO at noPrice. Our true NO prob = 1 - estimatedProb(YES).
    const trueNoProb = 1 - modelResult.estimatedProb;
    const marketNoProb = market.noPrice;

    // ── NO-side orderbook signal ──
    // The probability model only uses YES orderbook. For NO bets, we also
    // check the NO token orderbook directly. If NO bids >> NO asks, smart
    // money is accumulating NO tokens → NO is likely underpriced.
    let noSideBoost = 0;
    if (noOrderbook && noOrderbook.bids && noOrderbook.asks) {
      let noBidVol = 0, noAskVol = 0;
      for (const b of noOrderbook.bids) noBidVol += parseFloat(b.size || 0);
      for (const a of noOrderbook.asks) noAskVol += parseFloat(a.size || 0);

      if (noAskVol > 0) {
        const noRatio = noBidVol / noAskVol;
        if (noRatio > 1.2) {
          // Strong NO-side demand: scale edge boost by ratio strength
          noSideBoost = Math.min((noRatio - 1) * 0.04, 0.08);
        }
      }
    }

    const adjustedTrueNoProb = Math.min(trueNoProb + noSideBoost, 0.99);

    // ── News sentiment check ──
    // If recent news is strongly bullish (YES outcome), our NO bet edge shrinks
    // If recent news is bearish, our NO bet edge grows
    let newsAdj = 0;
    let newsData = null;
    if (newsSignal) {
      try {
        const ns = newsSignal.getSentimentSignal(market);
        if (ns && ns.headlineCount > 0) {
          // Negative news sentiment → YES less likely → NO more likely → boost
          // Positive news sentiment → YES more likely → NO less likely → reduce
          newsAdj = -ns.adjustment * 0.5; // Halved weight — news is noisy
          newsData = { sentiment: ns.avgSentiment, headlines: ns.headlineCount, confidence: ns.confidence };
        }
      } catch { /* optional */ }
    }
    const finalNoProb = Math.max(0.5, Math.min(0.99, adjustedTrueNoProb + newsAdj));

    // Edge = our NO estimate - market NO price
    // Positive edge = we think NO is more likely than market says
    const rawEdge = finalNoProb - marketNoProb;

    // ── Fee-adjusted expected value ──
    const evResult = fees.feeAdjustedEV(
      100, // Normalize to $100 for comparison
      market.noPrice,
      finalNoProb,
      market.liquidity,
    );

    if (!evResult.isProfitable) continue;
    if (evResult.edgeAfterCosts < CONF.minEdgeAfterFees) continue;

    // ── Kelly sizing with fee adjustment ──
    const positionSize = fees.feeAdjustedKelly(
      adjustedTrueNoProb,
      market.noPrice,
      bankroll,
      CONF.maxExposure,
      market.liquidity,
      CONF.kellyFraction,
    );

    if (positionSize < 1) continue; // Not worth it

    // ── Composite score ──
    const score = scoreOpportunity(market, modelResult, evResult);

    // Self-learning: use learned threshold if enough data, else default
    const pt = getPaperTrader();
    const learned = pt?.getLearnedThreshold?.('NO_BETS');
    const effectiveMinScore = learned ? learned.profitCutoff : CONF.minScore;
    if (score < effectiveMinScore) continue;

    // Confidence gating: only output if we have real conviction
    const confidence = modelResult.confidence;
    // Require minimum score thresholds per confidence level
    if (confidence === 'LOW' && score < 45) continue;      // Filter out weak LOW signals
    if (confidence === 'MEDIUM' && score < 35) continue;

    opportunities.push({
      strategy: 'NO_BETS',
      market: market.question,
      conditionId: market.conditionId,
      slug: market.slug,
      tokenId: market.noTokenId,
      side: 'NO',
      noPrice: market.noPrice,
      yesPrice: market.yesPrice,
      score,
      positionSize: Math.round(positionSize * 100) / 100,
      // Real edge metrics
      edge: {
        raw: Math.round(rawEdge * 10000) / 10000,
        netEV: evResult.netEV,
        edgeAfterCosts: evResult.edgeAfterCosts,
        breakEvenProb: evResult.breakEvenProb,
        fees: evResult.fees,
        slippage: evResult.slippage,
      },
      model: {
        estimatedYesProb: modelResult.estimatedProb,
        estimatedNoProb: Math.round(finalNoProb * 10000) / 10000,
        noSideBoost: Math.round(noSideBoost * 10000) / 10000,
        newsAdj: Math.round(newsAdj * 10000) / 10000,
        newsData,
        confidence: modelResult.confidence,
        activeSignals: modelResult.activeSignals,
        category: modelResult.category,
      },
      liquidity: market.liquidity,
      volume24hr: market.volume24hr,
      spread: market.spread,
      endDate: market.endDate,
      confidence: modelResult.confidence,
      riskLevel: finalNoProb >= 0.92 ? 'LOW' : finalNoProb >= 0.85 ? 'MEDIUM' : 'HIGH',
      riskNote: `If event resolves YES (${((1 - finalNoProb) * 100).toFixed(1)}% chance), you lose $${market.noPrice.toFixed(2)} per share. Risk/reward: risk $${market.noPrice.toFixed(2)} to win $${(1 - market.noPrice).toFixed(2)}.${newsData ? ` News: ${newsData.headlines} headlines, sentiment ${newsData.sentiment > 0 ? '+' : ''}${newsData.sentiment.toFixed(1)}` : ''}`,
    });
  }

  return opportunities.sort((a, b) => b.score - a.score);
}

module.exports = {
  name: 'NO_BETS',
  findOpportunities,
  scoreOpportunity,
};
