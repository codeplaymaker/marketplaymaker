const express = require('express');
const cors = require('cors');
const config = require('./config');
const log = require('./utils/logger');
const scanner = require('./engine/scanner');
const executor = require('./engine/executor');
const riskManager = require('./engine/riskManager');
const resolver = require('./engine/resolver');
const markets = require('./polymarket/markets');
const client = require('./polymarket/client');
const oddsApi = require('./bookmakers/oddsApi');
const paperTrader = require('./engine/paperTrader');

// Kalshi integration — optional
let kalshiClient = null;
let kalshiMarkets = null;
try {
  kalshiClient = require('./kalshi/client');
  kalshiMarkets = require('./kalshi/markets');
  log.info('SERVER', 'Kalshi modules loaded');
} catch (err) {
  log.warn('SERVER', `Kalshi modules not loaded: ${err.message}`);
}

// New modules — optional
let wsClient = null;
let newsSignal = null;
try { wsClient = require('./polymarket/websocket'); } catch { /* optional */ }
try { newsSignal = require('./data/newsSignal'); } catch { /* optional */ }

const app = express();

// CORS — allow local dev + deployed frontend
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, server-to-server) or matched origins
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(null, true); // Permissive fallback — tighten if needed
  },
  credentials: true,
}));

app.use(express.json());
app.set('etag', false);       // Disable ETags — prevents 304s that break fetch .ok checks

// Auto-load Odds API key from environment variable
if (process.env.ODDS_API_KEY) {
  try {
    oddsApi.setApiKey(process.env.ODDS_API_KEY);
    log.info('SERVER', 'Odds API key loaded from environment');
    // Auto-fetch odds on startup (non-blocking)
    oddsApi.fetchAllOdds().then(events => {
      log.info('SERVER', `Auto-fetched ${events.length} bookmaker events on startup`);
    }).catch(err => log.warn('SERVER', `Auto-fetch odds failed: ${err.message}`));
  } catch (err) {
    log.warn('SERVER', `Failed to set Odds API key: ${err.message}`);
  }
}
app.use((req, res, next) => { // Prevent caching on API responses
  res.set('Cache-Control', 'no-store');
  next();
});

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    log.info('HTTP', `${req.method} ${req.url} → ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// ─── Health ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ─── Bot Control ─────────────────────────────────────────────────────
app.post('/api/bot/start', (req, res) => {
  const { bankroll } = req.body || {};
  scanner.start(bankroll || 1000);
  res.json({ status: 'started', ...scanner.getStatus() });
});

app.post('/api/bot/stop', (req, res) => {
  scanner.stop();
  res.json({ status: 'stopped', ...scanner.getStatus() });
});

app.get('/api/bot/status', (req, res) => {
  res.json({
    scanner: scanner.getStatus(),
    executor: executor.getTradeStats(),
    risk: riskManager.getStats(scanner.getBankroll()),
    mode: executor.getMode(),
  });
});

app.post('/api/bot/mode', (req, res) => {
  const { mode } = req.body;
  try {
    executor.setMode(mode);
    res.json({ mode: executor.getMode() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/bot/bankroll', (req, res) => {
  const { amount } = req.body;
  if (!amount || amount < 0) return res.status(400).json({ error: 'Invalid amount' });
  scanner.setBankroll(amount);
  res.json({ bankroll: scanner.getBankroll() });
});

// ─── Markets ─────────────────────────────────────────────────────────
app.get('/api/markets', async (req, res) => {
  try {
    const { limit = 50, refresh } = req.query;
    if (refresh === 'true') await markets.refreshMarkets();
    const data = markets.getCachedMarkets().slice(0, parseInt(limit));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/markets/top-volume', (req, res) => {
  const n = parseInt(req.query.n) || 20;
  res.json(markets.getTopMarketsByVolume(n));
});

app.get('/api/markets/top-liquidity', (req, res) => {
  const n = parseInt(req.query.n) || 20;
  res.json(markets.getTopMarketsByLiquidity(n));
});

app.get('/api/markets/high-spread', (req, res) => {
  const { min = 0.02, max = 0.15 } = req.query;
  res.json(markets.getHighSpreadMarkets(parseFloat(min), parseFloat(max)));
});

app.get('/api/markets/:slug', async (req, res) => {
  try {
    const market = markets.getMarketBySlug(req.params.slug);
    if (!market) return res.status(404).json({ error: 'Market not found' });
    // Enrich with live CLOB data
    const enriched = await client.enrichMarket(market.raw || market);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Opportunities ───────────────────────────────────────────────────
app.get('/api/opportunities', (req, res) => {
  const { limit = 50, strategy } = req.query;
  const opps = strategy
    ? scanner.getOpportunitiesByStrategy(strategy.toUpperCase())
    : scanner.getOpportunities(parseInt(limit));
  res.json(opps);
});

app.post('/api/opportunities/scan', async (req, res) => {
  try {
    const result = await scanner.scan();
    res.json(result || { scanNumber: 0, marketsScanned: 0, opportunitiesFound: 0, topOpportunities: [], error: 'Scan returned no result' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Execution ───────────────────────────────────────────────────────
app.post('/api/execute', async (req, res) => {
  try {
    const { opportunity } = req.body;
    if (!opportunity) return res.status(400).json({ error: 'Opportunity required' });
    const result = await executor.execute(opportunity, scanner.getBankroll());
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auto-execute', async (req, res) => {
  try {
    const { maxTrades = 3, minScore = 50 } = req.body || {};
    const opps = scanner.getOpportunities(20);
    const results = await executor.autoExecute(opps, scanner.getBankroll(), { maxTrades, minScore });
    res.json({ executed: results.length, trades: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Trade History & Positions ───────────────────────────────────────
app.get('/api/trades', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(executor.getTradeHistory(limit));
});

app.get('/api/positions', (req, res) => {
  res.json(riskManager.getPositions());
});

app.get('/api/risk', (req, res) => {
  res.json(riskManager.getStats(scanner.getBankroll()));
});

// ─── Performance ─────────────────────────────────────────────────────
app.get('/api/performance', (req, res) => {
  const stats = executor.getTradeStats();
  const risk = riskManager.getStats(scanner.getBankroll());

  // Use REAL performance from resolution tracker (not fake Math.random)
  const realPerf = resolver.getRealPerformance();

  res.json({
    ...stats,
    ...risk,
    bankroll: scanner.getBankroll(),
    // Real P&L from resolved markets
    realPnL: realPerf.totalPnL,
    realWinRate: realPerf.winRate,
    realProfitFactor: realPerf.profitFactor,
    resolvedCount: realPerf.totalResolved,
    pnlCurve: realPerf.pnlCurve,
    byStrategy: realPerf.byStrategy,
    // Pending positions (not yet resolved)
    pendingPositions: riskManager.getPositions().length,
  });
});

// ─── Reset ───────────────────────────────────────────────────────────
app.post('/api/reset', (req, res) => {
  scanner.stop();
  executor.reset();
  riskManager.reset();
  res.json({ status: 'reset', message: 'All systems reset' });
});

// ─── Pending Orders ──────────────────────────────────────────────────
app.get('/api/orders/pending', (req, res) => {
  const pending = executor.getPendingOrders ? executor.getPendingOrders() : [];
  res.json(pending);
});

app.delete('/api/orders/:orderId', (req, res) => {
  if (!executor.cancelOrder) return res.status(501).json({ error: 'Not available' });
  const result = executor.cancelOrder(req.params.orderId);
  if (!result) return res.status(404).json({ error: 'Order not found' });
  res.json(result);
});

// ─── WebSocket Status ────────────────────────────────────────────────
app.get('/api/ws/status', (req, res) => {
  if (!wsClient) return res.json({ available: false, reason: 'WebSocket module not loaded' });
  res.json(wsClient.getStatus());
});

// ─── News Sentiment ──────────────────────────────────────────────────
app.get('/api/news/status', (req, res) => {
  if (!newsSignal) return res.json({ available: false, reason: 'News module not loaded' });
  try {
    const status = newsSignal.getStatus ? newsSignal.getStatus() : { available: true };
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/news/key', (req, res) => {
  if (!newsSignal) return res.status(501).json({ error: 'News module not loaded' });
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'API key required' });
  try {
    if (newsSignal.setApiKey) newsSignal.setApiKey(key);
    else process.env.NEWSDATA_API_KEY = key;
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Calibration & Learning ─────────────────────────────────────────
app.get('/api/calibration', (req, res) => {
  try {
    const insights = resolver.getCalibrationInsights
      ? resolver.getCalibrationInsights()
      : { status: 'Not available' };
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Portfolio Risk Heatmap ──────────────────────────────────────────
app.get('/api/risk/heatmap', (req, res) => {
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
// ─── Bookmaker Odds API ──────────────────────────────────────────
app.post('/api/odds/key', (req, res) => {
  try {
    const { key } = req.body;
    oddsApi.setApiKey(key);
    res.json({ status: 'ok', ...oddsApi.getStatus() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/odds/status', (req, res) => {
  res.json(oddsApi.getStatus());
});

app.post('/api/odds/fetch', async (req, res) => {
  try {
    const events = await oddsApi.fetchAllOdds();
    // Match against current Polymarket markets
    const mktList = markets.getCachedMarkets();
    const matches = oddsApi.matchAllMarkets(mktList);
    const matchArr = Array.from(matches.entries()).map(([condId, data]) => ({ conditionId: condId, ...data }));
    res.json({
      status: 'ok',
      bookmakerEvents: events.length,
      polymarketMatches: matchArr.length,
      matches: matchArr.sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence)).slice(0, 20),
      ...oddsApi.getStatus(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/odds/sports', async (req, res) => {
  const sports = await oddsApi.getSports();
  res.json(sports);
});

// ─── Paper Trade Tracking ────────────────────────────────────────────
app.get('/api/paper-trades', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(paperTrader.getHistory(limit));
});

app.get('/api/paper-trades/performance', (req, res) => {
  res.json(paperTrader.getPerformance());
});

app.get('/api/paper-trades/stats', (req, res) => {
  res.json(paperTrader.getStats());
});

app.post('/api/paper-trades/reset', (req, res) => {
  paperTrader.reset();
  res.json({ status: 'ok', message: 'Paper trade history cleared' });
});

// ─── Self-Learning Dashboard ─────────────────────────────────────────
app.get('/api/learning/insights', (req, res) => {
  try {
    const insights = paperTrader.getLearningInsights
      ? paperTrader.getLearningInsights()
      : { status: 'Not available' };
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/learning/thresholds', (req, res) => {
  try {
    const strategies = ['NO_BETS', 'SPORTS_EDGE', 'ICT', 'ARBITRAGE'];
    const thresholds = {};
    for (const s of strategies) {
      const t = paperTrader.getLearnedThreshold ? paperTrader.getLearnedThreshold(s) : null;
      thresholds[s] = t || { status: 'Insufficient data (need 10+ resolved trades)' };
    }
    res.json(thresholds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/learning/cycle', (req, res) => {
  try {
    if (!paperTrader.runLearningCycle) {
      return res.status(501).json({ error: 'Learning cycle not available' });
    }
    paperTrader.runLearningCycle();
    const insights = paperTrader.getLearningInsights();
    res.json({ status: 'ok', message: 'Learning cycle executed', insights });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/learning/signals', (req, res) => {
  try {
    const insights = paperTrader.getLearningInsights
      ? paperTrader.getLearningInsights()
      : {};
    res.json({
      signalAccuracy: insights.signalAccuracy || {},
      topSignals: insights.topSignals || [],
      weakSignals: insights.weakSignals || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Kalshi Markets ──────────────────────────────────────────────────
app.get('/api/kalshi/status', (req, res) => {
  if (!kalshiClient) return res.json({ available: false, reason: 'Kalshi module not loaded' });
  const cached = kalshiMarkets ? kalshiMarkets.getCachedMarkets() : [];
  res.json({
    available: true,
    enabled: config.kalshi?.enabled !== false,
    cachedMarkets: cached.length,
  });
});

app.get('/api/kalshi/markets', async (req, res) => {
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

app.get('/api/kalshi/markets/top-volume', (req, res) => {
  if (!kalshiMarkets) return res.status(501).json({ error: 'Kalshi module not loaded' });
  const n = parseInt(req.query.n) || 20;
  res.json(kalshiMarkets.getTopMarketsByVolume(n));
});

app.get('/api/kalshi/markets/:ticker', async (req, res) => {
  if (!kalshiClient) return res.status(501).json({ error: 'Kalshi module not loaded' });
  try {
    const market = await kalshiClient.getMarket(req.params.ticker);
    if (!market) return res.status(404).json({ error: 'Market not found' });
    res.json(kalshiClient.normalizeMarket(market));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/kalshi/orderbook/:ticker', async (req, res) => {
  if (!kalshiClient) return res.status(501).json({ error: 'Kalshi module not loaded' });
  try {
    const ob = await kalshiClient.getOrderbook(req.params.ticker);
    res.json(ob);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/kalshi/toggle', (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled (boolean) required' });
  if (!config.kalshi) config.kalshi = {};
  config.kalshi.enabled = enabled;
  res.json({ enabled: config.kalshi.enabled });
});


// ─── Start Server ────────────────────────────────────────────────────
const PORT = config.PORT;

app.listen(PORT, () => {
  log.info('SERVER', `🤖 Polymarket Bot API running on http://localhost:${PORT}`);
  log.info('SERVER', `   📊 Dashboard: http://localhost:3000/polymarket`);
  log.info('SERVER', `   🔍 Markets:   http://localhost:${PORT}/api/markets`);
  log.info('SERVER', `   🎯 Opps:      http://localhost:${PORT}/api/opportunities`);
  log.info('SERVER', `   📈 Status:    http://localhost:${PORT}/api/bot/status`);
});
