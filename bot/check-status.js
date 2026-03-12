const fs = require('fs');
const pt = JSON.parse(fs.readFileSync('logs/paper-trades.json','utf8'));
const tr = JSON.parse(fs.readFileSync('logs/trade-record.json','utf8'));
const er = JSON.parse(fs.readFileSync('logs/edge-resolutions.json','utf8'));

const now = new Date();
const h24 = 24*3600*1000;

console.log('=== PAPER TRADES ===');
console.log('Active:', pt.paperTrades.length);
console.log('Resolved:', pt.resolvedTrades.length);
console.log('Bankroll: $' + pt.simBankroll);
console.log('Last saved:', pt.savedAt);

const recentPT = pt.paperTrades.filter(t => (now - new Date(t.timestamp)) < h24);
console.log('New paper trades (24h):', recentPT.length);
recentPT.slice(-5).forEach(t => 
  console.log('  ', new Date(t.timestamp).toISOString().slice(11,19), t.strategy, t.side, (t.market||'').substring(0,60))
);

const recentRes = pt.resolvedTrades.filter(t => {
  const d = t.resolvedAt || t.resolvedDate;
  return d && (now - new Date(d)) < h24;
});
console.log('Resolved (24h):', recentRes.length);
recentRes.slice(-5).forEach(t =>
  console.log('  ', t.outcome, t.pnl, (t.market||'').substring(0,60))
);

console.log('\n=== TRADE RECORD ===');
console.log('Total:', tr.length);
const recentTR = tr.filter(t => (now - new Date(t.timestamp || t.date)) < h24);
console.log('New (24h):', recentTR.length);
recentTR.slice(-5).forEach(t => 
  console.log('  ', t.strategy || '?', t.side, (t.market||'').substring(0,60))
);

console.log('\n=== EDGE RESOLUTIONS ===');
console.log('Total:', er.length);
const recentER = er.filter(e => (now - new Date(e.trackedAt || e.timestamp)) < h24);
console.log('New edges (24h):', recentER.length);

// Check scan activity from server logs
try {
  const logFile = fs.readdirSync('logs').filter(f => f.endsWith('.log')).sort().pop();
  if (logFile) {
    const lines = fs.readFileSync('logs/' + logFile, 'utf8').split('\n').filter(l => l.includes('SCANNER') || l.includes('scan'));
    const recent = lines.slice(-10);
    console.log('\n=== RECENT SCANNER LOGS ===');
    recent.forEach(l => console.log(l.substring(0,120)));
  }
} catch {}

// Check new market detector
try {
  const nms = JSON.parse(fs.readFileSync('logs/new-market-state.json','utf8'));
  console.log('\n=== NEW MARKET DETECTOR ===');
  console.log('Known markets:', (nms.knownMarkets||[]).length);
  console.log('Last check:', nms.lastCheck || nms.savedAt || 'unknown');
} catch(e) { console.log('\nNew market state: not found'); }
