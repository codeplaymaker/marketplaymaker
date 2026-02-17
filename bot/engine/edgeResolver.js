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
  } catch { /* non-critical */ }
}

/**
 * Record a new edge for future resolution tracking.
 * Called whenever a B+ quality edge is detected.
 */
function recordEdge(edge) {
  if (!edge?.conditionId || !edge?.question) return;
  // Don't duplicate
  if (resolutions.find(r => r.conditionId === edge.conditionId && !r.resolved)) return;

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
    pnlPp: null, // Profit/loss in percentage points
  });

  pnlTracker.totalEdges++;
  save();
  log.info('RESOLVER', `Tracking edge: "${edge.question?.slice(0, 50)}" (${edge.edgeGrade}, ${edge.edgeDirection})`);
}

/**
 * Check for resolved markets and calculate P&L.
 * @param {Function} getMarketFn - Function to get current market state by conditionId
 */
async function checkResolutions(getMarketFn) {
  const pending = resolutions.filter(r => !r.resolved);
  if (pending.length === 0) return { checked: 0, resolved: 0 };

  let resolved = 0;

  for (const edge of pending) {
    try {
      const market = await getMarketFn(edge.conditionId);
      if (!market) continue;

      // Check if market has resolved
      const isResolved = market.closed || market.resolved || market.result != null;
      if (!isResolved) continue;

      // Determine outcome
      let outcome = null;
      if (market.resolution != null) {
        outcome = market.resolution; // 1 = YES, 0 = NO
      } else if (market.result === 'yes' || market.result === 'Yes') {
        outcome = 1;
      } else if (market.result === 'no' || market.result === 'No') {
        outcome = 0;
      } else if (market.yesPrice != null) {
        // If price went to 0 or 1, infer resolution
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

      resolved++;
      log.info('RESOLVER',
        `✅ Resolved: "${edge.question?.slice(0, 40)}" → ${outcome === 1 ? 'YES' : 'NO'} | ` +
        `P&L: ${pnlPp > 0 ? '+' : ''}${pnlPp.toFixed(1)}pp | ${weWereBetter ? 'We were closer ✓' : 'Market was closer ✗'}`
      );
    } catch (err) {
      // Non-critical — will retry next cycle
    }
  }

  if (resolved > 0) save();
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
 * Get pending edge for resolution check
 */
function getPending() {
  return resolutions.filter(r => !r.resolved);
}

module.exports = {
  recordEdge,
  checkResolutions,
  getTrackRecord,
  getPending,
};
