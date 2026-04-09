const fs = require('fs');
const data = JSON.parse(fs.readFileSync(__dirname + '/logs/paper-trades.json'));

console.log('Top-level keys:', Object.keys(data));
console.log('paperTrades count:', (data.paperTrades||[]).length);
console.log('resolvedTrades count:', (data.resolvedTrades||[]).length);
console.log('simBankroll:', data.simBankroll);

const resolved = data.resolvedTrades || [];
if (resolved.length > 0) {
  console.log('\nSample resolved trade:');
  console.log(JSON.stringify(resolved[resolved.length - 1], null, 2));
}

const open = data.paperTrades || [];
if (open.length > 0) {
  console.log('\nSample open trade:');
  console.log(JSON.stringify(open[0], null, 2));
}
