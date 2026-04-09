const fs = require('fs');
const data = JSON.parse(fs.readFileSync(__dirname + '/logs/paper-trades.json'));

// pnl is a nested object: { netPnL, grossPnL, won, returnPct, payout }
const open = (data.paperTrades || []).filter(t => !t.resolvedAt);
const resolved = data.resolvedTrades || [];
const bankroll = data.simBankroll;

const wins = resolved.filter(t => t.pnl && t.pnl.won === true);
const losses = resolved.filter(t => t.pnl && t.pnl.won === false);
const expired = resolved.filter(t => !t.pnl || t.pnl.won === null);
const totalPnl = resolved.reduce((s, t) => s + (t.pnl ? Number(t.pnl.netPnL) || 0 : 0), 0);
const decisive = wins.length + losses.length;

console.log('=== PAPER TRADER STATUS ===');
console.log('Bankroll: $' + (bankroll != null ? Number(bankroll).toFixed(2) : 'N/A') + '  (started at $50.00)');
console.log('Open positions: ' + open.length);
console.log('Resolved trades: ' + resolved.length);
console.log('  Wins:    ' + wins.length);
console.log('  Losses:  ' + losses.length);
console.log('  Expired: ' + expired.length);
if (decisive > 0) console.log('Win rate (excl. expired): ' + ((wins.length / decisive) * 100).toFixed(1) + '%');
console.log('Total Net P&L: $' + totalPnl.toFixed(2));

const byStrategy = {};
resolved.forEach(t => {
  const s = t.strategy || 'unknown';
  if (!byStrategy[s]) byStrategy[s] = { wins: 0, losses: 0, expired: 0, pnl: 0 };
  if (t.pnl && t.pnl.won === true) byStrategy[s].wins++;
  else if (t.pnl && t.pnl.won === false) byStrategy[s].losses++;
  else byStrategy[s].expired++;
  byStrategy[s].pnl += (t.pnl ? Number(t.pnl.netPnL) || 0 : 0);
});
console.log('\n=== BY STRATEGY ===');
Object.entries(byStrategy).sort((a, b) => b[1].pnl - a[1].pnl).forEach(([s, v]) => {
  const dec = v.wins + v.losses;
  const wr = dec ? ((v.wins / dec) * 100).toFixed(0) + '%' : 'N/A';
  console.log(s + ': ' + v.wins + 'W/' + v.losses + 'L/' + v.expired + 'E (' + wr + ') P&L: $' + Number(v.pnl).toFixed(2));
});

const recentDecisive = resolved.filter(t => t.pnl && t.pnl.won !== null).slice(-10);
console.log('\n=== LAST 10 DECISIVE ===');
recentDecisive.forEach(t => {
  const dt = t.resolvedAt ? new Date(t.resolvedAt).toLocaleDateString() : '?';
  const q = (t.market || t.question || t.marketId || '').slice(0, 60);
  const netPnl = Number(t.pnl.netPnL || 0).toFixed(2);
  const ret = t.pnl.returnPct != null ? ' (' + Number(t.pnl.returnPct).toFixed(1) + '%)' : '';
  console.log('[' + dt + '] ' + (t.pnl.won ? 'WIN ' : 'LOSS') + ' $' + netPnl + ret + ' | ' + (t.strategy || '?') + ' | ' + q);
});

if (open.length) {
  console.log('\n=== OPEN POSITIONS (first 10 of ' + open.length + ') ===');
  open.slice(0, 10).forEach(t => {
    const dt = t.recordedAt ? new Date(t.recordedAt).toLocaleDateString() : '?';
    const q = (t.market || t.question || t.marketId || '').slice(0, 60);
    const endDt = t.endDate ? new Date(t.endDate).toLocaleDateString() : '?';
    console.log('[' + dt + '] ' + (t.strategy || '?') + ' | score:' + (t.score || '?') + ' | closes:' + endDt + ' | ' + q);
  });
}
