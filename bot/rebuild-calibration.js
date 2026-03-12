/**
 * Rebuild calibration.json from existing resolution data.
 * 
 * Sources:
 *   1. edge-resolutions.json — has market prices + outcomes (1=YES, 0=NO)
 *   2. paper-trades.json — has entry prices + outcomes ('YES'/'NO')
 *
 * Run: node rebuild-calibration.js
 */
const fs = require('fs');
const path = require('path');

const CALIBRATION_FILE = path.join(__dirname, 'logs/calibration.json');
const EDGE_FILE = path.join(__dirname, 'logs/edge-resolutions.json');
const PAPER_FILE = path.join(__dirname, 'logs/paper-trades.json');

function priceBucket(prob) {
  const b = Math.floor(prob * 40) / 40;
  return `${b.toFixed(3)}-${(b + 0.025).toFixed(3)}`;
}

// Load existing calibration to preserve signalPerformance + isotonicMap structure
let calibration = {
  buckets: {},
  totalRecorded: 0,
  signalPerformance: {},
  isotonicMap: null,
  lastTrainedAt: null,
};
try {
  const existing = JSON.parse(fs.readFileSync(CALIBRATION_FILE, 'utf8'));
  calibration.signalPerformance = existing.signalPerformance || {};
} catch {}

// Source 1: Edge resolutions (most reliable — direct market prices + verified outcomes)
try {
  const raw = JSON.parse(fs.readFileSync(EDGE_FILE, 'utf8'));
  const edges = raw.resolutions || [];
  let edgeCount = 0;
  for (const edge of edges) {
    if (!edge.resolved || edge.outcome == null) continue;
    const price = edge.marketPrice;
    if (price == null || price <= 0 || price >= 1) continue;

    const bucket = priceBucket(price);
    if (!calibration.buckets[bucket]) {
      calibration.buckets[bucket] = { total: 0, resolvedYes: 0 };
    }
    calibration.buckets[bucket].total++;
    if (edge.outcome === 1) calibration.buckets[bucket].resolvedYes++;
    calibration.totalRecorded++;
    edgeCount++;
  }
  console.log(`Edge resolutions: ${edgeCount} records processed`);
} catch (err) {
  console.log('No edge-resolutions.json:', err.message);
}

// Source 2: Paper trades (use entry price as market price proxy)
try {
  const raw = JSON.parse(fs.readFileSync(PAPER_FILE, 'utf8'));
  const trades = raw.paperTrades || raw;
  let ptCount = 0;
  const seenIds = new Set(); // Dedup by conditionId (avoid double-counting with edges)

  for (const trade of (Array.isArray(trades) ? trades : [])) {
    if (!trade.resolved || !trade.outcome) continue;
    if (seenIds.has(trade.conditionId)) continue; // One calibration point per market
    seenIds.add(trade.conditionId);

    const price = trade.rawEntryPrice || trade.entryPrice;
    if (price == null || price <= 0.01 || price >= 0.99) continue;

    // For paper trades, the "market price" was approximately the entry price
    // Adjust for side: if side=NO, use (1-price) as YES probability
    const yesProb = trade.side === 'NO' ? (1 - price) : price;
    if (yesProb <= 0.01 || yesProb >= 0.99) continue;

    const bucket = priceBucket(yesProb);
    if (!calibration.buckets[bucket]) {
      calibration.buckets[bucket] = { total: 0, resolvedYes: 0 };
    }
    calibration.buckets[bucket].total++;
    if (trade.outcome === 'YES') calibration.buckets[bucket].resolvedYes++;
    calibration.totalRecorded++;
    ptCount++;
  }
  console.log(`Paper trades: ${ptCount} records processed (deduped by conditionId)`);
} catch (err) {
  console.log('No paper-trades.json:', err.message);
}

// Summary
console.log(`\nTotal calibration records: ${calibration.totalRecorded}`);
const sortedBuckets = Object.entries(calibration.buckets)
  .sort(([a], [b]) => parseFloat(a) - parseFloat(b));
console.log('\nBucket | Total | Yes | Rate');
console.log('-------|-------|-----|------');
for (const [bucket, data] of sortedBuckets) {
  const rate = data.total > 0 ? (data.resolvedYes / data.total * 100).toFixed(1) + '%' : 'N/A';
  console.log(`${bucket.padEnd(14)} ${String(data.total).padStart(5)} ${String(data.resolvedYes).padStart(5)} ${rate.padStart(6)}`);
}

// Sanity check: high-price buckets should have high YES rates
const highBuckets = sortedBuckets.filter(([k]) => parseFloat(k) > 0.8);
const highYes = highBuckets.reduce((s, [, d]) => s + d.resolvedYes, 0);
const highTotal = highBuckets.reduce((s, [, d]) => s + d.total, 0);
console.log(`\nSanity: >0.8 buckets: ${highYes}/${highTotal} YES (${(highYes/highTotal*100).toFixed(1)}%) — should be >60%`);

// Save
fs.writeFileSync(CALIBRATION_FILE, JSON.stringify(calibration, null, 2));
console.log('\nSaved to', CALIBRATION_FILE);
