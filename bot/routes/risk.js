const express = require('express');

/**
 * Risk, Performance, Calibration & Database routes
 *
 * Expected deps:
 *   riskManager, scanner, executor, resolver, database (optional)
 */
module.exports = function createRiskRoutes(deps) {
  const router = express.Router();
  const { riskManager, scanner, executor, resolver, database } = deps;

  // ─── Risk ──────────────────────────────────────────────────────────
  router.get('/risk', (req, res) => {
    res.json(riskManager.getStats(scanner.getBankroll()));
  });

  router.get('/risk/heatmap', (req, res) => {
    try {
      const heatmap = riskManager.getCorrelationHeatmap
        ? riskManager.getCorrelationHeatmap()
        : {};
      const vaR = riskManager.estimatePortfolioVaR
        ? riskManager.estimatePortfolioVaR(scanner.getBankroll())
        : {};
      res.json({ heatmap, vaR });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/risk/var', (req, res) => {
    try {
      const sims = parseInt(req.query.simulations) || 10000;
      const mc = riskManager.monteCarloVaR
        ? riskManager.monteCarloVaR(scanner.getBankroll(), { simulations: sims })
        : {};
      res.json(mc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/risk/stress', (req, res) => {
    try {
      const results = riskManager.runStressTest
        ? riskManager.runStressTest(scanner.getBankroll())
        : { scenarios: {}, summary: 'Stress test not available' };
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Positions ─────────────────────────────────────────────────────
  router.get('/positions', (req, res) => {
    res.json(riskManager.getPositions());
  });

  // ─── Calibration ───────────────────────────────────────────────────
  router.get('/calibration', (req, res) => {
    try {
      const insights = resolver.getCalibrationInsights
        ? resolver.getCalibrationInsights()
        : { status: 'Not available' };
      res.json(insights);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Performance ───────────────────────────────────────────────────
  router.get('/performance', (req, res) => {
    const stats = executor.getTradeStats();
    const risk = riskManager.getStats(scanner.getBankroll());
    const realPerf = resolver.getRealPerformance();

    res.json({
      ...stats,
      ...risk,
      bankroll: scanner.getBankroll(),
      realPnL: realPerf.totalPnL,
      realWinRate: realPerf.winRate,
      realProfitFactor: realPerf.profitFactor,
      resolvedCount: realPerf.totalResolved,
      pnlCurve: realPerf.pnlCurve,
      byStrategy: realPerf.byStrategy,
      pendingPositions: riskManager.getPositions().length,
    });
  });

  // ─── Reset ─────────────────────────────────────────────────────────
  router.post('/reset', (req, res) => {
    scanner.stop();
    executor.reset();
    riskManager.reset();
    res.json({ status: 'reset', message: 'All systems reset' });
  });

  // ─── Database Analytics ────────────────────────────────────────────
  router.get('/db/trades', (req, res) => {
    try {
      if (!database || !database.isReady()) return res.json({ available: false, trades: [] });
      const { limit, offset, strategy, status } = req.query;
      const trades = database.getTradeHistory({
        limit: parseInt(limit) || 100,
        offset: parseInt(offset) || 0,
        strategy, status,
      });
      res.json({ available: true, trades });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/db/stats', (req, res) => {
    try {
      if (!database || !database.isReady()) return res.json({ available: false });
      const stats = database.getTradeStats();
      const byStrategy = database.getStrategyBreakdown();
      const calibration = database.getCalibrationCurve();
      const edgeAccuracy = database.getEdgeAccuracy();
      res.json({ available: true, stats, byStrategy, calibration, edgeAccuracy });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/db/pnl', (req, res) => {
    try {
      if (!database || !database.isReady()) return res.json({ available: false, series: [] });
      const { days, mode } = req.query;
      const series = database.getPnlTimeseries({ days: parseInt(days) || 30, mode });
      let cumulative = 0;
      const cumSeries = series.map(d => {
        cumulative += d.daily_pnl;
        return { ...d, cumulative_pnl: Math.round(cumulative * 100) / 100 };
      });
      res.json({ available: true, series: cumSeries });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
