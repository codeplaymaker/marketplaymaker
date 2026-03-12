const fs = require('fs');
const pt = JSON.parse(fs.readFileSync('logs/paper-trades.json', 'utf8'));

pt.simBankroll = 1000;
pt.simBankrollHistory = [
  ...pt.simBankrollHistory.slice(-50),
  { timestamp: new Date().toISOString(), bankroll: 1000, event: 'MANUAL RESET: bankroll restored after calibration fix + RELATIVE_VALUE disabled' }
];
pt.simBusted = false;

const activeCount = pt.paperTrades.filter(t => !t.resolved).length;
const resolvedOnly = pt.paperTrades.filter(t => t.resolved);
pt.paperTrades = resolvedOnly;

console.log('Reset bankroll to $1000');
console.log('Removed', activeCount, 'unresolved trades (placed with bad calibration)');
console.log('Kept', resolvedOnly.length, 'resolved trades for history');

fs.writeFileSync('logs/paper-trades.json', JSON.stringify(pt, null, 2));
console.log('Saved.');
