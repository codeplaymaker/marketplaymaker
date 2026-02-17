const config = require('../config');
const client = require('../polymarket/client');
const log = require('../utils/logger');
const { estimateProbability } = require('../engine/probabilityModel');
const { feeAdjustedEV, feeAdjustedKelly, estimateSlippage } = require('../engine/fees');
const wsClient = require('../polymarket/websocket');

let newsSignal = null;
try { newsSignal = require('../data/newsSignal'); } catch { /* optional */ }

// Lazy-load paperTrader to avoid circular deps
let _paperTrader = null;
function getPaperTrader() {
  if (!_paperTrader) { try { _paperTrader = require('../engine/paperTrader'); } catch { _paperTrader = null; } }
  return _paperTrader;
}

/**
 * Strategy 4: ICT — Orderbook-Centric Smart Money Analysis (v3)
 *
 * UPGRADES FROM v2:
 * - SPOOF DETECTION: Identifies and filters out spoofed orders (large orders
 *   that appear and disappear rapidly to mislead other traders)
 * - THIN MARKET HANDLING: Proper minimum thresholds and confidence scaling
 *   based on orderbook depth. Prevents false positives in thin books.
 * - WEBSOCKET DATA: Uses real-time orderbook when available (via wsClient)
 *   instead of REST polling. Falls back to REST if WebSocket not connected.
 * - MULTI-SNAPSHOT VALIDATION: Compares current orderbook against recent
 *   snapshots to filter out transient orders (spoof detection).
 */

const CONF = {
  enabled: true,
  minVolume24h: config.strategies.ict.minVolume24h || 5000,
  minLiquidity: config.strategies.ict.minLiquidity || 3000,
  minHistoryPoints: 8,
  sweepThreshold: config.strategies.ict.sweepThreshold || 0.03,
  orderBlockMinSize: config.strategies.ict.orderBlockMinSize || 3000,
  maxExposure: config.strategies.ict.maxExposure || 0.03,
  minImbalanceRatio: 1.3,
  minScore: config.strategies.ict.minScore || 20,
  minEdgeAfterFees: 0.003,
  // Spoof detection parameters
  spoofMinSize: 5000,       // Orders >= $5k are spoof candidates
  spoofMaxAge: 30000,       // Orders must persist > 30s to be trusted
  thinMarketThreshold: 3000, // < $3k near price = thin market
};

// ─── Orderbook Snapshot Cache (for spoof detection) ──────────────────
const orderbookSnapshots = new Map(); // tokenId → [{ timestamp, orderbook }]
const SNAPSHOT_RETENTION_MS = 120000;  // Keep 2 minutes of snapshots
const MAX_SNAPSHOTS_PER_TOKEN = 10;

/**
 * Record an orderbook snapshot for comparison.
 * Used by spoof detection to identify transient large orders.
 */
function recordSnapshot(tokenId, orderbook) {
  if (!orderbook) return;
  const now = Date.now();

  let snapshots = orderbookSnapshots.get(tokenId) || [];

  // Clean old snapshots
  snapshots = snapshots.filter(s => now - s.timestamp < SNAPSHOT_RETENTION_MS);

  // Add new
  snapshots.push({ timestamp: now, orderbook: simplifyOrderbook(orderbook) });

  // Keep only last N
  if (snapshots.length > MAX_SNAPSHOTS_PER_TOKEN) {
    snapshots = snapshots.slice(-MAX_SNAPSHOTS_PER_TOKEN);
  }

  orderbookSnapshots.set(tokenId, snapshots);
}

/**
 * Simplify orderbook for snapshot storage (keep top 20 levels only).
 */
function simplifyOrderbook(ob) {
  return {
    bids: (ob.bids || []).slice(0, 20).map(b => ({
      price: parseFloat(b.price),
      size: parseFloat(b.size),
    })),
    asks: (ob.asks || []).slice(0, 20).map(a => ({
      price: parseFloat(a.price),
      size: parseFloat(a.size),
    })),
  };
}

// ─── Spoof Detection ─────────────────────────────────────────────────
/**
 * Detect spoofed orders: large orders that appear and disappear quickly.
 *
 * Spoofing on Polymarket:
 * - A trader places a $50k bid to make other traders think there's demand
 * - Once others start buying, the spoofer cancels and sells into the demand
 * - These orders are typically: large (>$5k), close to market price,
 *   and disappear within seconds
 *
 * Detection: Compare current orderbook against recent snapshots.
 * If a large order exists now but wasn't present in ANY prior snapshot,
 * it's likely a spoof (or at minimum, untested — not trusted).
 *
 * Returns: { isClean, suspiciousOrders, spoofScore }
 */
function detectSpoofs(tokenId, currentOrderbook) {
  const snapshots = orderbookSnapshots.get(tokenId);
  if (!snapshots || snapshots.length < 2) {
    // Not enough history — can't detect spoofs, assume clean but flag uncertainty
    return { isClean: true, suspiciousOrders: [], spoofScore: 0, hasHistory: false };
  }

  const suspicious = [];
  const now = Date.now();

  // Check large bids
  for (const bid of currentOrderbook.bids || []) {
    const size = parseFloat(bid.size);
    const price = parseFloat(bid.price);
    if (size < CONF.spoofMinSize) continue;

    // Was this order (or similar) present in older snapshots?
    let persistedIn = 0;
    for (const snap of snapshots) {
      if (now - snap.timestamp < 5000) continue; // Skip very recent
      const match = snap.orderbook.bids.find(b =>
        Math.abs(b.price - price) < 0.005 && Math.abs(b.size - size) / size < 0.2
      );
      if (match) persistedIn++;
    }

    // If the order wasn't in most prior snapshots, it's suspicious
    const olderSnapshots = snapshots.filter(s => now - s.timestamp >= 5000).length;
    if (olderSnapshots >= 2 && persistedIn < olderSnapshots * 0.3) {
      suspicious.push({
        side: 'BID',
        price,
        size: Math.round(size),
        persistedIn,
        totalSnapshots: olderSnapshots,
        confidence: persistedIn === 0 ? 'HIGH' : 'MEDIUM',
      });
    }
  }

  // Check large asks
  for (const ask of currentOrderbook.asks || []) {
    const size = parseFloat(ask.size);
    const price = parseFloat(ask.price);
    if (size < CONF.spoofMinSize) continue;

    let persistedIn = 0;
    for (const snap of snapshots) {
      if (now - snap.timestamp < 5000) continue;
      const match = snap.orderbook.asks.find(a =>
        Math.abs(a.price - price) < 0.005 && Math.abs(a.size - size) / size < 0.2
      );
      if (match) persistedIn++;
    }

    const olderSnapshots = snapshots.filter(s => now - s.timestamp >= 5000).length;
    if (olderSnapshots >= 2 && persistedIn < olderSnapshots * 0.3) {
      suspicious.push({
        side: 'ASK',
        price,
        size: Math.round(size),
        persistedIn,
        totalSnapshots: olderSnapshots,
        confidence: persistedIn === 0 ? 'HIGH' : 'MEDIUM',
      });
    }
  }

  const spoofScore = suspicious.reduce((s, o) => s + (o.confidence === 'HIGH' ? 2 : 1), 0);

  return {
    isClean: suspicious.length === 0,
    suspiciousOrders: suspicious,
    spoofScore,
    hasHistory: true,
  };
}

/**
 * Remove suspected spoofed orders from an orderbook for analysis.
 * Returns a "cleaned" orderbook that filters out untrusted large orders.
 */
function cleanOrderbook(orderbook, spoofResult) {
  if (spoofResult.isClean || !spoofResult.suspiciousOrders.length) return orderbook;

  const suspSet = new Set(
    spoofResult.suspiciousOrders.map(s => `${s.side}:${s.price}:${s.size}`)
  );

  return {
    bids: (orderbook.bids || []).filter(b => {
      const key = `BID:${parseFloat(b.price)}:${Math.round(parseFloat(b.size))}`;
      return !suspSet.has(key);
    }),
    asks: (orderbook.asks || []).filter(a => {
      const key = `ASK:${parseFloat(a.price)}:${Math.round(parseFloat(a.size))}`;
      return !suspSet.has(key);
    }),
  };
}

// ─── Thin Market Assessment ──────────────────────────────────────────
/**
 * Assess whether a market is too thin for reliable ICT signals.
 * Returns a confidence scaling factor (0-1) based on orderbook depth.
 *
 * In thin markets:
 * - Orderbook imbalance is noise (one $500 order flips the ratio)
 * - Large order blocks may just be one whale, not institutional flow
 * - Spreads are wide, fills are expensive
 */
function assessMarketDepth(orderbook, currentPrice) {
  if (!orderbook?.bids?.length || !orderbook?.asks?.length) {
    return { isThin: true, depthScore: 0, nearVolume: 0 };
  }

  const nearRange = 0.05;
  let nearBidVol = 0, nearAskVol = 0;
  let totalBidOrders = 0, totalAskOrders = 0;

  for (const bid of orderbook.bids) {
    const p = parseFloat(bid.price);
    const s = parseFloat(bid.size);
    if (Math.abs(p - currentPrice) <= nearRange) {
      nearBidVol += s;
      totalBidOrders++;
    }
  }
  for (const ask of orderbook.asks) {
    const p = parseFloat(ask.price);
    const s = parseFloat(ask.size);
    if (Math.abs(p - currentPrice) <= nearRange) {
      nearAskVol += s;
      totalAskOrders++;
    }
  }

  const nearVolume = nearBidVol + nearAskVol;
  const totalOrders = totalBidOrders + totalAskOrders;
  const isThin = nearVolume < CONF.thinMarketThreshold;

  // Depth score: 0 = paper thin, 1 = deep
  // $10k near = 0.5, $50k near = 0.9, $100k+ = 1.0
  const depthScore = Math.min(nearVolume / 50000, 1);

  // Order diversity: many small orders > few big orders (less manipulation risk)
  const avgOrderSize = totalOrders > 0 ? nearVolume / totalOrders : 0;
  const diversityScore = totalOrders > 5 ? Math.min(totalOrders / 20, 1) : totalOrders / 10;

  // Combined confidence factor
  const confidenceFactor = Math.min(
    (depthScore * 0.6 + diversityScore * 0.4),
    1
  );

  return {
    isThin,
    depthScore: Math.round(depthScore * 100) / 100,
    diversityScore: Math.round(diversityScore * 100) / 100,
    confidenceFactor: Math.round(confidenceFactor * 100) / 100,
    nearVolume: Math.round(nearVolume),
    totalOrders,
    avgOrderSize: Math.round(avgOrderSize),
  };
}

// ─── Price History Cache ─────────────────────────────────────────────
const priceHistoryCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache

async function getCachedHistory(tokenId) {
  const cached = priceHistoryCache.get(tokenId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const history = await client.getPriceHistory(tokenId, 'max', 100);
  if (history.length > 0) {
    priceHistoryCache.set(tokenId, { data: history, ts: Date.now() });
  }
  return history;
}

// ─── 1. CORE: Orderbook Imbalance Analysis (40% weight) ─────────────
/**
 * The primary signal. Measures bid/ask volume asymmetry near market price.
 * In thin prediction market books, informed traders leave visible footprints.
 *
 * Why this works: Polymarket books are thin ($50k-$500k), so a $10k resting
 * bid cluster is significant. In forex it would be invisible noise.
 */
function analyzeOrderbookImbalance(orderbook, currentPrice) {
  if (!orderbook || !orderbook.bids || !orderbook.asks) return null;

  // Analyze volume in tight range (±5%) and wide range (±15%)
  const tightRange = 0.05;
  const wideRange = 0.15;

  const analyze = (range) => {
    const lowBound = currentPrice - range;
    const highBound = currentPrice + range;
    let bidVol = 0, askVol = 0, bidCount = 0, askCount = 0;

    for (const bid of orderbook.bids) {
      const p = parseFloat(bid.price), s = parseFloat(bid.size);
      if (p >= lowBound && p <= highBound) { bidVol += s; bidCount++; }
    }
    for (const ask of orderbook.asks) {
      const p = parseFloat(ask.price), s = parseFloat(ask.size);
      if (p >= lowBound && p <= highBound) { askVol += s; askCount++; }
    }
    return { bidVol, askVol, bidCount, askCount };
  };

  const tight = analyze(tightRange);
  const wide = analyze(wideRange);

  if (tight.bidVol === 0 && tight.askVol === 0) return null;

  const tightRatio = tight.bidVol / (tight.askVol || 1);
  const wideRatio = wide.bidVol / (wide.askVol || 1);

  // Both ranges must agree on direction for signal validity
  const tightBullish = tightRatio > CONF.minImbalanceRatio;
  const tightBearish = tightRatio < (1 / CONF.minImbalanceRatio);
  const wideBullish = wideRatio > 1.2;
  const wideBearish = wideRatio < 0.83;

  let direction = null;
  let strength = 'WEAK';

  if (tightBullish && wideBullish) {
    direction = 'BULLISH';
    strength = tightRatio > 2.0 ? 'STRONG' : tightRatio > 1.6 ? 'MODERATE' : 'WEAK';
  } else if (tightBearish && wideBearish) {
    direction = 'BEARISH';
    const inv = 1 / tightRatio;
    strength = inv > 2.0 ? 'STRONG' : inv > 1.6 ? 'MODERATE' : 'WEAK';
  }

  if (!direction) return null;

  return {
    direction,
    side: direction === 'BULLISH' ? 'YES' : 'NO',
    strength,
    tightRatio: Math.round(tightRatio * 100) / 100,
    wideRatio: Math.round(wideRatio * 100) / 100,
    tightBidVol: Math.round(tight.bidVol),
    tightAskVol: Math.round(tight.askVol),
    wideBidVol: Math.round(wide.bidVol),
    wideAskVol: Math.round(wide.askVol),
  };
}

// ─── 2. Liquidity Sweep Detection (25% weight) ─────────────────────
/**
 * Detect liquidity sweeps: price pushes past a key level (grabbing stops)
 * then quickly reverses. Classic "stop hunt".
 *
 * On Polymarket: news headline causes a spike, retail panic buys,
 * price blows past recent extremes, then falls back. Fade the spike.
 *
 * ONLY signals when orderbook confirms the reversal direction.
 */
function detectLiquiditySweep(history, orderbookImbalance) {
  if (history.length < 8) return null;

  const prices = history.map(h => h.p);
  const recent5 = prices.slice(-5);
  const prior = prices.slice(-20, -5);
  if (prior.length < 5) return null;

  const currentPrice = recent5[recent5.length - 1];
  const recentMax = Math.max(...recent5);
  const recentMin = Math.min(...recent5);
  const priorMax = Math.max(...prior);
  const priorMin = Math.min(...prior);

  // Bullish sweep: price dipped below prior low then recovered above it
  if (recentMin < priorMin && currentPrice > priorMin) {
    const sweepDepth = priorMin - recentMin;
    if (sweepDepth >= CONF.sweepThreshold * 0.5) {
      // Orderbook must confirm: bids should dominate (bullish imbalance)
      const confirmed = orderbookImbalance && orderbookImbalance.direction === 'BULLISH';
      return {
        type: 'BULLISH_SWEEP',
        side: 'YES',
        level: priorMin,
        sweepLow: recentMin,
        recovery: currentPrice,
        depth: Math.round(sweepDepth * 1000) / 1000,
        orderbookConfirmed: confirmed,
        confidence: confirmed ? (sweepDepth >= CONF.sweepThreshold ? 'HIGH' : 'MEDIUM') : 'LOW',
      };
    }
  }

  // Bearish sweep: price spiked above prior high then fell back below it
  if (recentMax > priorMax && currentPrice < priorMax) {
    const sweepDepth = recentMax - priorMax;
    if (sweepDepth >= CONF.sweepThreshold * 0.5) {
      const confirmed = orderbookImbalance && orderbookImbalance.direction === 'BEARISH';
      return {
        type: 'BEARISH_SWEEP',
        side: 'NO',
        level: priorMax,
        sweepHigh: recentMax,
        recovery: currentPrice,
        depth: Math.round(sweepDepth * 1000) / 1000,
        orderbookConfirmed: confirmed,
        confidence: confirmed ? (sweepDepth >= CONF.sweepThreshold ? 'HIGH' : 'MEDIUM') : 'LOW',
      };
    }
  }

  return null;
}

// ─── 3. Institutional Order Block Detection (20% weight) ────────────
/**
 * Large clusters of resting orders at specific price levels.
 * In thin prediction market books, a $5k+ resting order is significant.
 * These act as real support/resistance.
 */
function analyzeOrderBlocks(orderbook) {
  if (!orderbook || !orderbook.bids || !orderbook.asks) return null;

  const blocks = { support: [], resistance: [] };

  for (const bid of orderbook.bids) {
    const size = parseFloat(bid.size);
    const price = parseFloat(bid.price);
    if (size >= CONF.orderBlockMinSize && price > 0.05 && price < 0.95) {
      blocks.support.push({
        price,
        size: Math.round(size),
        strength: size >= 20000 ? 'STRONG' : size >= 10000 ? 'MODERATE' : 'WEAK',
      });
    }
  }

  for (const ask of orderbook.asks) {
    const size = parseFloat(ask.size);
    const price = parseFloat(ask.price);
    if (size >= CONF.orderBlockMinSize && price > 0.05 && price < 0.95) {
      blocks.resistance.push({
        price,
        size: Math.round(size),
        strength: size >= 20000 ? 'STRONG' : size >= 10000 ? 'MODERATE' : 'WEAK',
      });
    }
  }

  blocks.support.sort((a, b) => b.size - a.size);
  blocks.resistance.sort((a, b) => b.size - a.size);

  return blocks;
}

// ─── 4. Volume-Price Divergence (15% weight) ────────────────────────
/**
 * Detect when price moves without volume support (weak, likely to reverse)
 * or volume surges without price move (accumulation/distribution).
 */
function detectVolumePriceDivergence(history, orderbook, currentPrice) {
  if (!history || history.length < 10) return null;

  const recent = history.slice(-5);
  const prior = history.slice(-10, -5);

  const recentPrices = recent.map(h => h.p);
  const priorPrices = prior.map(h => h.p);

  const recentAvg = recentPrices.reduce((s, p) => s + p, 0) / recentPrices.length;
  const priorAvg = priorPrices.reduce((s, p) => s + p, 0) / priorPrices.length;
  const priceChange = recentAvg - priorAvg;

  // Use orderbook depth as proxy for volume interest
  if (!orderbook || !orderbook.bids || !orderbook.asks) return null;

  let totalBidVol = 0, totalAskVol = 0;
  for (const bid of orderbook.bids) totalBidVol += parseFloat(bid.size);
  for (const ask of orderbook.asks) totalAskVol += parseFloat(ask.size);

  const totalVol = totalBidVol + totalAskVol;
  if (totalVol < 1000) return null; // Insufficient data

  // Price moved significantly but volume is low → weak move
  if (Math.abs(priceChange) > 0.02 && totalVol < 5000) {
    return {
      type: 'WEAK_MOVE',
      direction: priceChange > 0 ? 'UP' : 'DOWN',
      priceChange: Math.round(priceChange * 1000) / 1000,
      totalVolume: Math.round(totalVol),
      signal: priceChange > 0 ? 'BEARISH' : 'BULLISH', // Fade the weak move
      side: priceChange > 0 ? 'NO' : 'YES',
    };
  }

  // Volume high but price flat → accumulation/distribution
  if (Math.abs(priceChange) < 0.01 && totalVol > 20000) {
    const biasRatio = totalBidVol / (totalAskVol || 1);
    if (biasRatio > 1.3 || biasRatio < 0.77) {
      return {
        type: 'ACCUMULATION',
        direction: biasRatio > 1.3 ? 'BULLISH' : 'BEARISH',
        biasRatio: Math.round(biasRatio * 100) / 100,
        totalVolume: Math.round(totalVol),
        signal: biasRatio > 1.3 ? 'BULLISH' : 'BEARISH',
        side: biasRatio > 1.3 ? 'YES' : 'NO',
      };
    }
  }

  return null;
}

// ─── Composite Scoring (Weighted by signal quality) ─────────────────
/**
 * Score based on signal confluence with proper weighting.
 * Orderbook imbalance is the core signal (40%).
 * Other signals are confirmations, not standalone.
 */
function scoreICTSignals(signals) {
  let score = 0;

  // 1. Orderbook imbalance (40% — core signal)
  if (signals.imbalance) {
    if (signals.imbalance.strength === 'STRONG') score += 40;
    else if (signals.imbalance.strength === 'MODERATE') score += 30;
    else score += 15;
  }

  // 2. Liquidity sweep (25%)
  if (signals.sweep) {
    if (signals.sweep.orderbookConfirmed) {
      score += signals.sweep.confidence === 'HIGH' ? 25 : 15;
    } else {
      score += 5; // Unconfirmed sweep is barely useful
    }
  }

  // 3. Institutional order blocks (20%)
  if (signals.orderBlocks) {
    const { support, resistance } = signals.orderBlocks;
    if (support.length > 0 || resistance.length > 0) score += 10;
    if (support.some(b => b.strength === 'STRONG') || resistance.some(b => b.strength === 'STRONG')) score += 10;
  }

  // 4. Volume-Price divergence (15%)
  if (signals.volumeDivergence) {
    if (signals.volumeDivergence.type === 'ACCUMULATION') score += 15;
    else score += 10; // WEAK_MOVE
  }

  return Math.min(score, 100);
}

// ─── Main Opportunity Finder ─────────────────────────────────────────
/**
 * Run ICT analysis on high-volume markets.
 * v3: Uses WebSocket data, spoof detection, and thin market handling.
 */
async function findOpportunities(allMarkets, bankroll) {
  if (!CONF.enabled) return [];

  const opportunities = [];

  const candidates = allMarkets
    .filter(m => m.volume24hr >= CONF.minVolume24h && m.liquidity >= CONF.minLiquidity)
    .sort((a, b) => b.volume24hr - a.volume24hr)
    .slice(0, 30);

  for (const market of candidates) {
    try {
      // Fetch price history and orderbook in parallel
      // Prefer WebSocket data if available, fall back to REST
      let orderbook = null;
      let history = null;

      if (wsClient.hasFreshData(market.yesTokenId)) {
        orderbook = wsClient.getOrderbook(market.yesTokenId);
      }

      [history, orderbook] = await Promise.all([
        getCachedHistory(market.yesTokenId),
        orderbook || client.getOrderbook(market.yesTokenId).catch(() => null),
      ]);

      if (history.length < CONF.minHistoryPoints) continue;

      // ─── Record snapshot for spoof detection ───
      recordSnapshot(market.yesTokenId, orderbook);

      // ─── Spoof detection: identify and filter suspicious orders ───
      const spoofResult = detectSpoofs(market.yesTokenId, orderbook);
      const cleanedOrderbook = cleanOrderbook(orderbook, spoofResult);

      // ─── Thin market assessment ───
      const depth = assessMarketDepth(cleanedOrderbook, market.yesPrice);
      if (depth.isThin && depth.confidenceFactor < 0.2) continue; // Too thin, skip

      // ─── Run focused ICT analyses on CLEANED orderbook ───
      const imbalance = analyzeOrderbookImbalance(cleanedOrderbook, market.yesPrice);
      const sweep = detectLiquiditySweep(history, imbalance);
      const orderBlocks = analyzeOrderBlocks(cleanedOrderbook);
      const volumeDivergence = detectVolumePriceDivergence(history, cleanedOrderbook, market.yesPrice);

      const signals = { imbalance, sweep, orderBlocks, volumeDivergence };
      let score = scoreICTSignals(signals);

      // ─── Apply thin market confidence scaling ───
      score = Math.round(score * depth.confidenceFactor);

      // ─── Spoof penalty: reduce trust if spoofing detected ───
      if (!spoofResult.isClean) {
        const spoofPenalty = Math.min(spoofResult.spoofScore * 5, 25);
        score = Math.max(0, score - spoofPenalty);
      }

      // Self-learning: use learned threshold if enough data, else default
      const pt = getPaperTrader();
      const learned = pt?.getLearnedThreshold?.('ICT');
      const effectiveMinScore = learned ? learned.profitCutoff : CONF.minScore;
      if (score < effectiveMinScore) continue;

      // ─── Determine trade direction from signal consensus ───
      let bullishVotes = 0;
      let bearishVotes = 0;

      if (imbalance?.direction === 'BULLISH') bullishVotes += 3;
      if (imbalance?.direction === 'BEARISH') bearishVotes += 3;
      if (sweep?.side === 'YES') bullishVotes++;
      if (sweep?.side === 'NO') bearishVotes++;
      if (volumeDivergence?.signal === 'BULLISH') bullishVotes++;
      if (volumeDivergence?.signal === 'BEARISH') bearishVotes++;

      if (orderBlocks?.support?.length > 0) {
        const nearestSupport = orderBlocks.support[0].price;
        if (Math.abs(market.yesPrice - nearestSupport) < 0.05) bullishVotes++;
      }
      if (orderBlocks?.resistance?.length > 0) {
        const nearestResist = orderBlocks.resistance[0].price;
        if (Math.abs(market.yesPrice - nearestResist) < 0.05) bearishVotes++;
      }

      // News sentiment vote
      let newsData = null;
      let newsSignalText = null;
      if (newsSignal) {
        try {
          const ns = newsSignal.getSentimentSignal(market);
          if (ns && ns.headlineCount > 0 && Math.abs(ns.avgSentiment) > 0.5) {
            newsData = { sentiment: ns.avgSentiment, headlines: ns.headlineCount, confidence: ns.confidence };
            if (ns.avgSentiment > 0.5) bullishVotes++;
            else if (ns.avgSentiment < -0.5) bearishVotes++;
            newsSignalText = `News: ${ns.avgSentiment > 0 ? 'Bullish' : 'Bearish'} (${ns.headlineCount} headlines, avg ${ns.avgSentiment.toFixed(1)})`;
          }
        } catch { /* optional */ }
      }

      if (bullishVotes === bearishVotes) continue;

      const side = bullishVotes > bearishVotes ? 'YES' : 'NO';
      const price = side === 'YES' ? market.yesPrice : market.noPrice;

      // ─── Fee-adjusted edge verification ───
      let probEstimate = null;
      try {
        probEstimate = estimateProbability(market, cleanedOrderbook, history);
      } catch { /* skip market */ }
      if (!probEstimate) continue;

      const trueProb = side === 'YES' ? probEstimate.estimatedProb : (1 - probEstimate.estimatedProb);
      const totalLiquidity = market.liquidity || 10000;
      const maxBet = bankroll * CONF.maxExposure;
      const rawSize = Math.min(maxBet, totalLiquidity * 0.02);

      const slippage = estimateSlippage(rawSize, totalLiquidity);
      const evResult = feeAdjustedEV(rawSize, price, trueProb, totalLiquidity);

      if (!evResult.isProfitable) continue;

      const edge = trueProb - price;
      if (Math.abs(edge) < CONF.minEdgeAfterFees) continue;

      const kellySize = feeAdjustedKelly(trueProb, price, bankroll, CONF.maxExposure, totalLiquidity, 0.25);
      // Scale position size by market depth confidence
      const positionSize = Math.min(kellySize, rawSize) * depth.confidenceFactor;

      if (positionSize < 1) continue;

      // Build signal summary
      const signalSummary = [];
      if (imbalance) signalSummary.push(`OB Imbalance: ${imbalance.direction} (${imbalance.strength}, ratio ${imbalance.tightRatio})`);
      if (sweep) signalSummary.push(`Sweep: ${sweep.type} (depth: ${sweep.depth}${sweep.orderbookConfirmed ? ', OB confirmed' : ''})`);
      if (volumeDivergence) signalSummary.push(`Vol-Price: ${volumeDivergence.type} (${volumeDivergence.signal})`);
      if (orderBlocks?.support?.length) signalSummary.push(`OB Support: $${orderBlocks.support[0].size} @ ${orderBlocks.support[0].price}`);
      if (orderBlocks?.resistance?.length) signalSummary.push(`OB Resist: $${orderBlocks.resistance[0].size} @ ${orderBlocks.resistance[0].price}`);
      if (!spoofResult.isClean) signalSummary.push(`⚠ Spoof detected: ${spoofResult.suspiciousOrders.length} suspicious orders filtered`);
      if (depth.isThin) signalSummary.push(`⚠ Thin market: $${depth.nearVolume} near price (confidence: ${Math.round(depth.confidenceFactor * 100)}%)`);
      if (newsSignalText) signalSummary.push(newsSignalText);

      opportunities.push({
        strategy: 'ICT',
        market: market.question,
        conditionId: market.conditionId,
        slug: market.slug,
        yesTokenId: market.yesTokenId,
        noTokenId: market.noTokenId,
        side,
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
        price,
        score,
        positionSize: Math.round(positionSize * 100) / 100,
        volume24hr: market.volume24hr,
        liquidity: market.liquidity,
        spread: market.spread,
        endDate: market.endDate,
        confidence: score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW',
        signals: signalSummary,
        edge: Math.round(edge * 10000) / 10000,
        netEV: evResult.netEV,
        edgeAfterCosts: evResult.edgeAfterCosts,
        estimatedProb: Math.round(trueProb * 1000) / 1000,
        slippage: Math.round(slippage * 10000) / 10000,
        bullishVotes,
        bearishVotes,
        ictAnalysis: {
          imbalance,
          sweep,
          orderBlocks: orderBlocks ? {
            topSupport: orderBlocks.support.slice(0, 3),
            topResistance: orderBlocks.resistance.slice(0, 3),
          } : null,
          volumeDivergence,
          spoofDetection: {
            isClean: spoofResult.isClean,
            suspiciousOrders: spoofResult.suspiciousOrders.length,
            spoofScore: spoofResult.spoofScore,
            hasHistory: spoofResult.hasHistory,
          },
          marketDepth: depth,
        },
        riskLevel: score >= 60 && depth.confidenceFactor >= 0.5 ? 'LOW'
          : score >= 40 && depth.confidenceFactor >= 0.3 ? 'MEDIUM' : 'HIGH',
        riskNote: `Orderbook signals are statistical, not guaranteed. ${!spoofResult.isClean ? `WARNING: ${spoofResult.suspiciousOrders.length} potentially spoofed orders detected and filtered. ` : ''}${depth.isThin ? `Thin market ($${depth.nearVolume} near price) — higher slippage risk. ` : ''}Max loss: $${price.toFixed(2)} per share if ${side} resolves wrong.`,
      });
    } catch (err) {
      log.warn('ICT', `Failed to analyze ${market.question}: ${err.message}`);
      continue;
    }
  }

  return opportunities.sort((a, b) => b.score - a.score);
}

module.exports = {
  name: 'ICT',
  findOpportunities,
  analyzeOrderbookImbalance,
  detectLiquiditySweep,
  analyzeOrderBlocks,
  detectVolumePriceDivergence,
  scoreICTSignals,
  detectSpoofs,
  assessMarketDepth,
};
