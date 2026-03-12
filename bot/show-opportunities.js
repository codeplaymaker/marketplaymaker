const fs = require('fs');
const path = require('path');
const logsDir = path.join(__dirname, 'logs');

// Read cached data files
const scan = JSON.parse(fs.readFileSync(path.join(logsDir, 'scan-cache.json'), 'utf8'));
const indep = JSON.parse(fs.readFileSync(path.join(logsDir, 'independent-signals.json'), 'utf8'));

// Build name map from independent signals
const sigMap = {};
(indep.signals || []).forEach(s => {
  if (s.conditionId) sigMap[s.conditionId] = s.question;
});

const results = scan.results || [];

console.log('\n' + '='.repeat(85));
console.log('  MARKETPLAYMAKER - TOP MONEY-MAKING OPPORTUNITIES');
console.log('  ' + new Date().toLocaleString());
console.log('='.repeat(85));

// Filter strong edges with good quality
const strongEdges = results
  .filter(r => Math.abs(r.divergence) > 0.08)
  .map(e => ({
    ...e,
    name: e.question || sigMap[e.conditionId] || e.conditionId?.slice(0, 30) || 'Unknown',
    edgePp: e.divergence * 100,
    quality: e.edgeQuality || 0
  }))
  .sort((a, b) => {
    // Sort by quality-weighted edge
    const scoreA = Math.abs(a.edgePp) * (a.quality || 50) / 100;
    const scoreB = Math.abs(b.edgePp) * (b.quality || 50) / 100;
    return scoreB - scoreA;
  });

console.log('\n--- HIGH-CONFIDENCE EDGES (Quality > 60) ---\n');

const highQ = strongEdges.filter(e => e.quality >= 60);
highQ.forEach((e, i) => {
  const dir = e.edgePp > 0 ? 'BUY YES' : 'BUY NO';
  const action = e.edgePp > 0 ? 'YES is UNDERPRICED' : 'NO is UNDERPRICED';
  console.log(`${i + 1}. [${dir}] Edge: ${e.edgePp > 0 ? '+' : ''}${e.edgePp.toFixed(1)}pp | Quality: ${e.quality}/100 | Grade: ${e.edgeGrade} | Sources: ${e.sourceCount}`);
  console.log(`   ${e.name.slice(0, 80)}`);
  console.log(`   Model says ${(e.prob * 100).toFixed(0)}% | Market says ${(e.marketPrice * 100).toFixed(0)}% | ${action}`);
  console.log(`   Direction: ${e.edgeDirection}`);
  console.log('');
});

if (!highQ.length) console.log('  None found\n');

console.log('--- SPECULATIVE EDGES (Lower quality but large edge) ---\n');

const specEdges = strongEdges.filter(e => e.quality < 60 && Math.abs(e.edgePp) > 10);
specEdges.forEach((e, i) => {
  const dir = e.edgePp > 0 ? 'BUY YES' : 'BUY NO';
  console.log(`${i + 1}. [${dir}] Edge: ${e.edgePp > 0 ? '+' : ''}${e.edgePp.toFixed(1)}pp | Quality: ${e.quality}/100 | Grade: ${e.edgeGrade}`);
  console.log(`   ${e.name.slice(0, 80)}`);
  console.log(`   Model: ${(e.prob * 100).toFixed(0)}% vs Market: ${(e.marketPrice * 100).toFixed(0)}%`);
  console.log('');
});

if (!specEdges.length) console.log('  None found\n');

// Paper trades performance
try {
  const papers = JSON.parse(fs.readFileSync(path.join(logsDir, 'paper-trades.json'), 'utf8'));
  const trades = Array.isArray(papers) ? papers : papers.trades || [];
  const recent = trades.slice(-10);
  if (recent.length) {
    console.log('--- RECENT PAPER TRADES (last 10) ---\n');
    let totalPnL = 0;
    recent.forEach(t => {
      const pnl = t.pnl || 0;
      totalPnL += pnl;
      const status = t.resolved ? (pnl > 0 ? 'WIN' : 'LOSS') : 'OPEN';
      console.log(`  ${status} | ${t.side || ''} ${t.outcome || ''} @ ${t.price} | Edge: ${(t.edge || 0).toFixed(1)}pp | ${(t.question || '').slice(0, 50)}`);
    });
    console.log(`\n  Paper P&L (last 10): ${totalPnL > 0 ? '+' : ''}${totalPnL.toFixed(2)}`);
  }
} catch (e) {
  console.log('  Paper trades not available');
}

// Edge resolutions performance  
try {
  const res = JSON.parse(fs.readFileSync(path.join(logsDir, 'edge-resolutions.json'), 'utf8'));
  const resolved = res.resolutions || [];
  const wins = resolved.filter(r => r.correct);
  const total = resolved.length;
  if (total > 0) {
    console.log(`\n--- EDGE ACCURACY ---`);
    console.log(`  Resolved: ${total} | Correct: ${wins.length} | Rate: ${(wins.length / total * 100).toFixed(0)}%`);
  }
} catch (e) {}

console.log('\n' + '='.repeat(85));
console.log('  ACTION ITEMS:');
console.log('  - High-quality edges (Q>60) are most reliable');
console.log('  - Larger edge + higher quality = better expected value');
console.log('  - Always check market liquidity before trading');
console.log('='.repeat(85) + '\n');
