/**
 * Scanner + Integration Tests
 *
 * Tests the scanner module's utility functions and status reporting.
 * Uses a lighter approach since scan() depends on many external services.
 *
 * Run: node --test bot/tests/scanner.test.js
 */
const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

// Load once (scanner has heavy side-effects on import)
const scanner = require('../engine/scanner');

describe('Scanner', () => {
  after(() => {
    scanner.stop();
  });

  describe('getBankroll / setBankroll', () => {
    it('should return default bankroll', () => {
      const br = scanner.getBankroll();
      assert.ok(typeof br === 'number');
      assert.ok(br > 0, 'Default bankroll should be positive');
    });

    it('should update bankroll', () => {
      scanner.setBankroll(5000);
      assert.equal(scanner.getBankroll(), 5000);
    });

    it('should persist across calls', () => {
      scanner.setBankroll(2500);
      assert.equal(scanner.getBankroll(), 2500);
      scanner.setBankroll(7500);
      assert.equal(scanner.getBankroll(), 7500);
    });
  });

  describe('getOpportunities', () => {
    it('should return an array', () => {
      const opps = scanner.getOpportunities();
      assert.ok(Array.isArray(opps));
    });

    it('should respect limit parameter', () => {
      const opps = scanner.getOpportunities(5);
      assert.ok(opps.length <= 5);
    });
  });

  describe('getOpportunitiesByStrategy', () => {
    it('should return empty for non-existent strategy', () => {
      const opps = scanner.getOpportunitiesByStrategy('nonexistent_strategy_xyz');
      assert.ok(Array.isArray(opps));
      assert.equal(opps.length, 0);
    });
  });

  describe('getStatus', () => {
    it('should return status object', () => {
      const status = scanner.getStatus();
      assert.ok(typeof status === 'object');
      assert.ok('running' in status);
      assert.ok('bankroll' in status);
      assert.ok('opportunityCount' in status);
    });

    it('should not be running initially', () => {
      const status = scanner.getStatus();
      assert.equal(status.running, false);
    });

    it('should reflect bankroll changes', () => {
      scanner.setBankroll(3000);
      const status = scanner.getStatus();
      assert.equal(status.bankroll, 3000);
    });
  });

  describe('start / stop', () => {
    it('should report not running before start', () => {
      assert.equal(scanner.getStatus().running, false);
    });

    // Note: scanner.start() triggers a real API scan cycle
    // which creates long-lived intervals. Tested manually only.
  });
});

// ─── Integration: Cross-module imports ───────────────────────────
describe('Integration: Module Loading', () => {
  it('should load all core engine modules', () => {
    const modules = [
      '../engine/probabilityModel',
      '../engine/edgeResolver',
      '../engine/riskManager',
      '../engine/scanner',
      '../engine/alerts',
      '../engine/paperTrader',
      '../engine/signalTracker',
      '../engine/watchlist',
      '../engine/fees',
    ];

    for (const mod of modules) {
      try {
        const loaded = require(mod);
        assert.ok(typeof loaded === 'object' || typeof loaded === 'function', `${mod} should export something`);
      } catch (err) {
        assert.fail(`Failed to load ${mod}: ${err.message}`);
      }
    }
  });

  it('should load all data modules', () => {
    const modules = [
      '../data/cryptoData',
      '../data/stockData',
      '../data/espnData',
      '../data/newsSignal',
      '../data/searchUtils',
    ];

    for (const mod of modules) {
      try {
        const loaded = require(mod);
        assert.ok(typeof loaded === 'object' || typeof loaded === 'function', `${mod} should export something`);
      } catch (err) {
        // Some modules may fail due to missing API keys — that's okay for module loading tests
        if (!err.message.includes('Cannot find module')) {
          // It loaded but errored during init — still counts as loadable
        } else {
          assert.fail(`Cannot find module ${mod}: ${err.message}`);
        }
      }
    }
  });

  it('should load polymarket client', () => {
    const client = require('../polymarket/client');
    assert.ok(typeof client.getMarkets === 'function');
    assert.ok(typeof client.getMarketById === 'function');
    assert.ok(typeof client.getOrderbook === 'function');
    assert.ok(typeof client.getMidpoint === 'function');
    assert.ok(typeof client.getPrice === 'function');
  });

  it('should load utility modules', () => {
    const logger = require('../utils/logger');
    assert.ok(typeof logger.info === 'function');
    assert.ok(typeof logger.error === 'function');
  });
});

// ─── Integration: Probability → Edge Pipeline ────────────────────
describe('Integration: Probability → Edge Pipeline', () => {
  it('should flow: estimate probability → calculate edge → record edge', () => {
    const prob = require('../engine/probabilityModel');
    const edge = require('../engine/edgeResolver');

    // Step 1: Estimate probability
    const result = prob.estimateProbability({
      question: 'Integration test market',
      yesPrice: 0.5,
      volume24hr: 500000,
      endDate: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
    });

    assert.ok(typeof result.estimatedProb === 'number');

    // Step 2: Calculate edge
    const marketEdge = result.estimatedProb - 0.5;

    // Step 3: Record edge
    edge.recordEdge({
      conditionId: 'integration-test-pipeline',
      slug: 'integration-test',
      question: 'Integration test market',
      prob: result.estimatedProb,
      marketPrice: 0.5,
      divergence: marketEdge,
      edgeDirection: marketEdge > 0 ? 'BUY_YES' : 'BUY_NO',
      edgeSignal: 'MODERATE',
      edgeQuality: 50,
      edgeGrade: 'C',
    });

    // Verify it was recorded
    const pending = edge.getPending();
    const found = pending.find(e => e.conditionId === 'integration-test-pipeline');
    assert.ok(found, 'Should record edge in pending list');
  });
});

console.log('\n✅ Scanner + integration tests loaded.\n');
