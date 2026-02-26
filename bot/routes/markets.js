const express = require('express');

/**
 * Markets & Opportunities routes
 *
 * Expected deps:
 *   markets, client, scanner, executor,
 *   kalshiClient (optional), kalshiMarkets (optional), config
 */
module.exports = function createMarketsRoutes(deps) {
  const router = express.Router();
  const {
    markets, client, scanner, executor,
    kalshiClient, kalshiMarkets, config,
  } = deps;

  // ─── Markets ─────────────────────────────────────────────────────────
  router.get('/markets', async (req, res) => {
    try {
      const { limit = 50, refresh } = req.query;
      if (refresh === 'true') await markets.refreshMarkets();
      const data = markets.getCachedMarkets().slice(0, parseInt(limit));
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/markets/top-volume', (req, res) => {
    const n = parseInt(req.query.n) || 20;
    res.json(markets.getTopMarketsByVolume(n));
  });

  router.get('/markets/top-liquidity', (req, res) => {
    const n = parseInt(req.query.n) || 20;
    res.json(markets.getTopMarketsByLiquidity(n));
  });

  router.get('/markets/high-spread', (req, res) => {
    const { min = 0.02, max = 0.15 } = req.query;
    res.json(markets.getHighSpreadMarkets(parseFloat(min), parseFloat(max)));
  });

  router.get('/markets/:slug', async (req, res) => {
    try {
      const market = markets.getMarketBySlug(req.params.slug);
      if (!market) return res.status(404).json({ error: 'Market not found' });
      const enriched = await client.enrichMarket(market.raw || market);
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Opportunities ───────────────────────────────────────────────────
  router.get('/opportunities', (req, res) => {
    const { limit = 50, strategy } = req.query;
    const opps = strategy
      ? scanner.getOpportunitiesByStrategy(strategy.toUpperCase())
      : scanner.getOpportunities(parseInt(limit));
    res.json(opps);
  });

  router.post('/opportunities/scan', async (req, res) => {
    try {
      const result = await scanner.scan();
      res.json(result || { scanNumber: 0, marketsScanned: 0, opportunitiesFound: 0, topOpportunities: [], error: 'Scan returned no result' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Execution ───────────────────────────────────────────────────────
  router.post('/execute', async (req, res) => {
    try {
      const { opportunity } = req.body;
      if (!opportunity) return res.status(400).json({ error: 'Opportunity required' });
      const result = await executor.execute(opportunity, scanner.getBankroll());
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/auto-execute', async (req, res) => {
    try {
      const { maxTrades = 3, minScore = 50 } = req.body || {};
      const opps = scanner.getOpportunities(20);
      const results = await executor.autoExecute(opps, scanner.getBankroll(), { maxTrades, minScore });
      res.json({ executed: results.length, trades: results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Kalshi Markets ──────────────────────────────────────────────────
  router.get('/kalshi/status', (req, res) => {
    if (!kalshiClient) return res.json({ available: false, reason: 'Kalshi module not loaded' });
    const cached = kalshiMarkets ? kalshiMarkets.getCachedMarkets() : [];
    res.json({
      available: true,
      enabled: config.kalshi?.enabled !== false,
      cachedMarkets: cached.length,
    });
  });

  router.get('/kalshi/markets', async (req, res) => {
    if (!kalshiMarkets) return res.status(501).json({ error: 'Kalshi module not loaded' });
    try {
      const { limit = 50, refresh } = req.query;
      if (refresh === 'true') await kalshiMarkets.refreshMarkets();
      const data = kalshiMarkets.getCachedMarkets().slice(0, parseInt(limit));
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/kalshi/markets/top-volume', (req, res) => {
    if (!kalshiMarkets) return res.status(501).json({ error: 'Kalshi module not loaded' });
    const n = parseInt(req.query.n) || 20;
    res.json(kalshiMarkets.getTopMarketsByVolume(n));
  });

  router.get('/kalshi/markets/:ticker', async (req, res) => {
    if (!kalshiClient) return res.status(501).json({ error: 'Kalshi module not loaded' });
    try {
      const market = await kalshiClient.getMarket(req.params.ticker);
      if (!market) return res.status(404).json({ error: 'Market not found' });
      res.json(kalshiClient.normalizeMarket(market));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/kalshi/orderbook/:ticker', async (req, res) => {
    if (!kalshiClient) return res.status(501).json({ error: 'Kalshi module not loaded' });
    try {
      const ob = await kalshiClient.getOrderbook(req.params.ticker);
      res.json(ob);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/kalshi/toggle', (req, res) => {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled (boolean) required' });
    if (!config.kalshi) config.kalshi = {};
    config.kalshi.enabled = enabled;
    res.json({ enabled: config.kalshi.enabled });
  });

  return router;
};
