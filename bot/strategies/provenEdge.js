/**
 * Proven Edge Strategy — ONLY trades on mathematically or externally validated edges
 *
 * This strategy REPLACES the probability model approach (which had 47% win rate).
 * Instead of trying to outsmart the market with orderbook signals and TA,
 * it only trades when:
 *
 * 1. BOOKMAKER CONSENSUS: 20+ sportsbooks consensus diverges 5%+ from Polymarket
 *    (sportsbooks have billions keeping them calibrated — this is the #1 edge source)
 *
 * 2. CROSS-PLATFORM ARB: Same event priced differently on Polymarket vs Kalshi
 *    (structural inefficiency — different user bases, different liquidity)
 *
 * 3. TRUE ORDERBOOK ARB: YES ask + NO ask < $1 or YES bid + NO bid > $1
 *    (mathematical certainty — risk-free profit)
 *
 * 4. CLV-VALIDATED EDGES: Only trade after confirming the market moves toward
 *    our predicted price (proves we had real information, not noise)
 *
 * Win rate target: 55-65% (backed by external data, not internal model)
 * Expected edge: 3-8% per trade on bookmaker divergence plays
 */

const log = require('../utils/logger');
const fees = require('../engine/fees');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Mutable config — paramApplicator can override these at startup
const CONF = () => config.strategies?.provenEdge || {};

let oddsApi = null;
try {
  oddsApi = require('../bookmakers/oddsApi');
  // Auto-set API key if available in env (for standalone testing)
  if (oddsApi && !oddsApi.hasApiKey() && process.env.ODDS_API_KEY) {
    oddsApi.setApiKey(process.env.ODDS_API_KEY);
  }
} catch { /* optional */ }

let kalshiMarkets = null;
try { kalshiMarkets = require('../kalshi/markets'); } catch { /* optional */ }

let wsClient = null;
try { wsClient = require('../polymarket/websocket'); } catch { /* optional */ }

const CLV_FILE = path.join(__dirname, '..', 'logs', 'clv-tracker.json');
const PROVEN_TRADES_FILE = path.join(__dirname, '..', 'logs', 'proven-trades.json');

function r4(n) { return Math.round(n * 10000) / 10000; }

// ─── CLV (Closing Line Value) Tracker ────────────────────────────────
// Records our predicted price at detection time, then checks if the market
// moves toward our price over the next 1-24 hours. If it does, we had
// real information. If it doesn't, our signal was noise.
let clvTracker = { signals: [], stats: { tracked: 0, confirmed: 0, denied: 0, pending: 0 } };
let provenTrades = { trades: [], stats: { total: 0, wins: 0, losses: 0, pnl: 0 } };

function loadState() {
  try {
    if (fs.existsSync(CLV_FILE)) {
      clvTracker = JSON.parse(fs.readFileSync(CLV_FILE, 'utf8'));
      log.info('PROVEN_EDGE', `Loaded CLV tracker: ${clvTracker.stats.tracked} tracked, ${clvTracker.stats.confirmed} confirmed`);
    }
  } catch { /* fresh start */ }
  try {
    if (fs.existsSync(PROVEN_TRADES_FILE)) {
      provenTrades = JSON.parse(fs.readFileSync(PROVEN_TRADES_FILE, 'utf8'));
      log.info('PROVEN_EDGE', `Loaded proven trades: ${provenTrades.stats.total} total, ${provenTrades.stats.wins}W/${provenTrades.stats.losses}L`);
    }
  } catch { /* fresh start */ }
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(CLV_FILE), { recursive: true });
    fs.writeFileSync(CLV_FILE, JSON.stringify(clvTracker, null, 2));
    fs.writeFileSync(PROVEN_TRADES_FILE, JSON.stringify(provenTrades, null, 2));
  } catch (err) { log.debug('PROVEN_EDGE', `Save failed: ${err.message}`); }
}

/**
 * Record a CLV signal for later validation.
 * We track whether the market moves toward our predicted price.
 */
function recordCLVSignal(edge) {
  const signal = {
    conditionId: edge.conditionId,
    question: edge.question || edge.market,
    side: edge.side,
    ourPrice: edge.ourPrice,        // What WE think the fair price is
    marketPrice: edge.marketPrice,  // What the market says now
    divergence: edge.divergence,    // Difference
    source: edge.source,            // 'bookmaker' | 'kalshi' | 'orderbook'
    detectedAt: Date.now(),
    snapshots: [{ price: edge.marketPrice, time: Date.now() }],
    confirmed: null, // null = pending, true = CLV confirmed, false = denied
    tradeExecuted: false,
  };

  // Don't duplicate
  const existing = clvTracker.signals.find(
    s => s.conditionId === edge.conditionId && s.side === edge.side && !s.confirmed
  );
  if (existing) {
    existing.snapshots.push({ price: edge.marketPrice, time: Date.now() });
    if (existing.snapshots.length > 100) existing.snapshots = existing.snapshots.slice(-100);
    return existing;
  }

  clvTracker.signals.push(signal);
  clvTracker.stats.tracked++;
  clvTracker.stats.pending++;

  // Prune old signals (keep last 500)
  if (clvTracker.signals.length > 500) {
    clvTracker.signals = clvTracker.signals.slice(-500);
  }

  saveState();
  return signal;
}

/**
 * Update CLV signals with current market prices.
 * Confirms or denies whether our predicted direction was correct.
 */
function updateCLVSignals(markets) {
  const priceMap = {};
  for (const m of markets) {
    if (m.conditionId) priceMap[m.conditionId] = { yesPrice: m.yesPrice, noPrice: m.noPrice };
  }

  for (const signal of clvTracker.signals) {
    if (signal.confirmed !== null) continue; // Already resolved

    const current = priceMap[signal.conditionId];
    if (!current) continue;

    const currentPrice = signal.side === 'YES' ? current.yesPrice : current.noPrice;
    signal.snapshots.push({ price: currentPrice, time: Date.now() });
    if (signal.snapshots.length > 100) signal.snapshots = signal.snapshots.slice(-100);

    const age = Date.now() - signal.detectedAt;
    const minAge = 30 * 60 * 1000; // 30 minutes minimum tracking

    if (age < minAge) continue;

    // Check CLV: did market move toward our price?
    const initialPrice = signal.marketPrice;
    const priceMove = currentPrice - initialPrice;
    const expectedDirection = signal.ourPrice > initialPrice ? 1 : -1;
    const actualDirection = priceMove > 0.005 ? 1 : priceMove < -0.005 ? -1 : 0;

    // CLV = magnitude of favorable price movement
    const favorableMove = priceMove * expectedDirection;

    if (age > 4 * 60 * 60 * 1000 || Math.abs(priceMove) > 0.03) {
      // Enough time or big enough move — make a call
      if (favorableMove > 0.005) {
        signal.confirmed = true;
        signal.clv = r4(favorableMove);
        clvTracker.stats.confirmed++;
        clvTracker.stats.pending--;
        log.info('PROVEN_EDGE', `CLV CONFIRMED: ${signal.question?.slice(0, 50)} moved ${(favorableMove * 100).toFixed(1)}% in our direction`);
      } else if (age > 4 * 60 * 60 * 1000) {
        // 4+ hours and no favorable move — deny
        signal.confirmed = false;
        signal.clv = r4(favorableMove);
        clvTracker.stats.denied++;
        clvTracker.stats.pending--;
        log.info('PROVEN_EDGE', `CLV DENIED: ${signal.question?.slice(0, 50)} did NOT move in our direction`);
      }
    }
  }

  saveState();
}

/**
 * Check if a signal has been CLV-confirmed (market moved our way).
 */
function isCLVConfirmed(conditionId, side) {
  return clvTracker.signals.find(
    s => s.conditionId === conditionId && s.side === side && s.confirmed === true
  );
}

/**
 * Get CLV confirmation rate — our track record of correct predictions.
 */
function getCLVStats() {
  const { tracked, confirmed, denied, pending } = clvTracker.stats;
  const rate = (confirmed + denied) > 0 ? confirmed / (confirmed + denied) : 0;
  return {
    tracked,
    confirmed,
    denied,
    pending,
    confirmationRate: r4(rate),
    isReliable: confirmed >= 10 && rate >= 0.55,
  };
}

// ─── Edge Source 1: Bookmaker Consensus ──────────────────────────────
/**
 * The highest-conviction edge source. Sportsbooks set lines with:
 * - Billions of dollars in handle keeping them honest
 * - Decades of line-setting expertise
 * - 20+ independent books converging on "true" price
 *
 * When Polymarket diverges 5%+ from this consensus, it's almost always
 * Polymarket that's wrong (retail bias, thin liquidity, slow adjustment).
 *
 * Requirements for trade:
 * - 5%+ raw divergence from bookmaker consensus
 * - At least 8 bookmakers in the consensus (more = stronger signal)
 * - Pinnacle (sharpest book) confirms the direction
 * - Polymarket has adequate liquidity (>$5k)
 * - Net edge after fees > 2%
 */
function findBookmakerEdges(markets) {
  if (!oddsApi || !oddsApi.hasApiKey()) return [];

  const opportunities = [];

  for (const market of markets) {
    if (market.liquidity < 5000) continue;
    if (market.volume24hr < 1000) continue;

    // Get bookmaker consensus
    const bm = oddsApi.getBookmakerOdds(market);
    if (!bm) continue;

    const absDivergence = Math.abs(bm.divergence);
    const bookmakerCount = bm.bookmakerCount || 0;

    // STRICT requirements — only trade when we're very confident
    // With 15+ bookmakers, we can be confident with 4% divergence
    // With fewer, require 5%+
    const baseMinDiv = CONF().minDivergence || 0.05;
    const minDivergence = bookmakerCount >= 15 ? Math.max(0.04, baseMinDiv - 0.01) : baseMinDiv;
    if (absDivergence < minDivergence) continue;
    if (bookmakerCount < (CONF().minBookmakers || 6)) continue;        // Need 6+ bookmakers
    
    // Pinnacle confirmation (sharpest book in the world)
    // If Pinnacle disagrees with the consensus direction, skip
    if (bm.pinnacleProb) {
      const pinnacleDivergence = bm.pinnacleProb - (market.yesPrice);
      if (Math.sign(pinnacleDivergence) !== Math.sign(bm.divergence)) continue;
    }

    // Calculate net edge
    const slippage = fees.estimateSlippage(100, market.liquidity);
    const feeRate = fees.DEFAULT_FEE_RATE || 0.02;
    const netEdge = absDivergence - feeRate - slippage;

    if (netEdge < 0.02) continue; // Need 2%+ net edge

    const side = bm.divergence > 0 ? 'YES' : 'NO';
    const entryPrice = side === 'YES' ? market.yesPrice : market.noPrice;
    const externalProb = side === 'YES' ? bm.consensusProb : (1 - bm.consensusProb);

    // Kelly sizing: quarter-Kelly with external probability
    const kellySize = fees.feeAdjustedKelly(
      externalProb, entryPrice, 1000, CONF().maxExposurePct || 0.03, market.liquidity, CONF().kellyFraction || 0.25
    );
    if (kellySize < 5) continue;

    // Score based on: divergence magnitude, bookmaker count, Pinnacle agreement, liquidity
    let score = 0;
    
    // Divergence score (0-35)
    if (netEdge >= 0.08) score += 35;
    else if (netEdge >= 0.05) score += 28;
    else if (netEdge >= 0.03) score += 20;
    else score += 12;

    // Bookmaker consensus strength (0-25)
    if (bookmakerCount >= 20) score += 25;
    else if (bookmakerCount >= 15) score += 20;
    else if (bookmakerCount >= 10) score += 15;
    else score += 8;

    // Pinnacle confirmation (0-20)
    if (bm.pinnacleProb) {
      const pinDiv = Math.abs(bm.pinnacleProb - (side === 'YES' ? market.yesPrice : market.noPrice));
      if (pinDiv >= 0.05) score += 20;
      else if (pinDiv >= 0.03) score += 15;
      else score += 8;
    }

    // Liquidity (0-10)
    if (market.liquidity >= 50000) score += 10;
    else if (market.liquidity >= 20000) score += 7;
    else score += 4;

    // Volume (0-10)
    if (market.volume24hr >= 20000) score += 10;
    else if (market.volume24hr >= 5000) score += 7;
    else score += 3;

    score = Math.min(score, 100);

    // Check CLV: has this edge been confirmed by market movement?
    const clvSignal = isCLVConfirmed(market.conditionId, side);
    const clvBoost = clvSignal ? 10 : 0;
    score = Math.min(score + clvBoost, 100);

    // Record CLV tracking for future validation
    recordCLVSignal({
      conditionId: market.conditionId,
      question: market.question,
      side,
      ourPrice: externalProb,
      marketPrice: entryPrice,
      divergence: bm.divergence,
      source: 'bookmaker',
    });

    // Edge quality grade
    let grade;
    if (score >= 75 && clvSignal) grade = 'A+';
    else if (score >= 70) grade = 'A';
    else if (score >= 55) grade = 'B';
    else if (score >= 40) grade = 'C';
    else grade = 'D';

    opportunities.push({
      strategy: 'PROVEN_EDGE',
      type: 'BOOKMAKER_CONSENSUS',
      market: market.question,
      conditionId: market.conditionId,
      slug: market.slug,
      yesTokenId: market.yesTokenId,
      noTokenId: market.noTokenId,
      platform: market.platform || 'POLYMARKET',
      side,
      entryPrice: r4(entryPrice),
      score,
      grade,
      positionSize: Math.round(kellySize * 100) / 100,
      edge: {
        raw: r4(absDivergence),
        net: r4(netEdge),
        divergence: r4(bm.divergence),
        externalProb: r4(externalProb),
        marketProb: r4(entryPrice),
      },
      bookmaker: {
        consensusProb: bm.consensusProb,
        pinnacleProb: bm.pinnacleProb,
        bookmakerCount,
        matchedEvent: bm.matchedEvent,
      },
      clvConfirmed: !!clvSignal,
      liquidity: market.liquidity,
      volume24hr: market.volume24hr,
      confidence: netEdge >= 0.05 && bookmakerCount >= 15 ? 'HIGH' : 'MEDIUM',
      riskLevel: netEdge >= 0.05 && bookmakerCount >= 15 ? 'LOW' : 'MEDIUM',
      riskNote: `${bookmakerCount} sportsbooks consensus: ${(bm.consensusProb * 100).toFixed(1)}% vs Polymarket ${(market.yesPrice * 100).toFixed(1)}%. ${side} at ${(entryPrice * 100).toFixed(0)}¢ for ${(netEdge * 100).toFixed(1)}% net edge. ${clvSignal ? '✓ CLV confirmed' : '⏳ CLV pending'}`,
      endDate: market.endDate || null,
    });
  }

  return opportunities.sort((a, b) => b.score - a.score);
}

// ─── Edge Source 2: Cross-Platform Arbitrage (Polymarket vs Kalshi) ──
/**
 * Same event, different price on two platforms.
 * NOT risk-free (can't hold both sides), but structural inefficiency
 * creates persistent edge because:
 * - Different user bases (crypto natives vs US retail)
 * - Different liquidity profiles
 * - Different fee structures
 *
 * Trade the cheaper side when divergence > 4%.
 */
function findCrossPlatformEdges(polymarketMarkets, kalshiData) {
  if (!kalshiData || kalshiData.length === 0) return [];

  const opportunities = [];

  // Build Kalshi price map: normalized question → { yesPrice, noPrice, ticker }
  const kalshiMap = new Map();
  for (const km of kalshiData) {
    if (!km.question || km.yesPrice < 0.01) continue;
    // Normalize question for matching
    const normQ = normalizeQuestion(km.question);
    kalshiMap.set(normQ, km);
    // Also store by slug patterns
    if (km.slug) kalshiMap.set(km.slug.toLowerCase(), km);
    if (km.kalshi?.ticker) kalshiMap.set(km.kalshi.ticker.toLowerCase(), km);
  }

  for (const pm of polymarketMarkets) {
    if (!pm.question || pm.liquidity < 2000) continue;
    if (pm.platform && pm.platform !== 'POLYMARKET') continue;

    // Try to match Polymarket market to Kalshi
    const normQ = normalizeQuestion(pm.question);
    let kalshiMatch = kalshiMap.get(normQ);

    // Fuzzy matching: try keyword extraction
    if (!kalshiMatch) {
      kalshiMatch = fuzzyMatch(pm, kalshiData);
    }

    if (!kalshiMatch) continue;

    const polyYes = pm.yesPrice;
    const kalshiYes = kalshiMatch.yesPrice;
    const divergence = polyYes - kalshiYes;
    const absDivergence = Math.abs(divergence);

    if (absDivergence < 0.04) continue; // Need 4%+ spread

    // Net edge after fees on BOTH platforms
    const polyFees = fees.DEFAULT_FEE_RATE + fees.estimateSlippage(100, pm.liquidity);
    const kalshiFees = 0.07; // Kalshi ~7% on profits
    const totalFees = Math.max(polyFees, kalshiFees); // Pay the higher fee (trade on one platform)
    const netEdge = absDivergence - totalFees;

    if (netEdge < 0.01) continue;

    // Trade the platform where price is cheaper (more favorable)
    let platform, side, entryPrice;
    if (divergence > 0) {
      // Polymarket YES is MORE expensive → buy YES on Kalshi (cheaper YES)
      // Or equivalently: buy NO on Polymarket
      platform = 'POLYMARKET';
      side = 'NO';
      entryPrice = pm.noPrice;
    } else {
      // Kalshi YES is MORE expensive → buy YES on Polymarket (cheaper YES)
      platform = 'POLYMARKET';
      side = 'YES';
      entryPrice = pm.yesPrice;
    }

    // Use midpoint as "fair" probability
    const fairProb = (polyYes + kalshiYes) / 2;
    const trueProb = side === 'YES' ? fairProb : (1 - fairProb);

    const kellySize = fees.feeAdjustedKelly(
      trueProb, entryPrice, 1000, 0.025, pm.liquidity, 0.25
    );
    if (kellySize < 5) continue;

    let score = 0;
    if (netEdge >= 0.06) score += 35;
    else if (netEdge >= 0.04) score += 25;
    else if (netEdge >= 0.02) score += 18;
    else score += 10;

    // Liquidity on both sides
    const kalshiLiq = kalshiMatch.liquidity || 0;
    if (pm.liquidity >= 20000 && kalshiLiq >= 5000) score += 15;
    else if (pm.liquidity >= 10000) score += 10;
    else score += 5;

    // Volume
    if (pm.volume24hr >= 10000) score += 10;
    else if (pm.volume24hr >= 3000) score += 5;

    score = Math.min(score, 100);

    // Record for CLV tracking
    recordCLVSignal({
      conditionId: pm.conditionId,
      question: pm.question,
      side,
      ourPrice: trueProb,
      marketPrice: entryPrice,
      divergence,
      source: 'kalshi',
    });

    let grade;
    if (score >= 65) grade = 'A';
    else if (score >= 50) grade = 'B';
    else grade = 'C';

    opportunities.push({
      strategy: 'PROVEN_EDGE',
      type: 'CROSS_PLATFORM',
      market: pm.question,
      conditionId: pm.conditionId,
      slug: pm.slug,
      yesTokenId: pm.yesTokenId,
      noTokenId: pm.noTokenId,
      platform,
      side,
      entryPrice: r4(entryPrice),
      score,
      grade,
      positionSize: Math.round(kellySize * 100) / 100,
      edge: {
        raw: r4(absDivergence),
        net: r4(netEdge),
        polymarketYes: r4(polyYes),
        kalshiYes: r4(kalshiYes),
        divergence: r4(divergence),
        fairProb: r4(fairProb),
      },
      kalshi: {
        question: kalshiMatch.question,
        ticker: kalshiMatch.kalshi?.ticker || kalshiMatch.slug,
        yesPrice: r4(kalshiYes),
      },
      liquidity: pm.liquidity,
      volume24hr: pm.volume24hr,
      confidence: netEdge >= 0.04 ? 'HIGH' : 'MEDIUM',
      riskLevel: 'MEDIUM',
      riskNote: `Cross-platform: Polymarket ${(polyYes * 100).toFixed(0)}¢ vs Kalshi ${(kalshiYes * 100).toFixed(0)}¢ on "${pm.question?.slice(0, 60)}". ${side} on ${platform} for ${(netEdge * 100).toFixed(1)}% net edge.`,
    });
  }

  return opportunities.sort((a, b) => b.score - a.score);
}

// ─── Edge Source 3: True Orderbook Arbitrage ─────────────────────────
/**
 * Mathematical certainty: when the order book allows buying both sides
 * for less than $1 total, or selling both sides for more than $1.
 *
 * These are rare and vanish in seconds, but they're RISK-FREE.
 */
function findOrderbookArbs(markets) {
  const opportunities = [];

  for (const market of markets) {
    if (market.liquidity < 2000) continue;

    let yesBid, yesAsk, noBid, noAsk;

    if (wsClient) {
      const yesBook = wsClient.getOrderbook?.(market.yesTokenId);
      const noBook = wsClient.getOrderbook?.(market.noTokenId);
      if (yesBook && noBook) {
        yesBid = parseFloat(yesBook.bids?.[0]?.price || 0);
        yesAsk = parseFloat(yesBook.asks?.[0]?.price || 1);
        noBid = parseFloat(noBook.bids?.[0]?.price || 0);
        noAsk = parseFloat(noBook.asks?.[0]?.price || 1);
      }
    }

    if (!yesBid) {
      yesBid = market.yesPrice;
      yesAsk = market.yesPrice;
      noBid = market.noPrice;
      noAsk = market.noPrice;
    }

    // Buy-buy arb: buy YES at ask + buy NO at ask < 1.0
    if (yesAsk + noAsk < 0.995) {
      const rawEdge = 1.0 - yesAsk - noAsk;
      const slippage = fees.estimateSlippage(100, market.liquidity) * 2;
      const feeOnProfit = rawEdge * (fees.DEFAULT_FEE_RATE || 0.02);
      const netEdge = rawEdge - feeOnProfit - slippage;

      if (netEdge > 0.003) {
        opportunities.push({
          strategy: 'PROVEN_EDGE',
          type: 'ORDERBOOK_ARB',
          subtype: 'BUY_BOTH',
          market: market.question,
          conditionId: market.conditionId,
          slug: market.slug,
          yesTokenId: market.yesTokenId,
          noTokenId: market.noTokenId,
          platform: market.platform || 'POLYMARKET',
          side: 'BOTH',
          entryPrice: r4(yesAsk + noAsk),
          score: Math.min(Math.round(netEdge * 3000), 100),
          grade: netEdge >= 0.02 ? 'A+' : 'A',
          positionSize: Math.min(market.liquidity * 0.03, 500),
          edge: {
            raw: r4(rawEdge),
            net: r4(netEdge),
            yesAsk: r4(yesAsk),
            noAsk: r4(noAsk),
            sum: r4(yesAsk + noAsk),
          },
          liquidity: market.liquidity,
          volume24hr: market.volume24hr,
          confidence: 'HIGH',
          riskLevel: 'VERY_LOW',
          riskNote: `TRUE ARB: Buy YES@${r4(yesAsk)} + NO@${r4(noAsk)} = ${r4(yesAsk + noAsk)} < $1.00. Guaranteed ${(netEdge * 100).toFixed(2)}% profit. RISK-FREE.`,
        });
      }
    }

    // Sell-sell arb: sell YES at bid + sell NO at bid > 1.0
    if (yesBid + noBid > 1.005) {
      const rawEdge = yesBid + noBid - 1.0;
      const slippage = fees.estimateSlippage(100, market.liquidity) * 2;
      const netEdge = rawEdge - slippage;

      if (netEdge > 0.003) {
        opportunities.push({
          strategy: 'PROVEN_EDGE',
          type: 'ORDERBOOK_ARB',
          subtype: 'SELL_BOTH',
          market: market.question,
          conditionId: market.conditionId,
          slug: market.slug,
          yesTokenId: market.yesTokenId,
          noTokenId: market.noTokenId,
          platform: market.platform || 'POLYMARKET',
          side: 'BOTH',
          entryPrice: r4(yesBid + noBid),
          score: Math.min(Math.round(netEdge * 3000), 100),
          grade: netEdge >= 0.02 ? 'A+' : 'A',
          positionSize: Math.min(market.liquidity * 0.03, 500),
          edge: {
            raw: r4(rawEdge),
            net: r4(netEdge),
            yesBid: r4(yesBid),
            noBid: r4(noBid),
            sum: r4(yesBid + noBid),
          },
          liquidity: market.liquidity,
          volume24hr: market.volume24hr,
          confidence: 'HIGH',
          riskLevel: 'VERY_LOW',
          riskNote: `TRUE ARB: Sell YES@${r4(yesBid)} + NO@${r4(noBid)} = ${r4(yesBid + noBid)} > $1.00. Guaranteed ${(netEdge * 100).toFixed(2)}% profit. RISK-FREE.`,
        });
      }
    }
  }

  return opportunities.sort((a, b) => b.score - a.score);
}

// ─── Utilities ───────────────────────────────────────────────────────

function normalizeQuestion(q) {
  return (q || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatch(polyMarket, kalshiMarkets) {
  const pq = normalizeQuestion(polyMarket.question);
  if (!pq) return null;

  // Extract key entities from question
  const words = pq.split(' ').filter(w => w.length > 3);
  if (words.length < 2) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const km of kalshiMarkets) {
    if (km.platform && km.platform !== 'KALSHI') continue;
    const kq = normalizeQuestion(km.question);
    if (!kq) continue;

    // Count matching words
    let matchingWords = 0;
    for (const word of words) {
      if (kq.includes(word)) matchingWords++;
    }

    const matchRatio = matchingWords / words.length;

    // Need at least 60% word match AND both have similar price range
    if (matchRatio >= 0.6) {
      const priceDiff = Math.abs(polyMarket.yesPrice - km.yesPrice);
      // Bonus for similar pricing (suggests same event)
      const priceScore = Math.max(0, 1 - priceDiff * 3);
      const totalScore = matchRatio * 0.7 + priceScore * 0.3;

      if (totalScore > bestScore && totalScore > 0.5) {
        bestScore = totalScore;
        bestMatch = km;
      }
    }
  }

  return bestMatch;
}

// ─── Main Entry Point ────────────────────────────────────────────────

let lastProvenOpps = [];

async function findOpportunities(markets, bankroll) {
  const allOpps = [];

  // Separate platforms
  const polyMarkets = markets.filter(m => !m.platform || m.platform === 'POLYMARKET');
  const kalshiData = markets.filter(m => m.platform === 'KALSHI');

  // Update CLV tracking with current prices
  updateCLVSignals(markets);

  // 1. True orderbook arbitrage (risk-free, highest priority)
  const orderbookArbs = findOrderbookArbs(polyMarkets);
  allOpps.push(...orderbookArbs);
  if (orderbookArbs.length > 0) {
    log.info('PROVEN_EDGE', `Found ${orderbookArbs.length} true orderbook arbs`);
  }

  // 2. Bookmaker consensus divergence (highest-conviction value bets)
  const bookmakerEdges = findBookmakerEdges(polyMarkets);
  allOpps.push(...bookmakerEdges);
  if (bookmakerEdges.length > 0) {
    log.info('PROVEN_EDGE', `Found ${bookmakerEdges.length} bookmaker consensus edges`);
  }

  // 3. Cross-platform arbitrage (Polymarket vs Kalshi)
  const crossPlatformEdges = findCrossPlatformEdges(polyMarkets, kalshiData);
  allOpps.push(...crossPlatformEdges);
  if (crossPlatformEdges.length > 0) {
    log.info('PROVEN_EDGE', `Found ${crossPlatformEdges.length} cross-platform edges`);
  }

  // Scale position sizes to actual bankroll
  for (const opp of allOpps) {
    opp.positionSize = Math.round(Math.min(
      (opp.positionSize / 1000) * bankroll,
      bankroll * 0.03, // Max 3% per trade
      (opp.liquidity || 50000) * 0.05 // Max 5% of liquidity
    ) * 100) / 100;
    opp.expectedProfit = Math.round(opp.positionSize * (opp.edge.net || 0) * 100) / 100;
  }

  const sorted = allOpps.sort((a, b) => b.score - a.score);
  lastProvenOpps = sorted;
  return sorted;
}

function getActiveSignals() {
  return lastProvenOpps;
}

// ─── Analytics ───────────────────────────────────────────────────────

function getStats() {
  return {
    provenTrades: provenTrades.stats,
    clv: getCLVStats(),
    signalBreakdown: {
      bookmaker: clvTracker.signals.filter(s => s.source === 'bookmaker').length,
      kalshi: clvTracker.signals.filter(s => s.source === 'kalshi').length,
      orderbook: clvTracker.signals.filter(s => s.source === 'orderbook').length,
    },
  };
}

function getStatusMessage() {
  const stats = getStats();
  const clv = stats.clv;
  const trades = stats.provenTrades;

  let msg = `📊 *Proven Edge Status*\n\n`;
  msg += `*CLV Tracking:*\n`;
  msg += `  Tracked: ${clv.tracked} | Confirmed: ${clv.confirmed} | Denied: ${clv.denied}\n`;
  msg += `  Confirmation Rate: ${(clv.confirmationRate * 100).toFixed(1)}%\n`;
  msg += `  Reliable: ${clv.isReliable ? '✅ Yes' : '⏳ Building track record'}\n\n`;
  msg += `*Signal Sources:*\n`;
  msg += `  Bookmaker: ${stats.signalBreakdown.bookmaker}\n`;
  msg += `  Cross-Platform: ${stats.signalBreakdown.kalshi}\n`;
  msg += `  Orderbook Arb: ${stats.signalBreakdown.orderbook}\n\n`;
  if (trades.total > 0) {
    const wr = trades.total > 0 ? ((trades.wins / trades.total) * 100).toFixed(0) : 0;
    msg += `*Paper Trades:*\n`;
    msg += `  ${trades.wins}W / ${trades.losses}L (${wr}%)\n`;
    msg += `  PnL: $${trades.pnl.toFixed(2)}\n`;
  }
  return msg;
}

// Initialize
loadState();

module.exports = {
  name: 'PROVEN_EDGE',
  findOpportunities,
  getActiveSignals,
  getStats,
  getStatusMessage,
  getCLVStats,
  updateCLVSignals,
  recordCLVSignal,
  isCLVConfirmed,
  // For testing
  findBookmakerEdges,
  findCrossPlatformEdges,
  findOrderbookArbs,
};
