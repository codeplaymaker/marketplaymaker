const express = require('express');

/**
 * Bot Control, Trade History, Orders & Paper Trading routes
 *
 * Expected deps:
 *   scanner, executor, riskManager, paperTrader
 */
module.exports = function createTradingRoutes(deps) {
  const router = express.Router();
  const { scanner, executor, riskManager, paperTrader } = deps;

  // ─── Bot Control ─────────────────────────────────────────────────────
  router.post('/bot/start', (req, res) => {
    const { bankroll } = req.body || {};
    scanner.start(bankroll || 1000);
    res.json({ status: 'started', ...scanner.getStatus() });
  });

  router.post('/bot/stop', (req, res) => {
    scanner.stop();
    res.json({ status: 'stopped', ...scanner.getStatus() });
  });

  router.get('/bot/status', (req, res) => {
    res.json({
      scanner: scanner.getStatus(),
      executor: executor.getTradeStats(),
      risk: riskManager.getStats(scanner.getBankroll()),
      mode: executor.getMode(),
    });
  });

  router.post('/bot/mode', (req, res) => {
    const { mode } = req.body;
    try {
      executor.setMode(mode);
      res.json({ mode: executor.getMode() });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/bot/bankroll', (req, res) => {
    const { amount } = req.body;
    if (!amount || amount < 0) return res.status(400).json({ error: 'Invalid amount' });
    scanner.setBankroll(amount);
    res.json({ bankroll: scanner.getBankroll() });
  });

  // ─── Trade History ─────────────────────────────────────────────────
  router.get('/trades', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    res.json(executor.getTradeHistory(limit));
  });

  // ─── Pending Orders ────────────────────────────────────────────────
  router.get('/orders/pending', (req, res) => {
    const pending = executor.getPendingOrders ? executor.getPendingOrders() : [];
    res.json(pending);
  });

  router.delete('/orders/:orderId', (req, res) => {
    if (!executor.cancelOrder) return res.status(501).json({ error: 'Not available' });
    const result = executor.cancelOrder(req.params.orderId);
    if (!result) return res.status(404).json({ error: 'Order not found' });
    res.json(result);
  });

  // ─── Paper Trading ─────────────────────────────────────────────────
  router.get('/paper-trades', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    res.json(paperTrader.getHistory(limit));
  });

  router.get('/paper-trades/performance', (req, res) => {
    res.json(paperTrader.getPerformance());
  });

  router.get('/paper-trades/stats', (req, res) => {
    res.json(paperTrader.getStats());
  });

  router.post('/paper-trades/reset', (req, res) => {
    paperTrader.reset();
    res.json({ status: 'ok', message: 'Paper trade history cleared, bankroll reset to $1000' });
  });

  router.post('/paper-trades/manual', (req, res) => {
    try {
      const { conditionId, market, side, amount, entryPrice } = req.body;
      const trade = paperTrader.placeManualTrade({
        conditionId, market, side,
        amount: parseFloat(amount),
        entryPrice: parseFloat(entryPrice),
      });
      res.json({ status: 'ok', trade });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/paper-trades/bankroll', (req, res) => {
    res.json({
      bankroll: paperTrader.getSimBankroll(),
      stats: paperTrader.getStats(),
    });
  });

  router.post('/paper-trades/bankroll', (req, res) => {
    const { amount } = req.body;
    if (!amount || amount < 0) return res.status(400).json({ error: 'Valid amount required' });
    paperTrader.setSimBankroll(parseFloat(amount));
    res.json({ bankroll: paperTrader.getSimBankroll() });
  });

  return router;
};
