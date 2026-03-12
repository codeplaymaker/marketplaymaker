/**
 * Cleanup script: Remove RELATIVE_VALUE paper trades from tracking data.
 * 
 * RELATIVE_VALUE went 0W/99L (-$1,604) and was permanently killed.
 * This script removes its resolved trades and recalculates the bankroll
 * to give an accurate picture of the profitable strategies.
 * 
 * Run: node cleanup-relative-value.js
 */

const fs = require('fs');
const path = require('path');

const PAPER_FILE = path.join(__dirname, 'logs/paper-trades.json');
const LEARNING_FILE = path.join(__dirname, 'logs/learning-state.json');

// ─── Clean paper-trades.json ───
console.log('=== Cleaning paper-trades.json ===');
const pt = JSON.parse(fs.readFileSync(PAPER_FILE, 'utf8'));

const activeBefore = pt.paperTrades.length;
const resolvedBefore = pt.resolvedTrades.length;

pt.paperTrades = pt.paperTrades.filter(t => t.strategy !== 'RELATIVE_VALUE');
pt.resolvedTrades = pt.resolvedTrades.filter(t => t.strategy !== 'RELATIVE_VALUE');

console.log(`  Active trades: ${activeBefore} → ${pt.paperTrades.length} (removed ${activeBefore - pt.paperTrades.length})`);
console.log(`  Resolved trades: ${resolvedBefore} → ${pt.resolvedTrades.length} (removed ${resolvedBefore - pt.resolvedTrades.length})`);

// Recalculate sim bankroll from remaining resolved trades
let bankroll = 1000; // Starting bankroll
for (const t of pt.resolvedTrades) {
  const pnl = t.pnl?.netPnL || 0;
  bankroll += pnl;
}
pt.simBankroll = Math.round(bankroll * 100) / 100;
pt.simBusted = bankroll <= 0;
pt.savedAt = new Date().toISOString();

console.log(`  Recalculated bankroll: $${pt.simBankroll}`);

// Backup then save
fs.copyFileSync(PAPER_FILE, PAPER_FILE + '.bak');
fs.writeFileSync(PAPER_FILE, JSON.stringify(pt, null, 2));
console.log('  Saved (backup at paper-trades.json.bak)');

// ─── Clean learning-state.json ───
console.log('\n=== Cleaning learning-state.json ===');
const ls = JSON.parse(fs.readFileSync(LEARNING_FILE, 'utf8'));

if (ls.strategyPerformance?.RELATIVE_VALUE) {
  console.log(`  Removing RELATIVE_VALUE from strategyPerformance:`, ls.strategyPerformance.RELATIVE_VALUE);
  delete ls.strategyPerformance.RELATIVE_VALUE;
}

if (ls.scoreThresholds?.RELATIVE_VALUE) {
  console.log(`  Removing RELATIVE_VALUE from scoreThresholds`);
  delete ls.scoreThresholds.RELATIVE_VALUE;
}

// Recalculate totalResolutions
const remainingResolutions = Object.values(ls.strategyPerformance || {}).reduce((sum, s) => sum + (s.totalTrades || 0), 0);
console.log(`  totalResolutions: ${ls.totalResolutions} → ${remainingResolutions}`);
ls.totalResolutions = remainingResolutions;
ls.savedAt = new Date().toISOString();

fs.copyFileSync(LEARNING_FILE, LEARNING_FILE + '.bak');
fs.writeFileSync(LEARNING_FILE, JSON.stringify(ls, null, 2));
console.log('  Saved (backup at learning-state.json.bak)');

console.log('\n=== Done ===');
console.log('RELATIVE_VALUE data removed. Bankroll and learning state recalculated.');
