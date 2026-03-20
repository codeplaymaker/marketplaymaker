#!/usr/bin/env node
/**
 * One-time script: Seed the new pattern learning system from existing resolved trades.
 * This backfills patternPerformance and blockedPatterns so the bot starts with memory
 * of what worked (e.g., WHALE_DETECTION:NO = good, WHALE_DETECTION:YES = bad).
 */

const fs = require('fs');
const path = require('path');

const LEARNING_FILE = path.join(__dirname, 'logs/learning-state.json');
const DATA_FILE = path.join(__dirname, 'logs/paper-trades.json');

// Load existing data
const trades = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const learningState = JSON.parse(fs.readFileSync(LEARNING_FILE, 'utf8'));

const resolvedTrades = trades.resolvedTrades || [];
console.log(`Found ${resolvedTrades.length} resolved trades to seed from\n`);

// Initialize new fields
if (!learningState.patternPerformance) learningState.patternPerformance = {};
if (!learningState.blockedPatterns) learningState.blockedPatterns = {};

// Process each resolved trade
for (const trade of resolvedTrades) {
  if (!trade.pnl) continue;
  
  const strat = trade.strategy || 'UNKNOWN';
  const side = trade.side || 'YES';
  const patternKey = `${strat}:${side}`;
  const won = trade.pnl.won;
  const netPnL = trade.pnl.netPnL || 0;

  if (!learningState.patternPerformance[patternKey]) {
    learningState.patternPerformance[patternKey] = {
      wins: 0, losses: 0, totalPnL: 0, totalTrades: 0,
      streak: 0,
      recentResults: [],
    };
  }

  const pp = learningState.patternPerformance[patternKey];
  pp.totalTrades++;
  if (won) { pp.wins++; pp.streak = pp.streak >= 0 ? pp.streak + 1 : 1; }
  else     { pp.losses++; pp.streak = pp.streak <= 0 ? pp.streak - 1 : -1; }
  pp.totalPnL += netPnL;
  pp.recentResults.push({ won, pnl: netPnL, ts: Date.now() });
  if (pp.recentResults.length > 10) pp.recentResults.shift();
}

// Evaluate patterns for blocking
console.log('Pattern Performance:');
console.log('─'.repeat(70));
for (const [key, pp] of Object.entries(learningState.patternPerformance)) {
  const winRate = pp.totalTrades > 0 ? (pp.wins / pp.totalTrades * 100).toFixed(0) : 0;
  const avgPnL = pp.totalTrades > 0 ? (pp.totalPnL / pp.totalTrades).toFixed(2) : 0;
  const status = pp.totalPnL > 0 ? '✅ PROFITABLE' : '❌ UNPROFITABLE';
  
  console.log(`  ${key}: ${status} | ${pp.wins}W/${pp.losses}L (${winRate}%) | P&L: $${pp.totalPnL.toFixed(2)} | Avg: $${avgPnL} | Streak: ${pp.streak}`);

  // Auto-block losing patterns
  let shouldBlock = false;
  let reason = '';

  if (pp.streak <= -3) {
    shouldBlock = true;
    reason = `${Math.abs(pp.streak)} consecutive losses`;
  } else if (pp.totalTrades >= 3 && pp.wins / pp.totalTrades < 0.25) {
    shouldBlock = true;
    reason = `Win rate ${winRate}% after ${pp.totalTrades} trades`;
  } else if (pp.totalTrades >= 5 && pp.totalPnL / pp.totalTrades < -0.1) {
    shouldBlock = true;
    reason = `Avg PnL $${avgPnL} after ${pp.totalTrades} trades`;
  }

  if (shouldBlock) {
    learningState.blockedPatterns[key] = {
      reason,
      blockedAt: new Date().toISOString(),
      blockedAtResolution: learningState.totalResolutions,
      winRate: parseFloat(winRate),
      trades: pp.totalTrades,
      totalPnL: parseFloat(pp.totalPnL.toFixed(2)),
      cooldownUntil: learningState.totalResolutions + 15,
    };
    console.log(`  🚫 BLOCKED: ${key} — ${reason}`);
  }
}

console.log('\n─'.repeat(70));
console.log(`Blocked patterns: ${Object.keys(learningState.blockedPatterns).length}`);
for (const [key, block] of Object.entries(learningState.blockedPatterns)) {
  console.log(`  🚫 ${key}: ${block.reason} (P&L: $${block.totalPnL})`);
}

// Save
fs.writeFileSync(LEARNING_FILE, JSON.stringify({
  ...learningState,
  savedAt: new Date().toISOString(),
}, null, 2));

console.log('\n✅ Learning state seeded and saved!');
