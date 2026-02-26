const express = require('express');

/**
 * Alerts & Watchlist routes
 *
 * Expected deps:
 *   alerts, watchlist, markets, scanner
 */
module.exports = function createWatchlistRoutes(deps) {
  const router = express.Router();
  const { alerts, watchlist, markets, scanner } = deps;

  // ─── Alerts ────────────────────────────────────────────────────────
  router.get('/intel/alerts', (req, res) => {
    res.json({ alerts: alerts.getAlerts(), history: alerts.getAlertHistory(parseInt(req.query.limit) || 50) });
  });

  router.post('/intel/alerts', (req, res) => {
    try {
      const alert = alerts.createAlert(req.body);
      res.json(alert);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/intel/alerts/:alertId', (req, res) => {
    const removed = alerts.deleteAlert(req.params.alertId);
    if (!removed) return res.status(404).json({ error: 'Alert not found' });
    res.json(removed);
  });

  router.delete('/intel/alerts-history', (req, res) => {
    alerts.clearHistory();
    res.json({ status: 'ok' });
  });

  // ─── Watchlist ─────────────────────────────────────────────────────
  router.get('/intel/watchlist', (req, res) => {
    const currentMarkets = markets.getCachedMarkets();
    const opps = scanner.getOpportunities(500);
    res.json(watchlist.getEnriched(currentMarkets, opps));
  });

  router.post('/intel/watchlist', (req, res) => {
    try {
      const result = watchlist.add(req.body, req.body.notes);
      if (result.error) return res.status(409).json(result);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/intel/watchlist/:conditionId', (req, res) => {
    const removed = watchlist.remove(req.params.conditionId);
    if (!removed) return res.status(404).json({ error: 'Not in watchlist' });
    res.json(removed);
  });

  router.patch('/intel/watchlist/:conditionId/notes', (req, res) => {
    const updated = watchlist.updateNotes(req.params.conditionId, req.body.notes);
    if (!updated) return res.status(404).json({ error: 'Not in watchlist' });
    res.json(updated);
  });

  return router;
};
