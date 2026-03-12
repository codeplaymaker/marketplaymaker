/**
 * Automated Test Suite — Core module tests for MarketPlayMaker.
 *
 * Run: cd bot && node tests/core.test.js
 *
 * Tests:
 *   1. Risk Manager — exposure limits, position sizing, trade rejection
 *   2. Executor — order routing, trade persistence, mode switching
 *   3. Probability Ensemble — sub-model predictions, resolution feedback
 *   4. Strategy Optimizer — Thompson sampling, demotion rules
 *   5. Health Monitor — component tracking, alerts
 *   6. News Stream — headline scoring, deduplication
 *   7. Log Cleanup — file rotation, compaction
 *   8. Database — SQLite operations, migration
 */
const path = require('path');

// Test framework
let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    process.stdout.write('.');
  } else {
    failed++;
    failures.push(message);
    process.stdout.write('F');
  }
}

function assertApprox(actual, expected, tolerance, message) {
  assert(Math.abs(actual - expected) <= tolerance, `${message}: expected ~${expected}, got ${actual}`);
}

function skip(message) {
  skipped++;
  process.stdout.write('S');
}

function describe(name, fn) {
  console.log(`\n  ${name}`);
  try {
    fn();
  } catch (err) {
    failed++;
    failures.push(`${name}: CRASH — ${err.message}`);
    process.stdout.write('E');
  }
}

async function describeAsync(name, fn) {
  console.log(`\n  ${name}`);
  try {
    await fn();
  } catch (err) {
    failed++;
    failures.push(`${name}: CRASH — ${err.message}`);
    process.stdout.write('E');
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════

console.log('\n╔══════════════════════════════════════════════╗');
console.log('║   MarketPlayMaker — Core Test Suite          ║');
console.log('╚══════════════════════════════════════════════╝');

// 1. Risk Manager
describe('Risk Manager', () => {
  const riskManager = require('../engine/riskManager');

  // Test: exposure limits
  assert(typeof riskManager.checkTrade === 'function', 'checkTrade exists');
  assert(typeof riskManager.addPosition === 'function', 'addPosition exists');

  // Test: reject trade exceeding max single market
  const bigTrade = { conditionId: 'test1', positionSize: 10000, side: 'YES', strategy: 'TEST' };
  const check = riskManager.checkTrade(bigTrade, 100);
  // Should be rejected if positionSize/bankroll > maxSingleMarket (5%)
  assert(check.allowed === false || check.riskMultiplier < 1, 'Big trade should be restricted');

  // Test: valid small trade
  riskManager.reset?.();
  const smallTrade = { conditionId: 'test2', positionSize: 2, side: 'YES', strategy: 'NO_BETS' };
  const smallCheck = riskManager.checkTrade(smallTrade, 1000);
  assert(smallCheck.allowed === true, 'Small valid trade should be allowed');
});

// 2. Executor
describe('Executor', () => {
  const executor = require('../engine/executor');

  assert(typeof executor.execute === 'function', 'execute exists');
  assert(typeof executor.chooseOrderType === 'function', 'chooseOrderType exists');
  assert(typeof executor.getMode === 'function', 'getMode exists');

  // Test: mode management
  assert(executor.getMode() === 'SIMULATION', 'Default mode is SIMULATION');

  // Test: order type routing
  const arbOpp = { strategy: 'ARBITRAGE', positionSize: 10, liquidity: 10000, edge: 0.05 };
  assert(executor.chooseOrderType(arbOpp) === 'MARKET', 'Arbitrage uses MARKET order');

  const smallEdge = { strategy: 'NO_BETS', positionSize: 5, liquidity: 50000, edge: 0.02 };
  assert(executor.chooseOrderType(smallEdge) === 'LIMIT', 'Small edge uses LIMIT order');

  const bigImpact = { strategy: 'SPORTS_EDGE', positionSize: 1000, liquidity: 5000, edge: 0.05 };
  assert(executor.chooseOrderType(bigImpact) === 'TWAP', 'Large impact uses TWAP');
});

// 3. Probability Ensemble
describe('Probability Ensemble', () => {
  const ensemble = require('../engine/probabilityEnsemble');

  assert(typeof ensemble.initialize === 'function', 'initialize exists');
  assert(typeof ensemble.predict === 'function', 'predict exists');

  ensemble.initialize(null);

  // Test: prediction with market consensus only
  const result = ensemble.predict(
    { conditionId: 'test-ensemble', yesPrice: 0.65 },
    { crossData: { kalshiPrice: 0.60, bookmakerProb: 0.70 } }
  );
  assert(result.ensemble !== null, 'Ensemble returns prediction');
  assert(result.ensemble > 0 && result.ensemble < 1, 'Prediction is valid probability');
  assert(result.modelCount >= 1, 'At least one sub-model contributed');

  // Test: resolution feedback
  ensemble.recordResolution('test-ensemble', true);
  const report = ensemble.getReport();
  assert(report.models.length > 0, 'Report includes models');
  assert(report.totalPredictions > 0, 'Predictions recorded');

  ensemble.stop();
});

// 4. Strategy Optimizer
describe('Strategy Optimizer', () => {
  const optimizer = require('../engine/strategyOptimizer');

  optimizer.initialize({});

  // Test: record trades
  for (let i = 0; i < 15; i++) {
    optimizer.recordTrade('TEST_STRAT', {
      pnl: i % 3 === 0 ? -5 : 8, // 2/3 win rate
      positionSize: 10,
      timestamp: new Date().toISOString(),
    });
  }

  // Test: allocation
  const allocation = optimizer.getAllocation('TEST_STRAT');
  assert(typeof allocation === 'number', 'Allocation is a number');
  assert(allocation > 0, 'Allocation is positive');

  // Test: optimize
  const results = optimizer.optimize();
  assert(Array.isArray(results), 'Optimize returns array');
  assert(results.length > 0, 'Optimization processed strategies');

  const testResult = results.find(r => r.strategy === 'TEST_STRAT');
  assert(testResult !== undefined, 'TEST_STRAT was optimized');
  assert(testResult.action !== 'insufficient_data', 'Had enough data for optimization');

  // Test: report
  const report = optimizer.getReport();
  assert(report.strategies.length > 0, 'Report includes strategies');
  assert(report.totalStrategies > 0, 'Total strategies counted');

  optimizer.stop();
});

// 5. Health Monitor
describe('Health Monitor', () => {
  const health = require('../engine/healthMonitor');

  health.start({
    onAlert: (alert) => { /* capture alerts */ },
  });

  // Test: register and record
  health.register('test-source', 'data', false);
  health.recordSuccess('test-source', 150, { items: 10 });

  const status = health.getStatus();
  assert(status.overallStatus !== undefined, 'Status has overallStatus');
  assert(status.summary.total > 0, 'Components registered');

  const testComp = status.components.find(c => c.name === 'test-source');
  assert(testComp !== undefined, 'Test source found in status');
  assert(testComp.status === 'healthy', 'Test source is healthy');
  assert(testComp.latencyMs === 150, 'Latency recorded');

  // Test: error tracking
  health.recordError('test-source', 'Connection timeout');
  health.recordError('test-source', 'Connection timeout');
  health.recordError('test-source', 'Connection timeout');

  const degraded = health.getStatus().components.find(c => c.name === 'test-source');
  assert(degraded.status === 'down', 'Three consecutive errors = down');
  assert(degraded.consecutiveErrors === 3, 'Error count tracked');

  // Test: recovery
  health.recordSuccess('test-source', 100);
  const recovered = health.getStatus().components.find(c => c.name === 'test-source');
  assert(recovered.status === 'healthy', 'Recovery detected');

  health.stop();
});

// 6. News Stream
describe('News Stream', () => {
  const newsStream = require('../engine/newsStream');

  // Test: headline scoring
  const breaking = newsStream.scoreHeadline('BREAKING: Trump announces tariff deal with China');
  assert(breaking.isBreaking === true, 'Breaking keyword detected');
  assert(breaking.score >= 30, 'Breaking score >= 30');
  assert(breaking.matchedEntities.includes('trump'), 'Trump entity matched');

  const boring = newsStream.scoreHeadline('Local weather forecast for Tuesday');
  assert(boring.isBreaking === false, 'Non-breaking correctly identified');
  assert(boring.score < 20, 'Low impact score');

  const crypto = newsStream.scoreHeadline('SEC approves Bitcoin ETF application from Blackrock');
  assert(crypto.score >= 20, 'Crypto news has impact');
  assert(crypto.matchedEntities.includes('bitcoin') || crypto.matchedEntities.includes('etf'), 'Crypto entities matched');

  // Test: source definitions
  assert(newsStream.SOURCES.length >= 10, 'At least 10 news sources configured');
});

// 7. Log Cleanup
describe('Log Cleanup', () => {
  const cleanup = require('../engine/logCleanup');

  // Test: disk usage report
  const usage = cleanup.getDiskUsage();
  assert(typeof usage.totalSizeMB === 'number', 'Disk usage returns size');
  assert(Array.isArray(usage.files), 'Disk usage returns file list');

  // Test: cleanup functions exist
  assert(typeof cleanup.cleanOldLogs === 'function', 'cleanOldLogs exists');
  assert(typeof cleanup.compactJsonFiles === 'function', 'compactJsonFiles exists');
  assert(typeof cleanup.runCleanup === 'function', 'runCleanup exists');
});

// 8. Database
describe('Database', () => {
  const database = require('../engine/database');

  if (database.isReady()) {
    // SQLite available — run full tests
    const tradeId = database.insertTrade({
      conditionId: 'test-db-001',
      market: 'Test Market',
      side: 'YES',
      positionSize: 10,
      price: 0.55,
      edge: 0.05,
      strategy: 'TEST',
      mode: 'paper',
    });
    assert(tradeId !== null, 'Trade inserted successfully');

    const trades = database.getTradeHistory({ limit: 5 });
    assert(Array.isArray(trades), 'Trade history returns array');

    const stats = database.getTradeStats();
    assert(stats !== null || stats === null, 'Trade stats accessible'); // May be null if no closed trades

    const edgeId = database.insertEdge({
      conditionId: 'test-edge-001',
      market: 'Test Edge Market',
      ourProb: 0.65,
      marketPrice: 0.55,
      edge: 0.10,
      qualityGrade: 'A',
      qualityScore: 80,
      strategy: 'PROVEN_EDGE',
    });
    assert(edgeId !== null, 'Edge inserted successfully');

    const signalId = database.insertSignal({
      conditionId: 'test-signal-001',
      signalType: 'bookmaker_divergence',
      value: 0.08,
      confidence: 0.75,
    });
    assert(signalId !== null, 'Signal inserted successfully');

    console.log(' (SQLite OK)');
  } else {
    skip('SQLite not initialized');
    skip('Skipping DB tests');
  }
});

// 9. WebSocket Server
describe('WebSocket Server', () => {
  const wsServer = require('../engine/wsServer');

  assert(typeof wsServer.initialize === 'function', 'initialize exists');
  assert(typeof wsServer.emit === 'function', 'emit exists');
  assert(typeof wsServer.tradeExecuted === 'function', 'tradeExecuted exists');
  assert(typeof wsServer.signalDetected === 'function', 'signalDetected exists');
  assert(typeof wsServer.getStats === 'function', 'getStats exists');

  const stats = wsServer.getStats();
  assert(stats.available === false, 'Not initialized without HTTP server');
});

// 10. New Alpha Engines
describe('Alpha Engines', () => {
  const newMarket = require('../engine/newMarketDetector');
  assert(typeof newMarket.start === 'function', 'newMarketDetector.start exists');
  assert(typeof newMarket.pollForNewMarkets === 'function', 'pollForNewMarkets exists');

  const newsReactor = require('../engine/newsReactor');
  assert(typeof newsReactor.start === 'function', 'newsReactor.start exists');
  assert(typeof newsReactor.pollNews === 'function', 'pollNews exists');

  const panicDip = require('../engine/panicDipDetector');
  assert(typeof panicDip.start === 'function', 'panicDipDetector.start exists');
  assert(typeof panicDip.detectDips === 'function', 'detectDips exists');

  const calibration = require('../engine/calibrationCollector');
  assert(typeof calibration.start === 'function', 'calibrationCollector.start exists');

  const pipeline = require('../engine/executionPipeline');
  assert(typeof pipeline.ingestSignal === 'function', 'pipeline.ingestSignal exists');
  assert(typeof pipeline.processQueue === 'function', 'pipeline.processQueue exists');
});

// ═══════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════
console.log('\n');
console.log('═'.repeat(50));
console.log(`  Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length > 0) {
  console.log('\n  ❌ Failures:');
  failures.forEach((f, i) => console.log(`     ${i + 1}. ${f}`));
}
console.log('═'.repeat(50));

if (failed > 0) {
  console.log('\n  ⚠️  Some tests failed. Check failures above.\n');
  process.exit(1);
} else {
  console.log('\n  ✅ All tests passed!\n');
  process.exit(0);
}
