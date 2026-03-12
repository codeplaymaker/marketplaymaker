/**
 * Alpha Engines API Routes
 *
 * Exposes the new market detector, news reactor, panic dip detector,
 * calibration collector, and execution pipeline via REST endpoints.
 */

const { Router } = require('express');

module.exports = function createAlphaRoutes(deps) {
  const router = Router();
  const {
    newMarketDetector,
    newsReactor,
    panicDipDetector,
    calibrationCollector,
    executionPipeline,
  } = deps;

  // ═══════════════════════════════════════════════════════════════════
  // ALPHA ENGINES DASHBOARD — unified status
  // ═══════════════════════════════════════════════════════════════════

  router.get('/alpha/status', (req, res) => {
    res.json({
      newMarketDetector: newMarketDetector?.getStatus() || { available: false },
      newsReactor: newsReactor?.getStatus() || { available: false },
      panicDipDetector: panicDipDetector?.getStatus() || { available: false },
      calibrationCollector: calibrationCollector?.getStatus() || { available: false },
      executionPipeline: executionPipeline?.getStatus() || { available: false },
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // NEW MARKET DETECTOR
  // ═══════════════════════════════════════════════════════════════════

  if (newMarketDetector) {
    router.get('/alpha/new-markets', (req, res) => {
      const limit = parseInt(req.query.limit) || 50;
      res.json({
        status: newMarketDetector.getStatus(),
        history: newMarketDetector.getHistory(limit),
      });
    });

    router.get('/alpha/new-markets/opportunities', (req, res) => {
      const limit = parseInt(req.query.limit) || 20;
      res.json({
        opportunities: newMarketDetector.getOpportunities(limit),
      });
    });

    router.post('/alpha/new-markets/poll', async (req, res) => {
      try {
        const result = await newMarketDetector.pollForNewMarkets();
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // NEWS REACTOR
  // ═══════════════════════════════════════════════════════════════════

  if (newsReactor) {
    router.get('/alpha/news-reactor', (req, res) => {
      res.json({
        status: newsReactor.getStatus(),
        recentSignals: newsReactor.getRecentSignals(20),
      });
    });

    router.get('/alpha/news-reactor/headlines', (req, res) => {
      const limit = parseInt(req.query.limit) || 30;
      res.json({
        headlines: newsReactor.getRecentHeadlines(limit),
      });
    });

    router.post('/alpha/news-reactor/poll', async (req, res) => {
      try {
        const result = await newsReactor.pollNews();
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // PANIC DIP DETECTOR
  // ═══════════════════════════════════════════════════════════════════

  if (panicDipDetector) {
    router.get('/alpha/panic-dips', (req, res) => {
      res.json({
        status: panicDipDetector.getStatus(),
        activeDips: panicDipDetector.getActiveDips(),
        winRate: panicDipDetector.getWinRate(),
      });
    });

    router.get('/alpha/panic-dips/history', (req, res) => {
      const limit = parseInt(req.query.limit) || 50;
      res.json({
        history: panicDipDetector.getDipHistory(limit),
        winRate: panicDipDetector.getWinRate(),
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // CALIBRATION COLLECTOR
  // ═══════════════════════════════════════════════════════════════════

  if (calibrationCollector) {
    router.get('/alpha/calibration', (req, res) => {
      res.json({
        status: calibrationCollector.getStatus(),
        report: calibrationCollector.getCalibrationReport(),
      });
    });

    router.post('/alpha/calibration/collect', async (req, res) => {
      try {
        const result = await calibrationCollector.collectResolutions();
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // EXECUTION PIPELINE
  // ═══════════════════════════════════════════════════════════════════

  if (executionPipeline) {
    router.get('/alpha/pipeline', (req, res) => {
      res.json({
        status: executionPipeline.getStatus(),
        breakdown: executionPipeline.getSignalBreakdown(),
      });
    });

    router.get('/alpha/pipeline/log', (req, res) => {
      const limit = parseInt(req.query.limit) || 50;
      res.json({
        log: executionPipeline.getExecutionLog(limit),
      });
    });

    router.post('/alpha/pipeline/process', async (req, res) => {
      try {
        const results = await executionPipeline.processQueue();
        res.json({ processed: results?.length || 0, results });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  }

  return router;
};
