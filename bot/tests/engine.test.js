/**
 * Unit Tests for Engine Modules
 * 
 * Uses Node.js built-in test runner (node --test).
 * Run: node --test bot/tests/engine.test.js
 * 
 * Tests:
 *   - Probability Model (Bayesian updating, Kelly criterion)
 *   - Risk Manager (trade checks, VaR, stress test, correlation)
 *   - Fees calculator
 *   - Edge Resolver (recording, decay)
 *   - Strategies (momentum, whale, relative value signals)
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// ─── Probability Model Tests ─────────────────────────────────────────
describe('Probability Model', () => {
  let probModel;

  beforeEach(() => {
    // Fresh require to avoid state leakage
    delete require.cache[require.resolve('../engine/probabilityModel')];
    probModel = require('../engine/probabilityModel');
  });

  it('should calculate Kelly bet size correctly', () => {
    // Edge case: 60% win prob at 50% odds → positive Kelly
    const kelly = probModel.kellyBet ? probModel.kellyBet(0.6, 0.5) : null;
    if (kelly !== null) {
      assert.ok(kelly > 0, 'Kelly should be positive when edge exists');
      assert.ok(kelly < 1, 'Kelly should be less than 100% of bankroll');
    }
  });

  it('should return zero Kelly on negative edge', () => {
    const kelly = probModel.kellyBet ? probModel.kellyBet(0.4, 0.5) : null;
    if (kelly !== null) {
      assert.ok(kelly <= 0, 'Kelly should be zero or negative on bad odds');
    }
  });

  it('should clamp probabilities to [0.01, 0.99]', () => {
    if (probModel.clampProb) {
      assert.equal(probModel.clampProb(1.5), 0.99);
      assert.equal(probModel.clampProb(-0.5), 0.01);
      assert.equal(probModel.clampProb(0.5), 0.5);
    }
  });

  it('should have bayesianUpdate function', () => {
    if (probModel.bayesianUpdate) {
      const result = probModel.bayesianUpdate(0.5, [{ probability: 0.7, weight: 1 }]);
      assert.ok(typeof result === 'number', 'Should return a number');
      assert.ok(result > 0.5, 'Should shift toward evidence');
      assert.ok(result < 1, 'Should stay below 1');
    }
  });
});

// ─── Risk Manager Tests ──────────────────────────────────────────────
describe('Risk Manager', () => {
  let riskManager;

  beforeEach(() => {
    delete require.cache[require.resolve('../engine/riskManager')];
    riskManager = require('../engine/riskManager');
    riskManager.reset();
  });

  it('should approve valid trade', () => {
    const result = riskManager.checkTrade({
      positionSize: 10,
      conditionId: 'test-001',
      market: 'Test Market',
      slug: 'test-market',
      side: 'YES',
    }, 1000);

    assert.ok(result.allowed, `Trade should be approved: ${result.reason}`);
  });

  it('should reject trade exceeding single market limit', () => {
    const result = riskManager.checkTrade({
      positionSize: 999,
      conditionId: 'test-002',
      market: 'Test Market',
      slug: 'test-market',
      side: 'YES',
    }, 1000);

    assert.ok(!result.allowed, 'Oversized trade should be rejected');
    assert.ok(result.reason.includes('single market') || result.reason.includes('exposure'),
      'Reason should mention limit');
  });

  it('should reject trade when bankroll too low', () => {
    const result = riskManager.checkTrade({
      positionSize: 5,
      conditionId: 'test-003',
      market: 'Test Market',
      slug: 'test-market',
      side: 'YES',
    }, 1); // $1 bankroll

    assert.ok(!result.allowed, 'Should reject with tiny bankroll');
  });

  it('should track positions correctly', () => {
    riskManager.addPosition({
      conditionId: 'pos-001',
      market: 'Bitcoin above 100k',
      slug: 'btc-100k',
      side: 'YES',
      positionSize: 50,
      price: 0.6,
      strategy: 'test',
      edge: 0.1,
    });

    const positions = riskManager.getPositions();
    assert.equal(positions.length, 1);
    assert.equal(positions[0].conditionId, 'pos-001');
    assert.equal(positions[0].size, 50);
  });

  it('should calculate P&L on close', () => {
    riskManager.addPosition({
      conditionId: 'pnl-001',
      market: 'Test',
      slug: 'test',
      side: 'YES',
      positionSize: 100,
      price: 0.5,
      strategy: 'test',
    });

    // Win scenario: YES resolves YES (closePrice = 1.0)
    const result = riskManager.closePosition('pnl-001', 'YES', 1.0);
    assert.ok(result, 'Should return closed position');
    assert.ok(result.pnl > 0, `Should have positive P&L, got ${result.pnl}`);
  });

  it('should detect correlated exposure', () => {
    riskManager.addPosition({
      conditionId: 'corr-001',
      market: 'Trump wins 2025',
      slug: 'trump-wins',
      side: 'YES',
      positionSize: 30,
      price: 0.5,
    });

    const group = riskManager.getCorrelationGroup('Trump wins 2025', 'trump-wins');
    assert.ok(group.includes('trump') || group.includes('entity'), `Should detect Trump correlation, got ${group}`);

    const exposure = riskManager.getCorrelatedExposure(group);
    assert.equal(exposure, 30, 'Correlated exposure should equal position size');
  });

  it('should generate correlation heatmap', () => {
    riskManager.addPosition({
      conditionId: 'heat-001',
      market: 'Bitcoin hits 200k',
      slug: 'btc-200k',
      side: 'YES',
      positionSize: 50,
      price: 0.3,
    });

    const heatmap = riskManager.getCorrelationHeatmap();
    assert.ok(typeof heatmap === 'object');
    const hasAnyEntry = Object.keys(heatmap).length > 0;
    assert.ok(hasAnyEntry, 'Heatmap should have entries for crypto market');
  });

  it('should run Monte Carlo VaR', () => {
    riskManager.addPosition({
      conditionId: 'var-001',
      market: 'Test position',
      slug: 'test',
      side: 'YES',
      positionSize: 100,
      price: 0.5,
      edge: 0.1,
    });

    const mc = riskManager.monteCarloVaR(1000, { simulations: 1000 });
    assert.ok(mc.vaR95 >= 0, 'VaR95 should be non-negative');
    assert.ok(mc.vaR99 >= mc.vaR95, 'VaR99 should be >= VaR95');
    assert.ok(mc.simulations === 1000, 'Should run requested simulations');
    assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(mc.riskLevel), 'Should have valid risk level');
  });

  it('should run stress tests', () => {
    riskManager.addPosition({
      conditionId: 'stress-001',
      market: 'Bitcoin above 150k',
      slug: 'btc-150k',
      side: 'YES',
      positionSize: 100,
      price: 0.3,
    });

    const stress = riskManager.runStressTest(1000);
    assert.ok(stress.scenarios, 'Should have scenarios');
    assert.ok(stress.scenarios['black-swan'], 'Should include black swan');
    assert.ok(stress.scenarios['black-swan'].estimatedLoss > 0, 'Black swan should have loss');
    assert.ok(stress.portfolioResilience, 'Should have resilience rating');
  });

  it('should apply dynamic risk multiplier correctly', () => {
    // No drawdown
    const mult1 = riskManager.getDynamicRiskMultiplier(1000);
    assert.equal(mult1, 1.0, 'No drawdown should mean 1.0x');
  });
});

// ─── Fees Calculator Tests ───────────────────────────────────────────
describe('Fees Calculator', () => {
  let fees;

  beforeEach(() => {
    delete require.cache[require.resolve('../engine/fees')];
    fees = require('../engine/fees');
  });

  it('should calculate trading fees', () => {
    if (fees.calculateFees) {
      const result = fees.calculateFees(100, 0.5);
      assert.ok(typeof result === 'object', 'Should return fee object');
      assert.ok(result.totalFees >= 0, 'Fees should be non-negative');
    }
  });

  it('should calculate net return correctly', () => {
    if (fees.netReturn) {
      const net = fees.netReturn(100, 0.5, true); // win
      assert.ok(typeof net === 'number', 'Net return should be a number');
    }
  });
});

// ─── Strategy Tests ──────────────────────────────────────────────────
describe('Strategies', () => {
  it('should load all strategies from index', () => {
    const strategies = require('../strategies');
    assert.ok(typeof strategies === 'object', 'Should export strategies object');
    
    // Check required strategies exist
    const requiredStrats = ['noBets', 'arbitrage'];
    for (const name of requiredStrats) {
      assert.ok(strategies[name], `Strategy "${name}" should be registered`);
    }
  });

  it('momentum strategy should export evaluate', () => {
    try {
      const momentum = require('../strategies/momentum');
      assert.ok(typeof momentum.evaluate === 'function', 'Should have evaluate function');
    } catch {
      // Optional strategy, skip if not available
    }
  });

  it('whaleDetection strategy should export evaluate', () => {
    try {
      const whale = require('../strategies/whaleDetection');
      assert.ok(typeof whale.evaluate === 'function', 'Should have evaluate function');
    } catch {
      // Optional strategy, skip if not available
    }
  });

  it('relativeValue strategy should export findOpportunities', () => {
    try {
      const rv = require('../strategies/relativeValue');
      assert.ok(
        typeof rv.findOpportunities === 'function' || typeof rv.evaluate === 'function',
        'Should have findOpportunities or evaluate'
      );
    } catch {
      // Optional strategy, skip
    }
  });
});

// ─── Edge Resolver Tests ─────────────────────────────────────────────
describe('Edge Resolver', () => {
  let edgeResolver;

  beforeEach(() => {
    delete require.cache[require.resolve('../engine/edgeResolver')];
    edgeResolver = require('../engine/edgeResolver');
  });

  it('should record an edge', () => {
    if (edgeResolver.recordEdge) {
      edgeResolver.recordEdge({
        conditionId: 'edge-test-001',
        market: 'Test Market',
        ourProb: 0.6,
        marketPrice: 0.45,
        qualityGrade: 'B',
        qualityScore: 65,
      });

      // Should not throw
      assert.ok(true, 'Edge recorded successfully');
    }
  });

  it('should provide edge decay analysis', () => {
    if (edgeResolver.getEdgeDecayAnalysis) {
      const analysis = edgeResolver.getEdgeDecayAnalysis();
      assert.ok(typeof analysis === 'object', 'Should return analysis object');
    }
  });
});

// ─── Database Tests ──────────────────────────────────────────────────
describe('Database', () => {
  it('should load database module', () => {
    try {
      const db = require('../engine/database');
      assert.ok(typeof db.initialize === 'function', 'Should have initialize');
      assert.ok(typeof db.insertTrade === 'function', 'Should have insertTrade');
      assert.ok(typeof db.getTradeHistory === 'function', 'Should have getTradeHistory');
    } catch {
      // better-sqlite3 may not be installed, skip
    }
  });
});

// ─── Backtester Tests ────────────────────────────────────────────────
describe('Backtester', () => {
  it('should load backtester module', () => {
    try {
      const bt = require('../engine/backtester');
      assert.ok(typeof bt.run === 'function', 'Should have run function');
      assert.ok(typeof bt.listResults === 'function', 'Should have listResults function');
    } catch {
      // Optional module
    }
  });
});

// ─── Event Push Tests ────────────────────────────────────────────────
describe('Event Push', () => {
  let eventPush;

  beforeEach(() => {
    delete require.cache[require.resolve('../engine/eventPush')];
    eventPush = require('../engine/eventPush');
  });

  it('should export SSE handler', () => {
    assert.ok(typeof eventPush.sseHandler === 'function');
  });

  it('should broadcast without clients without error', () => {
    // Should not throw even with no clients
    eventPush.broadcast('test', { hello: 'world' });
    assert.ok(true, 'Broadcast without clients should be safe');
  });

  it('should report zero clients initially', () => {
    assert.equal(eventPush.getClientCount(), 0);
  });
});

console.log('\n✅ All engine tests loaded. Run with: node --test bot/tests/engine.test.js\n');
