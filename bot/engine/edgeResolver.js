/**
 * Edge Resolution Tracker
 *
 * Tracks past edge signals and checks whether they resolved profitably.
 * This is what builds the track record that makes users willing to pay.
 *
 * How it works:
 * 1. When edges are detected, they're recorded with market price + our estimate
 * 2. Periodically, we check if those markets have concluded (via Polymarket API)
 * 3. We record the outcome (YES/NO) and calculate whether the edge was profitable
 * 4. Over time, this builds calibration data showing actual accuracy
 */

const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');

const RESOLUTIONS_FILE = path.join(__dirname, '../logs/edge-resolutions.json');
const PNL_FILE = path.join(__dirname, '../logs/edge-pnl.json');
const TRADE_RECORD_FILE = path.join(__dirname, '../logs/trade-record.json');

// Trade record: persistent log of every trade signal + resolution + PnL
let tradeRecord = [];
try {
  if (fs.existsSync(TRADE_RECORD_FILE)) {
    tradeRecord = JSON.parse(fs.readFileSync(TRADE_RECORD_FILE, 'utf8')).trades || [];
    log.info('RESOLVER', `Loaded ${tradeRecord.length} trade records`);
  }
} catch { /* fresh start */ }

// Load existing resolution data
let resolutions = [];
let pnlTracker = { totalEdges: 0, resolvedEdges: 0, wins: 0, losses: 0, push: 0, totalPnLpp: 0, hypotheticalROI: 0 };
try {
  if (fs.existsSync(RESOLUTIONS_FILE)) {
    resolutions = JSON.parse(fs.readFileSync(RESOLUTIONS_FILE, 'utf8')).resolutions || [];
    log.info('RESOLVER', `Loaded ${resolutions.length} edge resolutions`);
  }
} catch { /* fresh start */ }
try {
  if (fs.existsSync(PNL_FILE)) {
    pnlTracker = { ...pnlTracker, ...JSON.parse(fs.readFileSync(PNL_FILE, 'utf8')) };
    log.info('RESOLVER', `Loaded P&L tracker: ${pnlTracker.wins}W/${pnlTracker.losses}L, ${pnlTracker.totalPnLpp.toFixed(1)}pp total`);
  }
} catch { /* fresh start */ }

function save() {
  try {
    fs.writeFileSync(RESOLUTIONS_FILE, JSON.stringify({ resolutions, savedAt: new Date().toISOString() }, null, 2));
    fs.writeFileSync(PNL_FILE, JSON.stringify({ ...pnlTracker, savedAt: new Date().toISOString() }, null, 2));
    fs.writeFileSync(TRADE_RECORD_FILE, JSON.stringify({ trades: tradeRecord, savedAt: new Date().toISOString() }, null, 2));
  } catch (err) { log.debug('RESOLVER', 'Failed to save resolution data: ' + err.message); }
}

/**
 * Record a new edge for future resolution tracking.
 * Called whenever a B+ quality edge is detected.
 */
function recordEdge(edge) {
  if (!edge?.conditionId || !edge?.question) return;
  // Don't duplicate — but DO update price history for decay tracking
  const existing = resolutions.find(r => r.conditionId === edge.conditionId && !r.resolved);
  if (existing) {
    // Track edge decay: record how the market price has moved since detection
    if (!existing.priceHistory) existing.priceHistory = [];
    existing.priceHistory.push({
      marketPrice: edge.marketPrice,
      ourProb: edge.prob,
      divergence: edge.divergence,
      edgeQuality: edge.edgeQuality,
      timestamp: Date.now(),
    });
    // Keep last 50 snapshots
    if (existing.priceHistory.length > 50) existing.priceHistory = existing.priceHistory.slice(-50);
    
    // Update decay metrics
    const initialDiv = Math.abs(existing.divergence || 0);
    const currentDiv = Math.abs(edge.divergence || 0);
    existing.edgeDecay = {
      initialDivergence: initialDiv,
      currentDivergence: currentDiv,
      decayRate: initialDiv > 0 ? Math.round((1 - currentDiv / initialDiv) * 100) : 0,
      snapshots: existing.priceHistory.length,
      edgeNarrowing: currentDiv < initialDiv,
      edgeWidening: currentDiv > initialDiv * 1.1,
      lastUpdate: new Date().toISOString(),
    };
    save();
    return;
  }

  resolutions.push({
    conditionId: edge.conditionId,
    question: edge.question,
    ourProb: edge.prob,
    marketPrice: edge.marketPrice,
    divergence: edge.divergence,
    edgeDirection: edge.edgeDirection,
    edgeSignal: edge.edgeSignal,
    edgeQuality: edge.edgeQuality,
    edgeGrade: edge.edgeGrade,
    sourceCount: edge.sourceCount || edge.validatedSourceCount || 0,
    recordedAt: new Date().toISOString(),
    resolved: false,
    outcome: null,
    resolvedAt: null,
    pnlPp: null,
    priceHistory: [{
      marketPrice: edge.marketPrice,
      ourProb: edge.prob,
      divergence: edge.divergence,
      edgeQuality: edge.edgeQuality,
      timestamp: Date.now(),
    }],
    edgeDecay: null,
  });

  pnlTracker.totalEdges++;
  save();
  log.info('RESOLVER', `Tracking edge: "${edge.question?.slice(0, 50)}" (${edge.edgeGrade}, ${edge.edgeDirection})`);

  // Also add to trade record
  addTradeRecord({
    conditionId: edge.conditionId,
    question: edge.question,
    source: edge.source || 'scanner',
    strategy: edge.strategy || edge.edgeSource || 'autoScan',  // FIX: pass strategy through
    side: edge.edgeDirection === 'BUY_YES' ? 'YES' : 'NO',
    entryPrice: edge.edgeDirection === 'BUY_YES' ? edge.marketPrice : (1 - edge.marketPrice),
    ourProb: edge.prob,
    marketPrice: edge.marketPrice,
    edgePp: (edge.divergence || 0) * 100,
    edgeGrade: edge.edgeGrade,
    edgeQuality: edge.edgeQuality,
    sourceCount: edge.sourceCount || edge.validatedSourceCount || 0,
    openedAt: new Date().toISOString(),
  });
}

/**
 * Get edge decay analysis — which edges are narrowing vs widening?
 * Narrowing = market moving toward our estimate (good sign)
 * Widening = we may be wrong
 */
function getEdgeDecayAnalysis() {
  const pending = resolutions.filter(r => !r.resolved && r.edgeDecay);
  return {
    total: pending.length,
    narrowing: pending.filter(r => r.edgeDecay?.edgeNarrowing).length,
    widening: pending.filter(r => r.edgeDecay?.edgeWidening).length,
    stable: pending.filter(r => !r.edgeDecay?.edgeNarrowing && !r.edgeDecay?.edgeWidening).length,
    edges: pending.map(r => ({
      question: r.question?.slice(0, 60),
      initialDiv: r.edgeDecay?.initialDivergence,
      currentDiv: r.edgeDecay?.currentDivergence,
      decayRate: r.edgeDecay?.decayRate,
      direction: r.edgeDecay?.edgeNarrowing ? 'NARROWING' : r.edgeDecay?.edgeWidening ? 'WIDENING' : 'STABLE',
      snapshots: r.edgeDecay?.snapshots,
    })).sort((a, b) => (b.decayRate || 0) - (a.decayRate || 0)),
  };
}

/**
 * Check for resolved markets and calculate P&L.
 * @param {Function} getMarketFn - Function to get current market state by conditionId
 */
async function checkResolutions(getMarketFn) {
  const pending = resolutions.filter(r => !r.resolved);
  if (pending.length === 0) return { checked: 0, resolved: 0 };

  let resolved = 0;
  const BATCH_SIZE = 20; // Don't blast API — check 20 per cycle
  const DELAY_MS = 300;  // 300ms between API calls

  // Prioritize oldest edges first (most likely to have resolved)
  const batch = pending.sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt)).slice(0, BATCH_SIZE);

  for (const edge of batch) {
    try {
      const market = await getMarketFn(edge.conditionId);
      if (!market) continue;

      // Check if market has resolved — support both Gamma and CLOB formats
      // CLOB format: { closed, resolved, result, tokens: [{ winner: true, outcome: 'Yes' }] }
      // Gamma format: { closed, resolved, resolution, outcomePrices }
      const isResolved = market.resolved || market.result != null ||
        (market.closed && !market.acceptingOrders) ||
        (market.tokens && market.tokens.some(t => t.winner === true));
      if (!isResolved) continue;

      // Determine outcome from multiple possible formats
      let outcome = null;

      // 1. Check CLOB tokens[].winner (most reliable)
      if (market.tokens && Array.isArray(market.tokens)) {
        const winnerToken = market.tokens.find(t => t.winner === true);
        if (winnerToken) {
          outcome = winnerToken.outcome === 'Yes' ? 1 : 0;
        }
      }

      // 2. Check result field
      if (outcome == null && market.result != null) {
        if (market.result === 'yes' || market.result === 'Yes') outcome = 1;
        else if (market.result === 'no' || market.result === 'No') outcome = 0;
      }

      // 3. Check resolution field
      if (outcome == null && market.resolution != null) {
        outcome = market.resolution; // 1 = YES, 0 = NO
      }

      // 4. Infer from extreme prices
      if (outcome == null && market.yesPrice != null) {
        if (market.yesPrice >= 0.95) outcome = 1;
        else if (market.yesPrice <= 0.05) outcome = 0;
      }

      if (outcome == null) continue;

      // Calculate P&L assuming we followed the edge
      // BUY_YES: profit if outcome=1, loss if outcome=0
      // BUY_NO: profit if outcome=0, loss if outcome=1
      let pnlPp = 0;
      if (edge.edgeDirection === 'BUY_YES') {
        pnlPp = outcome === 1
          ? (1 - edge.marketPrice) * 100  // Won: payout - cost
          : -edge.marketPrice * 100;       // Lost: lost our cost
      } else if (edge.edgeDirection === 'BUY_NO') {
        pnlPp = outcome === 0
          ? (1 - (1 - edge.marketPrice)) * 100  // Won on NO side
          : -(1 - edge.marketPrice) * 100;        // Lost NO side
      }

      // Was our estimate closer to reality than the market price?
      const ourError = Math.abs(edge.ourProb - outcome);
      const marketError = Math.abs(edge.marketPrice - outcome);
      const weWereBetter = ourError < marketError;

      edge.resolved = true;
      edge.outcome = outcome;
      edge.resolvedAt = new Date().toISOString();
      edge.pnlPp = Math.round(pnlPp * 10) / 10;
      edge.weWereBetter = weWereBetter;
      edge.ourError = Math.round(ourError * 1000) / 1000;
      edge.marketError = Math.round(marketError * 1000) / 1000;

      // Update P&L tracker
      pnlTracker.resolvedEdges++;
      pnlTracker.totalPnLpp = Math.round((pnlTracker.totalPnLpp + pnlPp) * 10) / 10;
      if (pnlPp > 0) pnlTracker.wins++;
      else if (pnlPp < 0) pnlTracker.losses++;
      else pnlTracker.push++;

      if (pnlTracker.resolvedEdges > 0) {
        pnlTracker.winRate = Math.round(pnlTracker.wins / pnlTracker.resolvedEdges * 100);
        pnlTracker.avgPnLPp = Math.round(pnlTracker.totalPnLpp / pnlTracker.resolvedEdges * 10) / 10;
        pnlTracker.betterThanMarket = resolutions.filter(r => r.resolved && r.weWereBetter).length;
        pnlTracker.betterRate = Math.round(pnlTracker.betterThanMarket / pnlTracker.resolvedEdges * 100);
      }

      // Also resolve matching trade record entry
      const tradeEntry = tradeRecord.find(t => t.conditionId === edge.conditionId && !t.resolved);
      if (tradeEntry) {
        const tradePnL = pnlPp * 0.1; // $10 stake
        tradeEntry.resolved = true;
        tradeEntry.outcome = outcome === 1 ? 'YES' : 'NO';
        tradeEntry.resolvedAt = new Date().toISOString();
        tradeEntry.pnl = Math.round(tradePnL * 100) / 100;
        tradeEntry.pnlPp = Math.round(pnlPp * 10) / 10;
        tradeEntry.won = pnlPp > 0;
        tradeEntry.weWereBetter = weWereBetter;
      }

      resolved++;
      log.info('RESOLVER',
        `✅ Resolved: "${edge.question?.slice(0, 40)}" → ${outcome === 1 ? 'YES' : 'NO'} | ` +
        `P&L: ${pnlPp > 0 ? '+' : ''}${pnlPp.toFixed(1)}pp | ${weWereBetter ? 'We were closer ✓' : 'Market was closer ✗'}`
      );
    } catch (err) {
      // Non-critical — will retry next cycle
    }

    // Throttle API calls
    if (DELAY_MS > 0) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  if (resolved > 0) save();
  log.info('RESOLVER', `Resolution check: ${resolved}/${batch.length} resolved (${pending.length} total pending)`);
  return { checked: pending.length, resolved };
}

/**
 * Get the full track record for display.
 */
function getTrackRecord() {
  const resolvedEdges = resolutions.filter(r => r.resolved);
  const pendingEdges = resolutions.filter(r => !r.resolved);

  // By quality grade
  const byGrade = {};
  for (const r of resolvedEdges) {
    const g = r.edgeGrade || '?';
    if (!byGrade[g]) byGrade[g] = { total: 0, wins: 0, totalPnL: 0, betterThanMarket: 0 };
    byGrade[g].total++;
    if (r.pnlPp > 0) byGrade[g].wins++;
    byGrade[g].totalPnL += r.pnlPp || 0;
    if (r.weWereBetter) byGrade[g].betterThanMarket++;
  }

  // Recent results (last 20)
  const recent = resolvedEdges
    .sort((a, b) => new Date(b.resolvedAt) - new Date(a.resolvedAt))
    .slice(0, 20)
    .map(r => ({
      question: r.question,
      outcome: r.outcome === 1 ? 'YES' : 'NO',
      edgeDirection: r.edgeDirection,
      pnlPp: r.pnlPp,
      weWereBetter: r.weWereBetter,
      edgeGrade: r.edgeGrade,
      resolvedAt: r.resolvedAt,
    }));

  // Hypothetical P&L: if user bet $10 per edge
  const hypothetical = {
    betSize: 10,
    totalBets: resolvedEdges.length,
    totalInvested: resolvedEdges.length * 10,
    totalReturn: Math.round(resolvedEdges.reduce((sum, r) => sum + (r.pnlPp || 0) * 0.1, 0) * 100) / 100,
    roi: resolvedEdges.length > 0
      ? Math.round(resolvedEdges.reduce((sum, r) => sum + (r.pnlPp || 0) * 0.1, 0) / (resolvedEdges.length * 10) * 10000) / 100
      : 0,
  };

  return {
    summary: { ...pnlTracker, pending: pendingEdges.length, resolved: resolvedEdges.length },
    byGrade,
    recent,
    hypothetical,
    pending: pendingEdges.length,
    total: resolutions.length,
  };
}

/**
 * Add a trade to the persistent trade record.
 * This captures EVERY edge signal — scanner, YouTube, Twitter, etc.
 */
function addTradeRecord(trade) {
  // Dedup by conditionId
  if (tradeRecord.find(t => t.conditionId === trade.conditionId && !t.resolved)) return;

  tradeRecord.push({
    id: tradeRecord.length + 1,
    conditionId: trade.conditionId,
    question: trade.question,
    source: trade.source || 'scanner',  // 'scanner' | 'youtube' | 'twitter' | 'manual'
    strategy: trade.strategy || '?',     // FIX: Record strategy (was always '?' before 2026-03-11)
    side: trade.side,                    // 'YES' | 'NO'
    entryPrice: trade.entryPrice,        // price we'd buy at
    ourProb: trade.ourProb,
    marketPrice: trade.marketPrice,
    edgePp: trade.edgePp,
    edgeGrade: trade.edgeGrade || 'C',
    edgeQuality: trade.edgeQuality || 0,
    sourceCount: trade.sourceCount || 0,
    openedAt: trade.openedAt || new Date().toISOString(),
    timestamp: trade.openedAt || new Date().toISOString(),  // Consistent timestamp field
    resolved: false,
    outcome: null,
    resolvedAt: null,
    pnl: null,
    won: null,
  });
  save();
}

/**
 * Record a YouTube or Twitter edge into the trade record.
 * Called by the trending endpoints on the server.
 */
function recordTrendingEdge(edge) {
  if (!edge?.conditionId || !edge?.question) return;
  if (Math.abs(edge.edge || 0) < 0.03) return; // Skip tiny edges

  const direction = (edge.edge || 0) > 0 ? 'BUY_YES' : 'BUY_NO';
  const side = direction === 'BUY_YES' ? 'YES' : 'NO';
  const entryPrice = direction === 'BUY_YES' ? (edge.yesPrice || edge.marketPrice || 0.5) : (edge.noPrice || (1 - (edge.yesPrice || edge.marketPrice || 0.5)));

  // Also record in the main resolutions array so it gets resolved
  const existing = resolutions.find(r => r.conditionId === edge.conditionId && !r.resolved);
  if (!existing) {
    resolutions.push({
      conditionId: edge.conditionId,
      question: edge.question,
      ourProb: edge.prob || (direction === 'BUY_YES' ? entryPrice + Math.abs(edge.edge) : (1 - entryPrice) - Math.abs(edge.edge)),
      marketPrice: edge.yesPrice || edge.marketPrice || 0.5,
      divergence: edge.edge || 0,
      edgeDirection: direction,
      edgeSignal: Math.abs(edge.edge || 0) > 0.15 ? 'STRONG' : 'MODERATE',
      edgeQuality: edge.edgeQuality || (Math.abs(edge.edge || 0) > 0.3 ? 80 : 60),
      edgeGrade: edge.edgeGrade || (Math.abs(edge.edge || 0) > 0.3 ? 'A' : 'B'),
      sourceCount: 1,
      recordedAt: new Date().toISOString(),
      resolved: false,
      outcome: null,
      resolvedAt: null,
      pnlPp: null,
      source: edge.source || 'trending',
      priceHistory: [{
        marketPrice: edge.yesPrice || edge.marketPrice || 0.5,
        ourProb: edge.prob || 0.5,
        divergence: edge.edge || 0,
        timestamp: Date.now(),
      }],
      edgeDecay: null,
    });
    pnlTracker.totalEdges++;
  }

  // Add to trade record
  addTradeRecord({
    conditionId: edge.conditionId,
    question: edge.question,
    source: edge.source || 'trending',
    side,
    entryPrice,
    ourProb: edge.prob || 0.5,
    marketPrice: edge.yesPrice || edge.marketPrice || 0.5,
    edgePp: (edge.edge || 0) * 100,
    edgeGrade: edge.edgeGrade || (Math.abs(edge.edge || 0) > 0.3 ? 'A' : 'B'),
    edgeQuality: edge.edgeQuality || 60,
    sourceCount: 1,
  });

  save();
  log.info('RESOLVER', `Recorded trending edge: "${edge.question?.slice(0, 50)}" (${edge.source}, ${direction}, ${((edge.edge || 0) * 100).toFixed(1)}%)`);
}

/**
 * Build PnL chart data from resolved trades.
 * Returns time-series of cumulative PnL suitable for charting.
 */
function getPnLChart() {
  const allResolved = resolutions.filter(r => r.resolved && r.pnlPp != null);
  if (allResolved.length === 0) {
    // Build from trade record if resolutions empty
    const resolvedTrades = tradeRecord.filter(t => t.resolved && t.pnl != null);
    if (resolvedTrades.length === 0) return { series: [], summary: pnlTracker };

    resolvedTrades.sort((a, b) => new Date(a.resolvedAt) - new Date(b.resolvedAt));
    let cumPnL = 0;
    const series = resolvedTrades.map(t => {
      cumPnL += t.pnl;
      return {
        date: t.resolvedAt?.slice(0, 10),
        pnl: Math.round(t.pnl * 100) / 100,
        cumPnl: Math.round(cumPnL * 100) / 100,
        question: t.question?.slice(0, 50),
        source: t.source,
        side: t.side,
        won: t.won,
      };
    });
    return { series, summary: pnlTracker };
  }

  // Sort by resolution date
  allResolved.sort((a, b) => new Date(a.resolvedAt) - new Date(b.resolvedAt));

  let cumPnL = 0;
  const series = allResolved.map(r => {
    // Hypothetical $10 per trade
    const tradePnL = (r.pnlPp || 0) * 0.1; // pnlPp is in percentage points, $10 stake
    cumPnL += tradePnL;

    return {
      date: r.resolvedAt?.slice(0, 10),
      pnl: Math.round(tradePnL * 100) / 100,
      cumPnl: Math.round(cumPnL * 100) / 100,
      edgePp: r.pnlPp,
      question: r.question?.slice(0, 50),
      grade: r.edgeGrade,
      source: r.source || 'scanner',
      side: r.edgeDirection === 'BUY_YES' ? 'YES' : 'NO',
      outcome: r.outcome === 1 ? 'YES' : 'NO',
      won: r.pnlPp > 0,
      weWereBetter: r.weWereBetter,
    };
  });

  // Also aggregate by day
  const dailyMap = {};
  for (const pt of series) {
    if (!pt.date) continue;
    if (!dailyMap[pt.date]) dailyMap[pt.date] = { date: pt.date, dailyPnl: 0, trades: 0, wins: 0 };
    dailyMap[pt.date].dailyPnl += pt.pnl;
    dailyMap[pt.date].trades++;
    if (pt.won) dailyMap[pt.date].wins++;
  }
  const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  let dailyCum = 0;
  for (const d of daily) {
    dailyCum += d.dailyPnl;
    d.cumPnl = Math.round(dailyCum * 100) / 100;
    d.dailyPnl = Math.round(d.dailyPnl * 100) / 100;
    d.winRate = d.trades > 0 ? Math.round((d.wins / d.trades) * 100) : 0;
  }

  return {
    trades: series,
    daily,
    summary: {
      ...pnlTracker,
      totalTrades: allResolved.length,
      cumPnl: Math.round(cumPnL * 100) / 100,
      avgTradeReturn: allResolved.length > 0 ? Math.round((cumPnL / allResolved.length) * 100) / 100 : 0,
    },
  };
}

/**
 * Get the full trade history (open + closed) for the UI.
 */
function getTradeHistory({ limit = 100, status = 'all' } = {}) {
  let filtered = [...tradeRecord];
  if (status === 'open') filtered = filtered.filter(t => !t.resolved);
  if (status === 'closed') filtered = filtered.filter(t => t.resolved);
  
  filtered.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
  return {
    trades: filtered.slice(0, limit),
    total: filtered.length,
    open: tradeRecord.filter(t => !t.resolved).length,
    closed: tradeRecord.filter(t => t.resolved).length,
  };
}

/**
 * Get pending edge for resolution check
 */
function getPending() {
  return resolutions.filter(r => !r.resolved);
}

module.exports = {
  recordEdge,
  recordTrendingEdge,
  addTradeRecord,
  checkResolutions,
  getTrackRecord,
  getPending,
  getEdgeDecayAnalysis,
  getPnLChart,
  getTradeHistory,
  /** @internal Test-only: reset all in-memory state */
  _resetForTest() {
    resolutions.length = 0;
    tradeRecord.length = 0;
    Object.assign(pnlTracker, { totalEdges: 0, resolvedEdges: 0, wins: 0, losses: 0, push: 0, totalPnLpp: 0, hypotheticalROI: 0, winRate: 0, avgPnLPp: 0, betterThanMarket: 0, betterRate: 0 });
  },
};
