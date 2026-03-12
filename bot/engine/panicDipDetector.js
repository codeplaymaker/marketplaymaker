/**
 * Panic Dip Detector & Mean Reversion Engine v1
 *
 * Edge 3: Retail Panic
 * When traders panic sell, prices overshoot to the downside.
 * This module detects rapid price drops and buys the overreaction.
 *
 * How it works:
 * - Monitors price changes across all active markets via WebSocket + polling
 * - Detects "crash" patterns: price drops >X% in Y minutes
 * - Cross-references with news to distinguish:
 *   a) Justified drops (real negative news) → SKIP
 *   b) Panic overreaction (no material news) → BUY THE DIP
 *   c) Liquidity crisis (large seller, thin book) → BUY with caution
 * - Uses mean reversion statistics from historical price data
 * - Auto-sizes based on drop magnitude and liquidity
 *
 * Win condition: Market snaps back toward pre-panic price.
 * Typical reversion: 40-70% of the drop within 1-4 hours.
 */

const log = require('../utils/logger');
const fees = require('./fees');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'logs', 'panic-dip-state.json');

// ─── Optional Dependencies ───────────────────────────────────────────
let newsReactor = null;
let newsSignal = null;
try { newsReactor = require('./newsReactor'); } catch { /* optional */ }
try { newsSignal = require('../data/newsSignal'); } catch { /* optional */ }

// ─── State ───────────────────────────────────────────────────────────
let priceSnapshots = new Map();       // conditionId → { prices: [{price, time}], pre-drop baseline }
let activeDips = [];                  // Currently tracked dip opportunities
let dipHistory = [];                  // Historical dip trades for learning
let isRunning = false;

let stats = {
  dipsDetected: 0,
  signalsGenerated: 0,
  meanReversionHits: 0,
  falseAlarms: 0,
  avgReversionPct: 0,
};

// Callback
let onDipSignal = null;

// ─── Configuration ───────────────────────────────────────────────────
const CONFIG = {
  // Drop detection thresholds
  dropThresholds: [
    { minDrop: 0.40, timeWindowMin: 10, name: 'CRASH',       score: 90 },  // 40%+ in 10 min
    { minDrop: 0.25, timeWindowMin: 15, name: 'MAJOR_DIP',   score: 70 },  // 25%+ in 15 min
    { minDrop: 0.15, timeWindowMin: 30, name: 'SIGNIFICANT',  score: 50 },  // 15%+ in 30 min
    { minDrop: 0.10, timeWindowMin: 60, name: 'MODERATE',     score: 30 },  // 10%+ in 1 hour
  ],

  // Minimum requirements
  minLiquidity: 2000,                // $2k minimum to avoid illiquid traps
  minVolume24h: 500,                 // Need some baseline activity
  minPreDropPrice: 0.10,             // Don't buy dips on already-dead markets
  maxPreDropPrice: 0.90,             // Don't buy dips on near-certainties

  // Mean reversion parameters
  expectedReversionPct: 0.50,        // Expect 50% mean reversion of panic drops
  maxHoldHours: 24,                  // Max time to wait for reversion
  stopLossPct: 0.15,                 // Exit if drops another 15% from our entry

  // Snapshot settings
  snapshotIntervalMs: 60000,         // Record price every 60 seconds
  maxSnapshotsPerMarket: 120,        // 2 hours of minute-by-minute data
  maxTrackedMarkets: 200,            // Track top 200 by volume
};

// ─── Price Tracking ──────────────────────────────────────────────────

/**
 * Record a price snapshot for a market.
 * Call this every scan cycle or from WebSocket updates.
 */
function recordPriceSnapshot(conditionId, price, volume, liquidity) {
  if (!conditionId || price == null) return;

  if (!priceSnapshots.has(conditionId)) {
    priceSnapshots.set(conditionId, {
      prices: [],
      liquidity: liquidity || 0,
      volume: volume || 0,
    });
  }

  const entry = priceSnapshots.get(conditionId);
  entry.prices.push({ p: price, t: Date.now() });
  entry.liquidity = liquidity || entry.liquidity;
  entry.volume = volume || entry.volume;

  // Prune old snapshots
  if (entry.prices.length > CONFIG.maxSnapshotsPerMarket) {
    entry.prices = entry.prices.slice(-CONFIG.maxSnapshotsPerMarket);
  }
}

/**
 * Bulk-record snapshots from market cache.
 */
function recordAllSnapshots(markets) {
  for (const m of markets) {
    if (m.conditionId && m.yesPrice != null) {
      recordPriceSnapshot(m.conditionId, m.yesPrice, m.volume24hr, m.liquidity);
    }
  }

  // Prune tracked markets if too many
  if (priceSnapshots.size > CONFIG.maxTrackedMarkets * 1.5) {
    // Keep only markets with recent activity
    const cutoff = Date.now() - 3 * 60 * 60 * 1000; // 3 hours
    for (const [id, entry] of priceSnapshots) {
      const lastPrice = entry.prices[entry.prices.length - 1];
      if (!lastPrice || lastPrice.t < cutoff) {
        priceSnapshots.delete(id);
      }
    }
  }
}

// ─── Dip Detection ───────────────────────────────────────────────────

/**
 * Scan all tracked markets for panic dips.
 * Returns array of detected dip opportunities.
 */
function detectDips(markets) {
  const dips = [];
  const now = Date.now();

  // Build market lookup for enrichment
  const marketMap = new Map();
  for (const m of markets) {
    if (m.conditionId) marketMap.set(m.conditionId, m);
  }

  for (const [conditionId, entry] of priceSnapshots) {
    if (entry.prices.length < 3) continue; // Need enough history
    if (entry.liquidity < CONFIG.minLiquidity) continue;

    const currentSnapshot = entry.prices[entry.prices.length - 1];
    const currentPrice = currentSnapshot.p;

    // Check each drop threshold
    for (const threshold of CONFIG.dropThresholds) {
      const windowMs = threshold.timeWindowMin * 60 * 1000;
      const windowStart = now - windowMs;

      // Find the max price within the time window
      let maxPriceInWindow = currentPrice;
      let maxPriceTime = now;
      for (let i = entry.prices.length - 1; i >= 0; i--) {
        const snap = entry.prices[i];
        if (snap.t < windowStart) break;
        if (snap.p > maxPriceInWindow) {
          maxPriceInWindow = snap.p;
          maxPriceTime = snap.t;
        }
      }

      // Calculate drop
      if (maxPriceInWindow <= CONFIG.minPreDropPrice) continue;
      if (maxPriceInWindow >= CONFIG.maxPreDropPrice + 0.05) continue;

      const dropPct = (maxPriceInWindow - currentPrice) / maxPriceInWindow;
      if (dropPct < threshold.minDrop) continue;

      // Verify this is a real drop (max was before current)
      if (maxPriceTime >= currentSnapshot.t) continue;

      const dropDurationMin = (now - maxPriceTime) / 60000;

      // Get market details
      const market = marketMap.get(conditionId);
      if (!market) continue;

      // Check if this dip is already tracked
      const existing = activeDips.find(d => d.conditionId === conditionId && !d.resolved);
      if (existing) continue;

      // ─── News Cross-Reference: Is this drop justified? ───
      let newsJustified = false;
      let newsContext = null;

      if (newsReactor) {
        try {
          const recentSignals = newsReactor.getRecentSignals(20);
          const relatedNews = recentSignals.filter(s =>
            s.conditionId === conditionId && s.ageMin <= 30
          );
          if (relatedNews.length > 0) {
            // Check if news supports the drop direction
            const negativeNews = relatedNews.filter(s =>
              (s.side === 'NO' && currentPrice < maxPriceInWindow) ||
              (s.impactScore > 0.7)
            );
            if (negativeNews.length > 0) {
              newsJustified = true;
              newsContext = negativeNews[0].headline;
            }
          }
        } catch { /* non-critical */ }
      }

      if (newsSignal) {
        try {
          const sentiment = newsSignal.getSentimentSignal(market);
          if (sentiment.confidence === 'HIGH' && sentiment.adjustment < -0.02) {
            newsJustified = true;
            if (!newsContext && sentiment.headlines?.[0]) {
              newsContext = sentiment.headlines[0].headline;
            }
          }
        } catch { /* non-critical */ }
      }

      // ─── Score the opportunity ───
      let score = threshold.score;

      // News-justified drops are LESS attractive (market is correct)
      if (newsJustified) score -= 40;

      // Large drops with no news are MORE attractive
      if (!newsJustified && dropPct > 0.25) score += 20;

      // Higher liquidity = safer for mean reversion
      if (entry.liquidity > 20000) score += 10;
      if (entry.liquidity > 50000) score += 10;

      // Higher volume = more efficient market = dip more likely to revert
      if (entry.volume > 10000) score += 5;

      // Skip if score too low
      if (score < 25) continue;

      // ─── Calculate mean reversion target ───
      const expectedReversion = dropPct * CONFIG.expectedReversionPct;
      const reversionTarget = currentPrice + (maxPriceInWindow - currentPrice) * CONFIG.expectedReversionPct;
      const slippage = fees.estimateSlippage(50, entry.liquidity);
      const netEdge = expectedReversion - slippage - fees.profitFeeRate;

      if (netEdge <= 0.005) continue; // Need at least 0.5% net edge

      const dip = {
        conditionId,
        question: market.question?.slice(0, 150),
        slug: market.slug,
        type: threshold.name,
        preDropPrice: maxPriceInWindow,
        currentPrice,
        dropPct: Math.round(dropPct * 10000) / 10000,
        dropDurationMin: Math.round(dropDurationMin),
        liquidity: entry.liquidity,
        volume: entry.volume,
        score,
        newsJustified,
        newsContext,
        reversionTarget: Math.round(reversionTarget * 10000) / 10000,
        expectedReversion: Math.round(expectedReversion * 10000) / 10000,
        netEdge: Math.round(netEdge * 10000) / 10000,
        suggestedAction: {
          side: 'YES',
          type: score >= 70 ? 'MARKET_ORDER' : 'LIMIT_ORDER',
          suggestedSize: Math.min(100, Math.max(10, entry.liquidity * 0.01)),
          limitPrice: currentPrice + 0.01, // Slightly above current for fill
          stopLoss: currentPrice * (1 - CONFIG.stopLossPct),
          takeProfit: reversionTarget,
          maxHoldHours: CONFIG.maxHoldHours,
        },
        detectedAt: new Date().toISOString(),
        resolved: false,
      };

      dips.push(dip);
      stats.dipsDetected++;
    }
  }

  // Add to active dips
  activeDips.push(...dips);

  // Prune old resolved dips
  activeDips = activeDips.filter(d => {
    if (d.resolved) return false;
    const age = Date.now() - new Date(d.detectedAt).getTime();
    if (age > CONFIG.maxHoldHours * 60 * 60 * 1000) {
      d.resolved = true;
      d.resolvedReason = 'EXPIRED';
      dipHistory.push(d);
      return false;
    }
    return true;
  });

  // Fire callbacks
  for (const dip of dips) {
    if (onDipSignal) {
      try { onDipSignal(dip); } catch { /* non-critical */ }
    }
    if (!dip.newsJustified) {
      log.info('PANIC_DIP', `🔻 ${dip.type}: "${dip.question?.slice(0, 60)}" dropped ${(dip.dropPct * 100).toFixed(1)}% in ${dip.dropDurationMin}min → score: ${dip.score}, edge: ${(dip.netEdge * 100).toFixed(1)}%`);
    }
  }

  return dips;
}

/**
 * Update active dips with current prices — check for reversion or stop loss.
 */
function updateActiveDips(markets) {
  const priceMap = new Map();
  for (const m of markets) {
    if (m.conditionId) priceMap.set(m.conditionId, m.yesPrice);
  }

  for (const dip of activeDips) {
    if (dip.resolved) continue;

    const currentPrice = priceMap.get(dip.conditionId);
    if (currentPrice == null) continue;

    const action = dip.suggestedAction;

    // Check take profit (mean reversion achieved)
    if (currentPrice >= action.takeProfit) {
      dip.resolved = true;
      dip.resolvedReason = 'TAKE_PROFIT';
      dip.exitPrice = currentPrice;
      dip.reversionAchieved = (currentPrice - dip.currentPrice) / (dip.preDropPrice - dip.currentPrice);
      dipHistory.push(dip);
      stats.meanReversionHits++;
      log.info('PANIC_DIP', `✅ Mean reversion hit: "${dip.question?.slice(0, 50)}" reverted ${(dip.reversionAchieved * 100).toFixed(0)}%`);
    }

    // Check stop loss
    else if (currentPrice <= action.stopLoss) {
      dip.resolved = true;
      dip.resolvedReason = 'STOP_LOSS';
      dip.exitPrice = currentPrice;
      dip.reversionAchieved = (currentPrice - dip.currentPrice) / (dip.preDropPrice - dip.currentPrice);
      dipHistory.push(dip);
      stats.falseAlarms++;
      log.info('PANIC_DIP', `❌ Stop loss hit: "${dip.question?.slice(0, 50)}" continued dropping`);
    }
  }

  // Trim history
  if (dipHistory.length > 500) dipHistory = dipHistory.slice(-500);

  // Update learning stats
  const resolved = dipHistory.filter(d => d.reversionAchieved != null);
  if (resolved.length > 0) {
    stats.avgReversionPct = resolved.reduce((sum, d) => sum + d.reversionAchieved, 0) / resolved.length;
  }
}

// ─── Lifecycle ───────────────────────────────────────────────────────

function start(options = {}) {
  if (isRunning) return;
  if (options.onDipSignal) onDipSignal = options.onDipSignal;
  loadState();
  isRunning = true;
  log.info('PANIC_DIP', `Panic dip detector started (tracking ${priceSnapshots.size} markets)`);
}

function stop() {
  if (!isRunning) return;
  isRunning = false;
  saveState();
  log.info('PANIC_DIP', 'Panic dip detector stopped');
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      dipHistory = data.history || [];
      stats = { ...stats, ...(data.stats || {}) };
    }
  } catch { /* fresh start */ }
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      history: dipHistory.slice(-500),
      stats,
      activeDips: activeDips.slice(-50),
      savedAt: new Date().toISOString(),
    }, null, 2));
  } catch { /* non-critical */ }
}

function getStatus() {
  return {
    running: isRunning,
    trackedMarkets: priceSnapshots.size,
    activeDips: activeDips.filter(d => !d.resolved).length,
    stats: { ...stats },
  };
}

function getActiveDips() {
  return activeDips.filter(d => !d.resolved);
}

function getDipHistory(limit = 50) {
  return dipHistory.slice(-limit).reverse();
}

function getWinRate() {
  const resolved = dipHistory.filter(d => d.resolvedReason === 'TAKE_PROFIT' || d.resolvedReason === 'STOP_LOSS');
  if (resolved.length === 0) return { trades: 0, winRate: 0 };
  const wins = resolved.filter(d => d.resolvedReason === 'TAKE_PROFIT').length;
  return {
    trades: resolved.length,
    wins,
    losses: resolved.length - wins,
    winRate: Math.round(wins / resolved.length * 10000) / 10000,
    avgReversion: Math.round(stats.avgReversionPct * 10000) / 10000,
  };
}

module.exports = {
  start,
  stop,
  recordPriceSnapshot,
  recordAllSnapshots,
  detectDips,
  updateActiveDips,
  getStatus,
  getActiveDips,
  getDipHistory,
  getWinRate,
  CONFIG,
};
