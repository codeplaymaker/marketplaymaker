/**
 * Infrastructure Routes — Health monitoring, strategy optimizer,
 * probability ensemble, news stream, log cleanup, WebSocket stats.
 */
const { Router } = require('express');

module.exports = function createInfraRoutes(deps) {
  const router = Router();
  const {
    healthMonitor, logCleanup, strategyOptimizer,
    probabilityEnsemble, wsServer, newsStream,
  } = deps;

  // ═══════════════════════════════════════════════════════════════════
  // HEALTH MONITOR
  // ═══════════════════════════════════════════════════════════════════

  router.get('/infra/health', (req, res) => {
    res.json(healthMonitor ? healthMonitor.getStatus() : { available: false });
  });

  // ═══════════════════════════════════════════════════════════════════
  // STRATEGY OPTIMIZER
  // ═══════════════════════════════════════════════════════════════════

  router.get('/infra/optimizer', (req, res) => {
    res.json(strategyOptimizer ? strategyOptimizer.getReport() : { available: false });
  });

  if (strategyOptimizer) {
    router.post('/infra/optimizer/optimize', (req, res) => {
      try {
        const results = strategyOptimizer.optimize();
        res.json({ results });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    router.get('/infra/optimizer/allocation/:strategy', (req, res) => {
      const allocation = strategyOptimizer.getAllocation(req.params.strategy);
      const enabled = strategyOptimizer.isEnabled(req.params.strategy);
      res.json({ strategy: req.params.strategy, allocation, enabled });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // PROBABILITY ENSEMBLE
  // ═══════════════════════════════════════════════════════════════════

  router.get('/infra/ensemble', (req, res) => {
    res.json(probabilityEnsemble ? probabilityEnsemble.getReport() : { available: false });
  });

  if (probabilityEnsemble) {
    router.post('/infra/ensemble/predict', (req, res) => {
      try {
        const { market, context } = req.body;
        if (!market) return res.status(400).json({ error: 'market required' });
        const result = probabilityEnsemble.predict(market, context || {});
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // NEWS STREAM
  // ═══════════════════════════════════════════════════════════════════

  router.get('/infra/news-stream', (req, res) => {
    res.json(newsStream ? newsStream.getStatus() : { available: false });
  });

  // ═══════════════════════════════════════════════════════════════════
  // LOG CLEANUP
  // ═══════════════════════════════════════════════════════════════════

  router.get('/infra/disk', (req, res) => {
    res.json(logCleanup ? logCleanup.getDiskUsage() : { available: false });
  });

  if (logCleanup) {
    router.post('/infra/cleanup', async (req, res) => {
      try {
        const result = await logCleanup.runCleanup();
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // WEBSOCKET STATS
  // ═══════════════════════════════════════════════════════════════════

  router.get('/infra/ws', (req, res) => {
    res.json(wsServer ? wsServer.getStats() : { available: false });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UNIFIED DASHBOARD — everything in one call
  // ═══════════════════════════════════════════════════════════════════

  router.get('/infra/dashboard', (req, res) => {
    res.json({
      health: healthMonitor ? healthMonitor.getStatus() : null,
      optimizer: strategyOptimizer ? strategyOptimizer.getReport() : null,
      ensemble: probabilityEnsemble ? probabilityEnsemble.getReport() : null,
      newsStream: newsStream ? newsStream.getStatus() : null,
      ws: wsServer ? wsServer.getStats() : null,
      disk: logCleanup ? logCleanup.getDiskUsage() : null,
    });
  });

  return router;
};
