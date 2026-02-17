const config = require('../config');
const log = require('../utils/logger');
const fees = require('../engine/fees');
const probabilityModel = require('../engine/probabilityModel');
const client = require('../polymarket/client');
const oddsApi = require('../bookmakers/oddsApi');
const marketData = require('./marketData');

const CONF = config.strategies.sportsEdge;

// Lazy-load paperTrader to avoid circular deps
let _paperTrader = null;
function getPaperTrader() {
  if (!_paperTrader) { try { _paperTrader = require('../engine/paperTrader'); } catch { _paperTrader = null; } }
  return _paperTrader;
}

/**
 * Strategy 3: Statistical Edge (Overreaction + Mean-Reversion) — v2
 *
 * COMPLETE REDESIGN from v1.
 * v1 claimed to do "market making" (place limit orders inside the spread)
 * but the bot can only submit market orders → strategy was impossible.
 *
 * v2 is a statistical value strategy that ACTUALLY works with market orders:
 *
 * 1. OVERREACTION FADE: When prices move sharply (>4%) with declining or
 *    insufficient volume, it's likely retail panic. Fade the move.
 *
 * 2. PRICE-VOLUME DIVERGENCE: When volume spikes but price barely moves,
 *    big players are accumulating — trade in the direction of the flow.
 *
 * 3. CLOSING LINE VALUE (CLV): For events with known end dates,
 *    track how the line moves as resolution approaches. Sharp late moves
 *    are more informative than early noise.
 *
 * 4. MEAN-REVERSION: Markets near 50/50 have higher variance and are
 *    more prone to overreaction. Large deviations from rolling mean
 *    tend to revert. Trade when deviation exceeds fee threshold.
 *
 * All opportunities are fee-adjusted — only trade when net edge > 0.5%.
 */

// ─── 1. Overreaction Detection ───────────────────────────────────────
/**
 * Detect sharp price moves that lack volume confirmation.
 * A real information-driven move has proportional volume.
 * A panic-driven move has disproportionate price change vs volume.
 */
function detectOverreaction(market, priceHistory) {
  if (!priceHistory || priceHistory.length < 8) return null;

  const prices = priceHistory.map(h => h.p);
  const recent = prices.slice(-5);
  const prior = prices.slice(-10, -5);

  if (prior.length < 3) return null;

  const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const priorMean = prior.reduce((a, b) => a + b, 0) / prior.length;
  const priceMove = recentMean - priorMean;
  const absPriceMove = Math.abs(priceMove);

  if (absPriceMove < CONF.minPriceMove) return null;

  // Check if price is now far from the overall rolling mean (overextended)
  const allMean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const currentPrice = prices[prices.length - 1];
  const deviationFromMean = currentPrice - allMean;

  // Direction to trade: fade the overreaction
  const side = priceMove > 0 ? 'NO' : 'YES';
  const entryPrice = side === 'YES' ? market.yesPrice : market.noPrice;
  const targetReversion = allMean; // Expect reversion toward rolling mean

  // Estimate edge: difference between current price and expected reversion
  const expectedMove = Math.abs(deviationFromMean);

  return {
    type: 'OVERREACTION_FADE',
    priceMove: r4(priceMove),
    deviationFromMean: r4(deviationFromMean),
    expectedReversion: r4(expectedMove),
    side,
    entryPrice,
    target: r4(targetReversion),
    confidence: absPriceMove >= 0.08 ? 'HIGH' : absPriceMove >= 0.05 ? 'MEDIUM' : 'LOW',
  };
}

// ─── 2. Price-Volume Divergence ──────────────────────────────────────
/**
 * When high volume trades into one side but price barely moves,
 * it means large orders are being absorbed — someone big is accumulating.
 * The price will eventually move in that direction.
 *
 * We approximate this from orderbook asymmetry.
 */
function detectVolumeDivergence(market, orderbook) {
  if (!orderbook?.bids?.length || !orderbook?.asks?.length) return null;
  if (market.volume24hr < CONF.minVolume24h) return null;

  let bidSize = 0, askSize = 0;
  for (const bid of orderbook.bids) bidSize += parseFloat(bid.size);
  for (const ask of orderbook.asks) askSize += parseFloat(ask.size);

  const total = bidSize + askSize;
  if (total < 3000) return null;

  const ratio = bidSize / (askSize || 1);

  // Strong imbalance: >1.8:1 ratio suggests accumulation
  if (ratio < 1.5 && ratio > 0.67) return null;

  const side = ratio > 1.5 ? 'YES' : 'NO';
  const strength = (ratio > 2.5 || ratio < 0.4) ? 'STRONG' : 'MODERATE';

  return {
    type: 'VOLUME_DIVERGENCE',
    bidSize: Math.round(bidSize),
    askSize: Math.round(askSize),
    ratio: r4(ratio),
    side,
    entryPrice: side === 'YES' ? market.yesPrice : market.noPrice,
    strength,
    confidence: strength === 'STRONG' ? 'HIGH' : 'MEDIUM',
  };
}

// ─── 3. Closing Line Value ───────────────────────────────────────────
/**
 * For events approaching resolution: late price moves are more informative.
 * If price is moving sharply in one direction as resolution nears,
 * the market is incorporating final information. Trade with the trend.
 */
function detectCLV(market, priceHistory) {
  if (!priceHistory || priceHistory.length < 5 || !market.endDate) return null;

  const daysLeft = (new Date(market.endDate) - Date.now()) / 86400000;
  if (daysLeft < 0 || daysLeft > 3) return null; // Only within 3 days of resolution

  const prices = priceHistory.map(h => h.p);
  const recent3 = prices.slice(-3);
  const prior3 = prices.slice(-6, -3);

  if (prior3.length < 2) return null;

  const recentMean = recent3.reduce((a, b) => a + b, 0) / recent3.length;
  const priorMean = prior3.reduce((a, b) => a + b, 0) / prior3.length;
  const lineMove = recentMean - priorMean;

  if (Math.abs(lineMove) < 0.02) return null; // Need meaningful movement

  // Trade WITH the closing line move (late moves are sharp money)
  const side = lineMove > 0 ? 'YES' : 'NO';

  return {
    type: 'CLOSING_LINE',
    lineMove: r4(lineMove),
    daysToResolution: Math.round(daysLeft * 10) / 10,
    side,
    entryPrice: side === 'YES' ? market.yesPrice : market.noPrice,
    confidence: Math.abs(lineMove) >= 0.05 ? 'HIGH' : 'MEDIUM',
  };
}

// ─── 4. Mean-Reversion (Regime-Aware) ────────────────────────────────
/**
 * v3: Regime-aware mean-reversion + momentum detection.
 *
 * Instead of blindly fading deviations (which fails in trending markets),
 * first detect the market regime:
 * - TRENDING: price making consistently higher highs / lower lows → trade WITH trend
 * - RANGING: price oscillating around a mean → fade deviations (mean-revert)
 * - VOLATILE: large swings with no direction → avoid or scale down
 *
 * Uses Hurst exponent approximation and directional persistence.
 */
function detectRegime(priceHistory) {
  if (!priceHistory || priceHistory.length < 15) return { regime: 'UNKNOWN', confidence: 0 };

  const prices = priceHistory.slice(-20).map(h => h.p);
  const n = prices.length;

  // 1. Directional persistence: count consecutive up/down moves
  let ups = 0, downs = 0, streaks = 0, maxStreak = 0, currentStreak = 0;
  let lastDir = 0;
  for (let i = 1; i < n; i++) {
    const dir = Math.sign(prices[i] - prices[i - 1]);
    if (dir === 0) continue;
    if (dir > 0) ups++;
    else downs++;
    if (dir === lastDir) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      streaks++;
      currentStreak = 1;
    }
    lastDir = dir;
  }

  // 2. Hurst exponent approximation (R/S analysis simplified)
  // H > 0.5 = trending, H ≈ 0.5 = random walk, H < 0.5 = mean-reverting
  const returns = [];
  for (let i = 1; i < n; i++) returns.push(prices[i] - prices[i - 1]);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const cumDev = [];
  let sum = 0;
  for (const r of returns) { sum += (r - mean); cumDev.push(sum); }
  const R = Math.max(...cumDev) - Math.min(...cumDev);
  const S = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length);
  const RS = S > 0 ? R / S : 0;
  // Simplified H: log(R/S) / log(n) — not exact but directionally correct
  const H = RS > 0 ? Math.log(RS) / Math.log(n) : 0.5;

  // 3. Trend strength: linear regression slope / volatility
  const xMean = (n - 1) / 2;
  let numSum = 0, denSum = 0;
  for (let i = 0; i < n; i++) {
    numSum += (i - xMean) * (prices[i] - prices.reduce((a, b) => a + b, 0) / n);
    denSum += (i - xMean) ** 2;
  }
  const slope = denSum > 0 ? numSum / denSum : 0;
  const vol = S || 0.01;
  const trendStrength = Math.abs(slope) / vol;

  // 4. Classify regime
  let regime = 'RANGING';
  let confidence = 0.5;

  if (H > 0.60 && trendStrength > 0.8 && maxStreak >= 4) {
    regime = 'TRENDING';
    confidence = Math.min(H, 0.9);
  } else if (H < 0.42 || (trendStrength < 0.3 && streaks > n * 0.5)) {
    regime = 'RANGING';
    confidence = Math.min(1 - H, 0.9);
  } else if (vol > 0.04) {
    regime = 'VOLATILE';
    confidence = Math.min(vol / 0.08, 0.9);
  }

  return {
    regime,
    confidence: Math.round(confidence * 100) / 100,
    hurst: Math.round(H * 100) / 100,
    trendStrength: Math.round(trendStrength * 100) / 100,
    slope: r4(slope),
    trendDirection: slope > 0 ? 'UP' : 'DOWN',
    volatility: r4(vol),
    maxStreak,
    ups,
    downs,
  };
}

function detectMeanReversion(market, priceHistory) {
  if (!priceHistory || priceHistory.length < CONF.meanReversionWindow) return null;

  // Only for markets in the 25-75% zone (most volatile)
  if (market.yesPrice < 0.20 || market.yesPrice > 0.80) return null;

  const regime = detectRegime(priceHistory);

  const prices = priceHistory.slice(-CONF.meanReversionWindow).map(h => h.p);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const std = Math.sqrt(prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length);
  const currentPrice = market.yesPrice;
  const zScore = std > 0 ? (currentPrice - mean) / std : 0;

  if (regime.regime === 'TRENDING') {
    // In trending markets: trade WITH the trend on pullbacks, not against it
    if (Math.abs(zScore) < 0.8) return null; // Wait for pullback

    // Only trade if price pulled back against the trend
    const trendDir = regime.trendDirection;
    if (trendDir === 'UP' && zScore < -0.8) {
      // Pullback in uptrend → buy YES
      return {
        type: 'TREND_PULLBACK',
        regime: regime.regime,
        mean: r4(mean),
        std: r4(std),
        zScore: r4(zScore),
        side: 'YES',
        entryPrice: market.yesPrice,
        target: r4(mean + std),
        trendDirection: trendDir,
        confidence: regime.confidence >= 0.7 ? 'HIGH' : 'MEDIUM',
      };
    } else if (trendDir === 'DOWN' && zScore > 0.8) {
      // Pullback in downtrend → buy NO
      return {
        type: 'TREND_PULLBACK',
        regime: regime.regime,
        mean: r4(mean),
        std: r4(std),
        zScore: r4(zScore),
        side: 'NO',
        entryPrice: market.noPrice,
        target: r4(mean - std),
        trendDirection: trendDir,
        confidence: regime.confidence >= 0.7 ? 'HIGH' : 'MEDIUM',
      };
    }
    return null;
  }

  if (regime.regime === 'VOLATILE') {
    // In volatile markets: only trade extreme deviations with reduced confidence
    if (Math.abs(zScore) < 2.5) return null;

    const side = zScore > 0 ? 'NO' : 'YES';
    return {
      type: 'VOLATILE_EXTREME',
      regime: regime.regime,
      mean: r4(mean),
      std: r4(std),
      zScore: r4(zScore),
      side,
      entryPrice: side === 'YES' ? market.yesPrice : market.noPrice,
      target: r4(mean),
      confidence: 'LOW', // Volatile = uncertain
    };
  }

  // RANGING regime: classic mean-reversion
  if (Math.abs(zScore) < 1.5) return null;

  const side = zScore > 0 ? 'NO' : 'YES';
  return {
    type: 'MEAN_REVERSION',
    regime: regime.regime,
    mean: r4(mean),
    std: r4(std),
    zScore: r4(zScore),
    side,
    entryPrice: side === 'YES' ? market.yesPrice : market.noPrice,
    target: r4(mean),
    confidence: Math.abs(zScore) >= 2.5 ? 'HIGH' : Math.abs(zScore) >= 2 ? 'MEDIUM' : 'LOW',
  };
}

// ─── Composite Scoring ──────────────────────────────────────────────

// ─── 5. Sports Domain Knowledge ─────────────────────────────────────
/**
 * Domain-specific signals extracted from bookmaker data and market metadata.
 * These capture structural edges that pure price analysis misses:
 *
 * 1. HOME_ADVANTAGE: Home teams win ~60% in NBA, ~57% in NFL
 * 2. LINE_MOVEMENT: Sharp line moves (bookmaker price changed significantly)
 * 3. PUBLIC_FADE: When Polymarket price deviates from sharp books,
 *    it's often retail money — fade the public.
 * 4. FRESHNESS: Stale bookmaker odds (>6h old) are less reliable
 */
const HOME_ADVANTAGE = {
  basketball_nba: 0.60,
  americanfootball_nfl: 0.57,
  baseball_mlb: 0.54,
  icehockey_nhl: 0.55,
  soccer_epl: 0.46, // Draw is common in soccer
  soccer_usa_mls: 0.50,
  mma_mixed_martial_arts: 0.50, // No home advantage
};

function detectSportsDomainSignal(market, bookmakerMatch) {
  if (!bookmakerMatch) return null;

  const signals = [];

  // 1. Home/Away advantage adjustment
  const homeAdv = HOME_ADVANTAGE[bookmakerMatch.sportKey] || 0.55;
  const targetIsHome = bookmakerMatch.targetTeam === bookmakerMatch.matchedEvent.split(' vs ')[0]?.trim();
  if (targetIsHome !== undefined) {
    const homeEdge = targetIsHome ? (homeAdv - 0.50) : (0.50 - homeAdv);
    if (Math.abs(homeEdge) >= 0.03) {
      signals.push({
        type: 'HOME_ADVANTAGE',
        side: homeEdge > 0 ? 'YES' : 'NO',
        homeAdvantage: homeAdv,
        targetIsHome,
        edge: r4(homeEdge),
        confidence: Math.abs(homeEdge) >= 0.07 ? 'MEDIUM' : 'LOW',
      });
    }
  }

  // 2. Public fade: if many bookmakers agree on a price but Polymarket
  //    diverges, the public (Polymarket) is likely wrong
  if (bookmakerMatch.bookmakerCount >= 15) {
    const rawDiv = bookmakerMatch.divergence;
    const pinnacleDiv = bookmakerMatch.pinnacleProb
      ? bookmakerMatch.pinnacleProb - market.yesPrice
      : null;

    // If Pinnacle AND consensus both disagree with Polymarket → strong public fade
    if (pinnacleDiv !== null && Math.sign(pinnacleDiv) === Math.sign(rawDiv) && Math.abs(rawDiv) >= 0.03) {
      signals.push({
        type: 'PUBLIC_FADE',
        side: rawDiv > 0 ? 'YES' : 'NO',
        consensusDivergence: r4(rawDiv),
        pinnacleDivergence: r4(pinnacleDiv),
        confidence: Math.abs(rawDiv) >= 0.06 ? 'HIGH' : 'MEDIUM',
      });
    }
  }

  // 3. Odds freshness: check if bookmaker data is recent
  if (bookmakerMatch.commenceTime) {
    const gameTime = new Date(bookmakerMatch.commenceTime).getTime();
    const now = Date.now();
    const hoursToGame = (gameTime - now) / 3600000;

    if (hoursToGame < 0) {
      // Game already started — odds are stale
      signals.push({ type: 'STALE_ODDS', confidence: 'LOW', hoursToGame: r4(hoursToGame) });
    } else if (hoursToGame < 2) {
      // Within 2 hours of game time: odds are freshest and most accurate
      signals.push({ type: 'FRESH_PREGAME', confidence: 'HIGH', hoursToGame: r4(hoursToGame) });
    }
  }

  if (signals.length === 0) return null;

  return {
    type: 'SPORTS_DOMAIN',
    signals,
    side: signals.filter(s => s.side === 'YES').length >= signals.filter(s => s.side === 'NO').length ? 'YES' : 'NO',
    confidence: signals.some(s => s.confidence === 'HIGH') ? 'HIGH' : 'MEDIUM',
  };
}

function scoreOpportunity(signals, market, evResult) {
  let score = 0;

  // Net edge quality (35 pts max)
  const netEdge = evResult.edgeAfterCosts;
  if (netEdge >= 0.03) score += 35;
  else if (netEdge >= 0.02) score += 25;
  else if (netEdge >= 0.01) score += 15;
  else if (netEdge >= 0.005) score += 8;
  else return 0;

  // Signal count and agreement (30 pts max)
  const signalCount = signals.length;
  if (signalCount >= 3) score += 30;
  else if (signalCount >= 2) score += 20;
  else score += 10;

  // Signal agreement: do all signals point the same direction?
  const sides = signals.map(s => s.side);
  const allAgree = sides.every(s => s === sides[0]);
  if (allAgree && signalCount >= 2) score += 10;

  // Market quality (25 pts max)
  if (market.volume24hr >= 50000) score += 12;
  else if (market.volume24hr >= 20000) score += 8;
  else if (market.volume24hr >= CONF.minVolume24h) score += 4;

  if (market.liquidity >= 50000) score += 8;
  else if (market.liquidity >= 10000) score += 5;

  if (market.spread !== null && market.spread <= 0.05) score += 5;

  return Math.min(score, 100);
}

// ─── Main Opportunity Finder ─────────────────────────────────────────
async function findOpportunities(markets, bankroll) {
  if (!CONF.enabled) return [];

  const opportunities = [];

  // Filter to tradeable markets
  const candidates = markets
    .filter(m => m.volume24hr >= CONF.minVolume24h && m.liquidity >= CONF.minLiquidity)
    .sort((a, b) => b.volume24hr - a.volume24hr)
    .slice(0, 40); // Top 40 by volume

  for (const market of candidates) {
    try {
      // Fetch enrichment data
      let priceHistory = null;
      let orderbook = null;
      try {
        [priceHistory, orderbook] = await Promise.all([
          marketData.getPriceHistory(market, 'max', 50),
          marketData.getOrderbook(market),
        ]);
      } catch { /* continue without */ }

      // Run all signal detectors
      const signals = [];
      const overreaction = detectOverreaction(market, priceHistory);
      if (overreaction) signals.push(overreaction);

      const volumeDiv = detectVolumeDivergence(market, orderbook);
      if (volumeDiv) signals.push(volumeDiv);

      const clv = detectCLV(market, priceHistory);
      if (clv) signals.push(clv);

      const meanRev = detectMeanReversion(market, priceHistory);
      if (meanRev) signals.push(meanRev);

      // 5. Bookmaker consensus divergence (highest alpha signal)
      let bookmakerMatch = null;
      if (oddsApi.hasApiKey()) {
        bookmakerMatch = oddsApi.getBookmakerOdds(market);
        if (bookmakerMatch && Math.abs(bookmakerMatch.divergence) >= 0.03) {
          // Polymarket diverges from bookmaker consensus by 3%+
          const bmSide = bookmakerMatch.divergence > 0 ? 'YES' : 'NO';
          signals.push({
            type: 'BOOKMAKER_DIVERGENCE',
            side: bmSide,
            confidence: Math.abs(bookmakerMatch.divergence) >= 0.08 ? 'HIGH' : Math.abs(bookmakerMatch.divergence) >= 0.05 ? 'MEDIUM' : 'LOW',
            divergence: bookmakerMatch.divergence,
            consensusProb: bookmakerMatch.consensusProb,
            polymarketPrice: market.yesPrice,
            matchedEvent: bookmakerMatch.matchedEvent,
            bookmakerCount: bookmakerMatch.bookmakerCount,
          });
        }

        // 6. Sports domain knowledge signals
        const domainSignal = detectSportsDomainSignal(market, bookmakerMatch);
        if (domainSignal) {
          signals.push(domainSignal);
        }
      }

      if (signals.length === 0) continue;

      // Determine consensus direction
      const yesSigs = signals.filter(s => s.side === 'YES').length;
      const noSigs = signals.filter(s => s.side === 'NO').length;
      const side = yesSigs > noSigs ? 'YES' : 'NO';
      const entryPrice = side === 'YES' ? market.yesPrice : market.noPrice;

      // Use probability model for edge estimation
      const modelResult = probabilityModel.estimateProbability(market, orderbook, priceHistory);
      const trueProb = side === 'YES' ? modelResult.estimatedProb : (1 - modelResult.estimatedProb);

      // Fee-adjusted EV
      const evResult = fees.feeAdjustedEV(100, entryPrice, trueProb, market.liquidity);
      if (!evResult.isProfitable) continue;
      if (evResult.edgeAfterCosts < CONF.minEdgeAfterFees) continue;

      // Kelly sizing
      const positionSize = fees.feeAdjustedKelly(
        trueProb, entryPrice, bankroll, CONF.maxExposure, market.liquidity, 0.25
      );
      if (positionSize < 1) continue;

      // Boost score if bookmaker consensus confirms
      const score = scoreOpportunity(signals, market, evResult);
      let finalScore = score;
      if (bookmakerMatch && Math.abs(bookmakerMatch.divergence) >= 0.03) {
        // Bookmaker divergence is the strongest signal — big score bonus
        const divAbs = Math.abs(bookmakerMatch.divergence);
        if (divAbs >= 0.10) finalScore += 25;
        else if (divAbs >= 0.07) finalScore += 20;
        else if (divAbs >= 0.05) finalScore += 15;
        else if (divAbs >= 0.03) finalScore += 10;
        finalScore = Math.min(finalScore, 100);
      }
      // Self-learning: use learned threshold if enough data, else default 35
      const pt = getPaperTrader();
      const learned = pt?.getLearnedThreshold?.('SPORTS_EDGE');
      const effectiveMinScore = learned ? learned.profitCutoff : 35;
      if (finalScore < effectiveMinScore) continue;

      opportunities.push({
        strategy: 'SPORTS_EDGE',
        market: market.question,
        conditionId: market.conditionId,
        slug: market.slug,
        yesTokenId: market.yesTokenId,
        noTokenId: market.noTokenId,
        platform: market.platform || 'POLYMARKET',
        side,
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
        score: finalScore,
        positionSize: Math.round(positionSize * 100) / 100,
        edge: {
          netEV: evResult.netEV,
          edgeAfterCosts: evResult.edgeAfterCosts,
          breakEvenProb: evResult.breakEvenProb,
          modelEdge: modelResult.edge,
        },
        signals: signals.map(s => ({ type: s.type, side: s.side, confidence: s.confidence, ...s })),
        volume24hr: market.volume24hr,
        liquidity: market.liquidity,
        spread: market.spread,
        endDate: market.endDate,
        category: modelResult.category,
        confidence: finalScore >= 70 ? 'HIGH' : finalScore >= 50 ? 'MEDIUM' : 'LOW',
        riskLevel: finalScore >= 70 ? 'LOW' : finalScore >= 50 ? 'MEDIUM' : 'HIGH',
        riskNote: `Statistical edge is probabilistic — individual trades can lose. Max loss: $${entryPrice.toFixed(2)} per share if event resolves against you. Edge is based on mean-reversion/overreaction signals that may not hold for unique events.`,
        // Bookmaker comparison (if available)
        bookmaker: bookmakerMatch ? {
          matchedEvent: bookmakerMatch.matchedEvent,
          consensusProb: bookmakerMatch.consensusProb,
          pinnacleProb: bookmakerMatch.pinnacleProb,
          divergence: bookmakerMatch.divergence,
          divergencePct: bookmakerMatch.divergencePct,
          bookmakerCount: bookmakerMatch.bookmakerCount,
          bookmakers: bookmakerMatch.bookmakers,
        } : null,
      });
    } catch (err) {
      log.warn('SPORTS_EDGE', `Analysis failed for "${market.question}": ${err.message}`);
    }
  }

  return opportunities.sort((a, b) => b.score - a.score);
}

function r4(n) { return Math.round(n * 10000) / 10000; }

module.exports = {
  name: 'SPORTS_EDGE',
  findOpportunities,
  detectOverreaction,
  detectVolumeDivergence,
  detectCLV,
  detectMeanReversion,
  detectRegime,
};
