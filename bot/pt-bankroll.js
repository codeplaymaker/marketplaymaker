const fs = require('fs');
const data = JSON.parse(fs.readFileSync(__dirname + '/logs/paper-trades.json'));

const hist = data.simBankrollHistory || [];
const resolved = data.resolvedTrades || [];

// Tally all entries (stake deductions never returned on expiry)
let totalWinPnl = 0, totalLossPnl = 0, totalEntries = 0, totalExpiredStake = 0;

resolved.forEach(t => {
  const pnl = t.pnl || {};
  if (pnl.won === true) totalWinPnl += Number(pnl.netPnL) || 0;
  else if (pnl.won === false) totalLossPnl += Number(pnl.netPnL) || 0;
  else if (pnl.won === null) totalExpiredStake += Number(t.stake) || 0;
});

// Count entries (bankroll deductions for open trades)
const open = (data.paperTrades || []).filter(t => !t.resolvedAt);
const openStakeTotal = open.reduce((s, t) => s + (Number(t.stake) || 0), 0);

console.log('=== BANKROLL RECONSTRUCTION ===');
console.log('Starting bankroll:        $50.00');
console.log('Win P&L collected:       +$' + totalWinPnl.toFixed(2));
console.log('Loss P&L:                -$' + Math.abs(totalLossPnl).toFixed(2));
console.log('Still staked (open):     -$' + openStakeTotal.toFixed(2));
console.log('Expired (stake lost?):    $' + totalExpiredStake.toFixed(2) + ' staked, $0 returned');
console.log('Current bankroll:         $' + (data.simBankroll || 0).toFixed(2));

// Walk through all entries to find big drawdowns
console.log('\n=== BIGGEST SINGLE DROPS (ENTRY deductions) ===');
const entries = hist.filter(h => h.event && h.event.startsWith('ENTRY'));
entries.sort((a, b) => {
  // find the drop amount from event string
  const ma = h => { const m = h.event.match(/-([\d.]+)/); return m ? parseFloat(m[1]) : 0; };
  return ma(b) - ma(a);
}).slice(0, 15).forEach(h => {
  const dt = new Date(h.timestamp).toLocaleDateString();
  const drop = h.event.match(/-([\d.]+)/);
  console.log('[' + dt + '] -$' + (drop ? drop[1] : '?') + ' | $' + h.bankroll.toFixed(2) + ' remaining | ' + h.event.slice(10, 70));
});

// Walk history: find where bankroll fell most
console.log('\n=== BANKROLL TIMELINE (sampled) ===');
const step = Math.max(1, Math.floor(hist.length / 20));
for (let i = 0; i < hist.length; i += step) {
  const h = hist[i];
  const dt = new Date(h.timestamp).toLocaleDateString();
  console.log('[' + dt + '] $' + h.bankroll.toFixed(2) + ' — ' + (h.event || '').slice(0, 60));
}
// Always show last
const last = hist[hist.length - 1];
console.log('[' + new Date(last.timestamp).toLocaleDateString() + '] $' + last.bankroll.toFixed(2) + ' — ' + (last.event || '').slice(0, 60));
