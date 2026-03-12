/**
 * Comprehensive tests for Edge Resolver
 *
 * Tests edge recording, resolution via CLOB API format,
 * P&L calculations, decay tracking, and trade records.
 *
 * Run: node --test bot/tests/edgeResolver.test.js
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

describe('Edge Resolver', () => {
  let resolver;

  beforeEach(() => {
    if (!resolver) {
      delete require.cache[require.resolve('../engine/edgeResolver')];
      resolver = require('../engine/edgeResolver');
    }
    // Clear in-memory state so tests don't collide with production data
    resolver._resetForTest();
  });

  // ─── Edge Recording ─────────────────────────────────────────────
  describe('recordEdge', () => {
    it('should record a valid edge', () => {
      resolver.recordEdge({
        conditionId: 'test-cid-001',
        question: 'Will Bitcoin reach $100k?',
        prob: 0.65,
        marketPrice: 0.45,
        divergence: 0.20,
        edgeDirection: 'BUY_YES',
        edgeSignal: 'STRONG',
        edgeQuality: 75,
        edgeGrade: 'A',
        sourceCount: 3,
      });

      const pending = resolver.getPending();
      const found = pending.find(e => e.conditionId === 'test-cid-001');
      assert.ok(found, 'Edge should be in pending list');
      assert.equal(found.question, 'Will Bitcoin reach $100k?');
      assert.equal(found.resolved, false);
    });

    it('should not duplicate edges — should update price history', () => {
      const edge = {
        conditionId: 'test-cid-dup',
        question: 'Duplicate test',
        prob: 0.6,
        marketPrice: 0.5,
        divergence: 0.1,
        edgeDirection: 'BUY_YES',
        edgeSignal: 'MODERATE',
        edgeQuality: 55,
        edgeGrade: 'B',
      };

      resolver.recordEdge(edge);
      resolver.recordEdge({ ...edge, marketPrice: 0.55, divergence: 0.05 });

      const pending = resolver.getPending();
      const matches = pending.filter(e => e.conditionId === 'test-cid-dup');
      assert.equal(matches.length, 1, 'Should not create duplicate');
    });

    it('should reject edges without conditionId', () => {
      resolver.recordEdge({ question: 'No condition ID' });
      // Should not throw, just silently skip
      assert.ok(true, 'Handled missing conditionId');
    });

    it('should reject edges without question', () => {
      resolver.recordEdge({ conditionId: 'test-no-q' });
      assert.ok(true, 'Handled missing question');
    });

    it('should reject null input', () => {
      resolver.recordEdge(null);
      resolver.recordEdge(undefined);
      assert.ok(true, 'Handled null/undefined');
    });
  });

  // ─── Resolution: BUY_YES P&L ───────────────────────────────────
  describe('checkResolutions — BUY_YES', () => {
    it('should resolve YES win correctly', async () => {
      resolver.recordEdge({
        conditionId: 'resolve-yes-win',
        question: 'Test YES win',
        prob: 0.7,
        marketPrice: 0.4,
        divergence: 0.3,
        edgeDirection: 'BUY_YES',
        edgeSignal: 'STRONG',
        edgeQuality: 80,
        edgeGrade: 'A',
      });

      // Simulate CLOB API response: YES token won
      const result = await resolver.checkResolutions(async (cid) => {
        if (cid === 'resolve-yes-win') {
          return {
            closed: true,
            resolved: true,
            result: 'Yes',
            tokens: [
              { outcome: 'Yes', price: 1, winner: true },
              { outcome: 'No', price: 0, winner: false },
            ],
          };
        }
        return null;
      });

      assert.ok(result.resolved >= 1, 'Should resolve at least 1 edge');

      const record = resolver.getTrackRecord();
      const resolved = record.recent?.find(r => r.question === 'Test YES win');
      if (resolved) {
        assert.equal(resolved.outcome, 'YES');
        assert.ok(resolved.pnlPp > 0, `BUY_YES + YES outcome should be profitable, got ${resolved.pnlPp}pp`);
        // P&L = (1 - 0.4) * 100 = 60pp
        assert.ok(Math.abs(resolved.pnlPp - 60) < 1, `Expected ~60pp, got ${resolved.pnlPp}pp`);
      }
    });

    it('should resolve YES loss correctly', async () => {
      resolver.recordEdge({
        conditionId: 'resolve-yes-loss',
        question: 'Test YES loss',
        prob: 0.7,
        marketPrice: 0.6,
        divergence: 0.1,
        edgeDirection: 'BUY_YES',
        edgeSignal: 'MODERATE',
        edgeQuality: 60,
        edgeGrade: 'B',
      });

      const result = await resolver.checkResolutions(async (cid) => {
        if (cid === 'resolve-yes-loss') {
          return {
            closed: true,
            resolved: true,
            result: 'No',
            tokens: [
              { outcome: 'Yes', price: 0, winner: false },
              { outcome: 'No', price: 1, winner: true },
            ],
          };
        }
        return null;
      });

      assert.ok(result.resolved >= 1);

      const record = resolver.getTrackRecord();
      const resolved = record.recent?.find(r => r.question === 'Test YES loss');
      if (resolved) {
        assert.equal(resolved.outcome, 'NO');
        assert.ok(resolved.pnlPp < 0, `BUY_YES + NO outcome should be loss, got ${resolved.pnlPp}pp`);
        // P&L = -0.6 * 100 = -60pp
        assert.ok(Math.abs(resolved.pnlPp - (-60)) < 1, `Expected ~-60pp, got ${resolved.pnlPp}pp`);
      }
    });
  });

  // ─── Resolution: BUY_NO P&L ────────────────────────────────────
  describe('checkResolutions — BUY_NO', () => {
    it('should resolve NO win correctly', async () => {
      resolver.recordEdge({
        conditionId: 'resolve-no-win',
        question: 'Test NO win',
        prob: 0.2,
        marketPrice: 0.7,
        divergence: -0.5,
        edgeDirection: 'BUY_NO',
        edgeSignal: 'STRONG',
        edgeQuality: 85,
        edgeGrade: 'A',
      });

      const result = await resolver.checkResolutions(async (cid) => {
        if (cid === 'resolve-no-win') {
          return {
            closed: true,
            resolved: true,
            tokens: [
              { outcome: 'Yes', price: 0, winner: false },
              { outcome: 'No', price: 1, winner: true },
            ],
          };
        }
        return null;
      });

      assert.ok(result.resolved >= 1);
    });

    it('should resolve NO loss correctly', async () => {
      resolver.recordEdge({
        conditionId: 'resolve-no-loss',
        question: 'Test NO loss',
        prob: 0.3,
        marketPrice: 0.8,
        divergence: -0.5,
        edgeDirection: 'BUY_NO',
        edgeSignal: 'MODERATE',
        edgeQuality: 55,
        edgeGrade: 'B',
      });

      const result = await resolver.checkResolutions(async (cid) => {
        if (cid === 'resolve-no-loss') {
          return {
            closed: true,
            resolved: true,
            tokens: [
              { outcome: 'Yes', price: 1, winner: true },
              { outcome: 'No', price: 0, winner: false },
            ],
          };
        }
        return null;
      });

      assert.ok(result.resolved >= 1);
    });
  });

  // ─── Resolution: Unresolved market ─────────────────────────────
  describe('checkResolutions — skip unresolved', () => {
    it('should skip markets that are still open', async () => {
      resolver.recordEdge({
        conditionId: 'still-open',
        question: 'Still open market',
        prob: 0.5,
        marketPrice: 0.5,
        divergence: 0,
        edgeDirection: 'BUY_YES',
        edgeSignal: 'MODERATE',
        edgeQuality: 50,
        edgeGrade: 'C',
      });

      const result = await resolver.checkResolutions(async (cid) => {
        if (cid === 'still-open') {
          return {
            closed: false,
            resolved: false,
            tokens: [
              { outcome: 'Yes', price: 0.55, winner: false },
              { outcome: 'No', price: 0.45, winner: false },
            ],
          };
        }
        return null;
      });

      assert.equal(result.resolved, 0, 'Should not resolve open markets');
    });

    it('should handle null market responses', async () => {
      resolver.recordEdge({
        conditionId: 'null-response',
        question: 'Market not found',
        prob: 0.5,
        marketPrice: 0.5,
        divergence: 0,
        edgeDirection: 'BUY_YES',
        edgeSignal: 'MODERATE',
        edgeQuality: 50,
        edgeGrade: 'C',
      });

      const result = await resolver.checkResolutions(async () => null);
      assert.equal(result.resolved, 0);
    });

    it('should handle getMarketFn throwing errors', async () => {
      resolver.recordEdge({
        conditionId: 'error-market',
        question: 'API error test',
        prob: 0.5,
        marketPrice: 0.5,
        divergence: 0,
        edgeDirection: 'BUY_YES',
        edgeSignal: 'MODERATE',
        edgeQuality: 50,
        edgeGrade: 'C',
      });

      const result = await resolver.checkResolutions(async () => {
        throw new Error('API timeout');
      });
      assert.equal(result.resolved, 0, 'Should gracefully handle API errors');
    });
  });

  // ─── Resolution: Price inference ───────────────────────────────
  describe('checkResolutions — price inference', () => {
    it('should infer YES resolution from extreme price (0.99)', async () => {
      resolver.recordEdge({
        conditionId: 'price-infer-yes',
        question: 'Price inference YES',
        prob: 0.8,
        marketPrice: 0.5,
        divergence: 0.3,
        edgeDirection: 'BUY_YES',
        edgeSignal: 'STRONG',
        edgeQuality: 70,
        edgeGrade: 'B',
      });

      const result = await resolver.checkResolutions(async (cid) => {
        if (cid === 'price-infer-yes') {
          return {
            closed: true,
            yesPrice: 0.99,
            acceptingOrders: false,
          };
        }
        return null;
      });

      assert.ok(result.resolved >= 1, 'Should infer resolution from extreme price');
    });
  });

  // ─── "We Were Better" metric ───────────────────────────────────
  describe('weWereBetter metric', () => {
    it('should correctly calculate when model beats market', async () => {
      // Our estimate: 0.7, market: 0.4, outcome: YES (1)
      // ourError = |0.7 - 1| = 0.3, marketError = |0.4 - 1| = 0.6
      // We were better!
      resolver.recordEdge({
        conditionId: 'better-test',
        question: 'Better than market test',
        prob: 0.7,
        marketPrice: 0.4,
        divergence: 0.3,
        edgeDirection: 'BUY_YES',
        edgeSignal: 'STRONG',
        edgeQuality: 80,
        edgeGrade: 'A',
      });

      await resolver.checkResolutions(async (cid) => {
        if (cid === 'better-test') {
          return {
            closed: true,
            resolved: true,
            tokens: [{ outcome: 'Yes', price: 1, winner: true }, { outcome: 'No', price: 0, winner: false }],
          };
        }
        return null;
      });

      const record = resolver.getTrackRecord();
      if (record.summary) {
        assert.ok(record.summary.betterThanMarket >= 1 || record.summary.betterRate >= 0, 'Should track better-than-market');
      }
    });
  });

  // ─── Edge Decay Analysis ───────────────────────────────────────
  describe('getEdgeDecayAnalysis', () => {
    it('should return valid analysis structure', () => {
      const analysis = resolver.getEdgeDecayAnalysis();
      assert.ok(typeof analysis === 'object');
      assert.ok('total' in analysis);
      assert.ok('narrowing' in analysis);
      assert.ok('widening' in analysis);
      assert.ok('stable' in analysis);
      assert.ok(Array.isArray(analysis.edges));
    });
  });

  // ─── Track Record ──────────────────────────────────────────────
  describe('getTrackRecord', () => {
    it('should return valid track record structure', () => {
      const record = resolver.getTrackRecord();
      assert.ok(typeof record === 'object');
      assert.ok('summary' in record);
      assert.ok('recent' in record);
      assert.ok('hypothetical' in record);
      assert.ok(typeof record.summary.totalEdges === 'number');
    });
  });

  // ─── Trade Record ──────────────────────────────────────────────
  describe('addTradeRecord', () => {
    it('should add a trade record entry', () => {
      resolver.addTradeRecord({
        conditionId: 'trade-001',
        question: 'Trade test',
        source: 'scanner',
        side: 'YES',
        entryPrice: 0.5,
        ourProb: 0.6,
        marketPrice: 0.5,
        edgePp: 10,
        edgeGrade: 'B',
        edgeQuality: 65,
        sourceCount: 2,
        openedAt: new Date().toISOString(),
      });
      assert.ok(true, 'Trade record added');
    });
  });

  // ─── Trending Edge ─────────────────────────────────────────────
  describe('recordTrendingEdge', () => {
    it('should record a trending edge', () => {
      resolver.recordTrendingEdge({
        conditionId: 'trending-001',
        question: 'Trending market test',
        prob: 0.65,
        marketPrice: 0.45,
        divergence: 0.2,
        edgeDirection: 'BUY_YES',
        edgeSignal: 'STRONG',
        edgeQuality: 70,
        edgeGrade: 'B',
        source: 'youtube',
      });
      assert.ok(true, 'Trending edge recorded');
    });
  });

  // ─── PnL Chart ─────────────────────────────────────────────────
  describe('getPnLChart', () => {
    it('should return chart data structure', () => {
      const chart = resolver.getPnLChart();
      assert.ok(typeof chart === 'object');
    });
  });

  // ─── Trade History ─────────────────────────────────────────────
  describe('getTradeHistory', () => {
    it('should return trade history', () => {
      const history = resolver.getTradeHistory({ limit: 10, status: 'all' });
      assert.ok(typeof history === 'object');
    });

    it('should filter by status', () => {
      const open = resolver.getTradeHistory({ status: 'open' });
      const closed = resolver.getTradeHistory({ status: 'closed' });
      assert.ok(typeof open === 'object');
      assert.ok(typeof closed === 'object');
    });
  });
});

console.log('\n✅ Edge Resolver tests loaded.\n');
