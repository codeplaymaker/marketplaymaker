/**
 * Relative Value Strategy
 *
 * Finds mispricings between related markets. If two markets cover the same
 * event but disagree on probabilities, there's a relative value edge.
 *
 * Types:
 * 1. Cross-timeframe: "Bitcoin >$70K by March" vs "Bitcoin >$70K by April"
 *    → April should be ≥ March probability (monotonicity)
 * 2. Nested outcomes: "Trump wins" vs "Republican wins"
 *    → Republican ≥ Trump (Trump winning implies Republican winning)
 * 3. Complement markets: "Bitcoin >$70K" vs "Bitcoin <$70K"
 *    → Should sum to ~100% (minus vig)
 * 4. Cross-platform: Same market on Polymarket vs Kalshi
 *    → Price gap = pure arbitrage opportunity
 *
 * Edge: Markets are created independently and can temporarily disagree
 * with each other before arbitrageurs correct the pricing.
 */

const log = require('../utils/logger');
const { feeAdjustedEV } = require('../engine/fees');

const STRATEGY_NAME = 'RELATIVE_VALUE';

// ─── Market Clustering ───────────────────────────────────────────────
/**
 * Group markets by related topic/entity for comparison.
 * Uses slug prefix, question keywords, and event grouping.
 */
function clusterMarkets(allMarkets) {
  const clusters = new Map(); // key → [markets]

  for (const market of allMarkets) {
    const question = (market.question || '').toLowerCase();
    const slug = (market.slug || '').toLowerCase();

    // Extract entity/topic keys
    const keys = new Set();

    // Slug-based grouping (polymarket uses consistent slug prefixes)
    const slugPrefix = slug.split('-').slice(0, 3).join('-');
    if (slugPrefix.length > 5) keys.add(`slug:${slugPrefix}`);

    // Event-based grouping
    if (market.groupItemTitle) keys.add(`event:${market.groupItemTitle.toLowerCase().slice(0, 40)}`);

    // Keyword extraction for crypto markets
    const cryptoMatch = question.match(/\b(bitcoin|btc|ethereum|eth|solana|sol)\b/i);
    if (cryptoMatch) {
      keys.add(`crypto:${cryptoMatch[1].toLowerCase()}`);
      // Extract price target
      const priceMatch = question.match(/\$?([\d,]+)\s*k?/);
      if (priceMatch) keys.add(`crypto:${cryptoMatch[1].toLowerCase()}-price`);
    }

    // Political markets
    const politicalMatch = question.match(/\b(trump|biden|harris|desantis|haley|newsom|obama)\b/i);
    if (politicalMatch) keys.add(`politics:${politicalMatch[1].toLowerCase()}`);

    // Sports markets
    const sportsMatch = question.match(/\b(nba|nfl|mlb|nhl|epl|ucl|world cup|super bowl|playoffs)\b/i);
    if (sportsMatch) keys.add(`sports:${sportsMatch[1].toLowerCase()}`);

    for (const key of keys) {
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key).push(market);
    }
  }

  return clusters;
}

// ─── Relative Value Analysis ────────────────────────────────────────
/**
 * Find monotonicity violations within a cluster.
 * E.g., "Bitcoin >$70K by March" at 60% but "Bitcoin >$70K by April" at 55%
 * → April should be ≥ March (more time = higher or equal probability)
 */
function findMonotonicityViolations(markets) {
  const opportunities = [];

  // Sort by deadline if available
  const withDeadlines = markets.filter(m => m.endDate || m.expirationDate);
  if (withDeadlines.length < 2) return opportunities;

  withDeadlines.sort((a, b) =>
    new Date(a.endDate || a.expirationDate) - new Date(b.endDate || b.expirationDate)
  );

  for (let i = 0; i < withDeadlines.length - 1; i++) {
    const earlier = withDeadlines[i];
    const later = withDeadlines[i + 1];

    const earlyPrice = parseFloat(earlier.yesPrice || earlier.outcomePrices?.[0] || 0);
    const latePrice = parseFloat(later.yesPrice || later.outcomePrices?.[0] || 0);

    // Later deadline should have >= probability of earlier deadline
    if (latePrice < earlyPrice - 0.03) { // 3% threshold for significance
      const divergence = earlyPrice - latePrice;
      opportunities.push({
        type: 'MONOTONICITY_VIOLATION',
        marketA: earlier,
        marketB: later,
        priceA: earlyPrice,
        priceB: latePrice,
        divergence: Math.round(divergence * 1000) / 1000,
        trade: {
          // Buy the underpriced later deadline, sell the overpriced earlier one
          buyMarket: later,
          buySide: 'YES',
          buyPrice: latePrice,
          sellMarket: earlier,
          sellSide: 'NO',
          sellPrice: earlyPrice,
        },
      });
    }
  }

  return opportunities;
}

/**
 * Find complement violations (markets that should sum to ~100%).
 * Binary markets on the same event: YES + NO should = 1.
 */
function findComplementViolations(markets) {
  const opportunities = [];

  // Look for market pairs that are logical complements
  for (let i = 0; i < markets.length; i++) {
    for (let j = i + 1; j < markets.length; j++) {
      const a = markets[i];
      const b = markets[j];

      const qA = (a.question || '').toLowerCase();
      const qB = (b.question || '').toLowerCase();

      // Check if they're asking about opposing outcomes
      const isComplement =
        (qA.includes('above') && qB.includes('below')) ||
        (qA.includes('over') && qB.includes('under')) ||
        (qA.includes('yes') && qB.includes('no')) ||
        (qA.includes('win') && qB.includes('lose'));

      if (!isComplement) continue;

      const priceA = parseFloat(a.yesPrice || 0);
      const priceB = parseFloat(b.yesPrice || 0);
      const sum = priceA + priceB;

      // Should sum to ~1.0 (allowing 2-3% for vig)
      if (sum > 1.05 || sum < 0.92) {
        opportunities.push({
          type: 'COMPLEMENT_VIOLATION',
          marketA: a,
          marketB: b,
          priceA,
          priceB,
          sum: Math.round(sum * 1000) / 1000,
          overround: Math.round((sum - 1) * 1000) / 1000,
          divergence: Math.round(Math.abs(sum - 1) * 1000) / 1000,
        });
      }
    }
  }

  return opportunities;
}

/**
 * Find cross-platform arbitrage between Polymarket and Kalshi.
 */
function findCrossPlatformArbs(allMarkets) {
  const opportunities = [];

  const polymarkets = allMarkets.filter(m => m.platform === 'POLYMARKET');
  const kalshiMarkets = allMarkets.filter(m => m.platform === 'KALSHI');

  if (kalshiMarkets.length === 0) return opportunities;

  // Simple fuzzy matching by question text
  for (const pm of polymarkets) {
    const pmQ = (pm.question || '').toLowerCase().replace(/[^a-z0-9 ]/g, '');

    for (const km of kalshiMarkets) {
      const kmQ = (km.question || km.title || '').toLowerCase().replace(/[^a-z0-9 ]/g, '');

      // Calculate word overlap
      const pmWords = new Set(pmQ.split(/\s+/).filter(w => w.length > 3));
      const kmWords = new Set(kmQ.split(/\s+/).filter(w => w.length > 3));
      const overlap = [...pmWords].filter(w => kmWords.has(w)).length;
      const maxWords = Math.max(pmWords.size, kmWords.size);
      const similarity = maxWords > 0 ? overlap / maxWords : 0;

      if (similarity < 0.5) continue; // Not similar enough

      const pmPrice = parseFloat(pm.yesPrice || 0);
      const kmPrice = parseFloat(km.yesPrice || km.yes_price || 0);
      const priceDiff = Math.abs(pmPrice - kmPrice);

      if (priceDiff >= 0.04) { // 4%+ divergence = potential arb
        opportunities.push({
          type: 'CROSS_PLATFORM',
          polymarket: pm,
          kalshi: km,
          pmPrice,
          kmPrice,
          divergence: Math.round(priceDiff * 1000) / 1000,
          similarity: Math.round(similarity * 100) / 100,
          direction: pmPrice > kmPrice ? 'BUY_KALSHI' : 'BUY_POLY',
        });
      }
    }
  }

  return opportunities;
}

// ─── Strategy Runner ─────────────────────────────────────────────────
function findOpportunities(allMarkets, bankroll = 1000) {
  const opportunities = [];
  const clusters = clusterMarkets(allMarkets);

  // Check each cluster for relative value opportunities
  for (const [key, markets] of clusters) {
    if (markets.length < 2) continue;

    // Monotonicity violations
    const monoViolations = findMonotonicityViolations(markets);
    for (const mv of monoViolations) {
      const edge = mv.divergence / 2; // Conservative: half the divergence
      const price = mv.trade.buyPrice;
      const liquidity = parseFloat(mv.trade.buyMarket.liquidity || 5000);
      const netEdge = feeAdjustedEV(edge, price, bankroll * 0.02, liquidity);

      if (netEdge <= 0.005) continue;

      const positionSize = Math.min(bankroll * 0.03, Math.max(5, bankroll * 0.25 * edge));

      opportunities.push({
        strategy: STRATEGY_NAME,
        type: 'MONOTONICITY',
        market: mv.trade.buyMarket.question?.slice(0, 100),
        conditionId: mv.trade.buyMarket.conditionId,
        slug: mv.trade.buyMarket.slug,
        side: mv.trade.buySide,
        yesPrice: mv.priceB,
        noPrice: 1 - mv.priceB,
        price,
        edge: Math.round(edge * 10000) / 10000,
        netEV: Math.round(netEdge * 10000) / 10000,
        positionSize: Math.round(positionSize * 100) / 100,
        score: Math.round(mv.divergence * 200),
        confidence: mv.divergence > 0.08 ? 'HIGH' : 'MEDIUM',
        relatedMarket: mv.marketA.question?.slice(0, 60),
        divergence: mv.divergence,
        volume24h: parseFloat(mv.trade.buyMarket.volume24hr || 0),
        liquidity,
      });
    }

    // Complement violations
    const compViolations = findComplementViolations(markets);
    for (const cv of compViolations) {
      if (cv.sum > 1.05) {
        // Overpriced pair: both prices too high → sell YES on both (buy NO)
        const edge = (cv.sum - 1) / 2;
        const netEdge = feeAdjustedEV(edge, 0.5, bankroll * 0.02, 5000);
        if (netEdge <= 0.005) continue;

        opportunities.push({
          strategy: STRATEGY_NAME,
          type: 'COMPLEMENT_OVERPRICED',
          market: cv.marketA.question?.slice(0, 100),
          conditionId: cv.marketA.conditionId,
          slug: cv.marketA.slug,
          side: 'NO',
          yesPrice: cv.priceA,
          noPrice: 1 - cv.priceA,
          price: 1 - cv.priceA,
          edge: Math.round(edge * 10000) / 10000,
          netEV: Math.round(netEdge * 10000) / 10000,
          positionSize: Math.round(Math.min(bankroll * 0.02, 20) * 100) / 100,
          score: Math.round(cv.divergence * 200),
          confidence: cv.divergence > 0.06 ? 'HIGH' : 'MEDIUM',
          complement: cv.marketB.question?.slice(0, 60),
          pairSum: cv.sum,
          volume24h: parseFloat(cv.marketA.volume24hr || 0),
          liquidity: parseFloat(cv.marketA.liquidity || 5000),
        });
      }
    }
  }

  // Cross-platform arbs
  const crossPlatformArbs = findCrossPlatformArbs(allMarkets);
  for (const arb of crossPlatformArbs) {
    const edge = arb.divergence / 2;
    const netEdge = feeAdjustedEV(edge, 0.5, bankroll * 0.02, 5000);
    if (netEdge <= 0.005) continue;

    const targetMarket = arb.direction === 'BUY_POLY' ? arb.polymarket : arb.kalshi;
    opportunities.push({
      strategy: STRATEGY_NAME,
      type: 'CROSS_PLATFORM',
      market: (targetMarket.question || targetMarket.title || '').slice(0, 100),
      conditionId: targetMarket.conditionId || targetMarket.ticker_name,
      slug: targetMarket.slug,
      side: 'YES',
      yesPrice: arb.direction === 'BUY_POLY' ? arb.pmPrice : arb.kmPrice,
      price: arb.direction === 'BUY_POLY' ? arb.pmPrice : arb.kmPrice,
      edge: Math.round(edge * 10000) / 10000,
      netEV: Math.round(netEdge * 10000) / 10000,
      positionSize: Math.round(Math.min(bankroll * 0.03, 30) * 100) / 100,
      score: Math.round(arb.divergence * 300 * arb.similarity),
      confidence: arb.divergence > 0.08 ? 'HIGH' : 'MEDIUM',
      crossPlatform: arb,
      volume24h: parseFloat(targetMarket.volume24hr || 0),
      liquidity: parseFloat(targetMarket.liquidity || 5000),
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
  clusterMarkets,
  findMonotonicityViolations,
  findComplementViolations,
  findCrossPlatformArbs,
};
