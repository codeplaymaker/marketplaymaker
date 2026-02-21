const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
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

// Intelligence platform modules
const { authMiddleware, getKey, regenerateKey } = require('./utils/auth');
const alerts = require('./engine/alerts');
const watchlist = require('./engine/watchlist');
const signalTracker = require('./engine/signalTracker');

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

let independentSignals = null;
try { independentSignals = require('./data/independentSignals'); } catch { /* optional */ }

let edgeResolver = null;
try { edgeResolver = require('./engine/edgeResolver'); } catch { /* optional */ }

let accaBuilder = null;
try { accaBuilder = require('./strategies/accaBuilder'); } catch { /* optional */ }

let picksTracker = null;
try { picksTracker = require('./engine/picksTracker'); } catch { /* optional */ }

let picksLearner = null;
try { picksLearner = require('./engine/picksLearner'); } catch { /* optional */ }

const app = express();

// ─── Process Stability ─────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  log.error('CRASH', `Uncaught exception: ${err.message}`);
  log.error('CRASH', err.stack);
  // Don't exit — keep serving. Log and continue.
});
process.on('unhandledRejection', (reason) => {
  log.error('CRASH', `Unhandled rejection: ${reason}`);
});

// ─── Auto-Scanner State ──────────────────────────────────────────────
const SCAN_CACHE_FILE = path.join(__dirname, 'logs/scan-cache.json');
let cachedScanResults = [];
let lastScanTime = null;
let scanRunning = false;
const SCAN_INTERVAL = 15 * 60 * 1000; // 15 minutes
const SCAN_MARKETS = 30;

// Load cached scan results from disk on startup
try {
  if (fs.existsSync(SCAN_CACHE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(SCAN_CACHE_FILE, 'utf8'));
    cachedScanResults = saved.results || [];
    lastScanTime = saved.timestamp ? new Date(saved.timestamp) : null;
    log.info('SCANNER', `Loaded ${cachedScanResults.length} cached edges from disk (${lastScanTime ? lastScanTime.toLocaleTimeString() : 'unknown'})`);
  }
} catch { /* fresh start */ }

/**
 * Run a full batch scan in the background.
 * Results are cached in memory + disk for instant serving.
 */
async function runAutoScan() {
  if (scanRunning) {
    log.info('SCANNER', 'Scan already in progress, skipping');
    return;
  }
  if (!independentSignals) {
    log.warn('SCANNER', 'Independent signals module not loaded, skipping scan');
    return;
  }

  const allMarkets = markets.getCachedMarkets();
  if (allMarkets.length === 0) {
    log.warn('SCANNER', 'No markets cached yet, will retry next cycle');
    return;
  }

  scanRunning = true;
  const startTime = Date.now();
  log.info('SCANNER', `Auto-scan starting: ${allMarkets.length} markets available, analyzing top ${SCAN_MARKETS}...`);

  try {
    const results = await independentSignals.batchAnalyze(allMarkets, { maxMarkets: SCAN_MARKETS });

    const entries = [];
    for (const [condId, signal] of results) {
      entries.push({ conditionId: condId, ...signal });
    }

    // Sort by divergence (best edges first)
    entries.sort((a, b) => (b.absDivergence || 0) - (a.absDivergence || 0));

    // Cache results
    cachedScanResults = entries;
    lastScanTime = new Date();

    // Persist to disk
    try {
      fs.writeFileSync(SCAN_CACHE_FILE, JSON.stringify({
        results: entries,
        timestamp: lastScanTime.toISOString(),
        marketCount: allMarkets.length,
        scanDuration: Date.now() - startTime,
      }, null, 2));
    } catch { /* non-critical */ }

    // Record edges for resolution tracking
    if (edgeResolver) {
      for (const e of entries) {
        if ((e.edgeSignal === 'STRONG' || e.edgeSignal === 'MODERATE') && (e.sourceCount || 0) >= 1) {
          edgeResolver.recordEdge(e);
        }
      }
    }

    // Fire webhook alerts for A-grade STRONG edges
    const strongEdges = entries.filter(e => e.edgeSignal === 'STRONG' && (e.edgeQuality || 0) >= 55);
    if (strongEdges.length > 0) {
      fireWebhookAlerts(strongEdges).catch(() => {});
    }

    const aCount = entries.filter(e => (e.edgeQuality || 0) >= 75).length;
    const bCount = entries.filter(e => (e.edgeQuality || 0) >= 55 && (e.edgeQuality || 0) < 75).length;
    const edgeCount = entries.filter(e => e.edgeSignal === 'STRONG' || e.edgeSignal === 'MODERATE').length;
    log.info('SCANNER', `Auto-scan complete: ${entries.length} analyzed, A=${aCount} B=${bCount}, ${edgeCount} edges (${((Date.now() - startTime) / 1000).toFixed(1)}s)`);

  } catch (err) {
    log.error('SCANNER', `Auto-scan failed: ${err.message}`);
  } finally {
    scanRunning = false;
  }
}

// CORS — allow local dev + deployed frontend
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, server-to-server) or matched origins
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    // In production, reject unknown origins. In dev, allow all.
    if (process.env.NODE_ENV === 'production') {
      return cb(new Error(`Origin ${origin} not allowed`), false);
    }
    cb(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.set('etag', false);       // Disable ETags — prevents 304s that break fetch .ok checks

// ─── Rate Limiting (in-memory) ───────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 600;      // 600 requests per minute per IP (generous for localhost + frontend polling)

function rateLimit(req, res, next) {
  // Skip rate limiting for health checks
  if (req.path === '/api/health') return next();

  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  let record = rateLimitMap.get(ip);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
    record = { windowStart: now, count: 0 };
    rateLimitMap.set(ip, record);
  }

  record.count++;
  res.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  res.set('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_MAX - record.count)));

  if (record.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: Math.ceil((record.windowStart + RATE_LIMIT_WINDOW - now) / 1000) });
  }
  next();
}

// Clean up rate limit map every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap) {
    if (now - record.windowStart > RATE_LIMIT_WINDOW * 2) rateLimitMap.delete(ip);
  }
}, 300000);

app.use(rateLimit);

// Auto-load Odds API key from environment variable
if (process.env.ODDS_API_KEY) {
  try {
    oddsApi.setApiKey(process.env.ODDS_API_KEY);
    log.info('SERVER', 'Odds API key loaded from environment');
    // Auto-fetch odds on startup (non-blocking)
    oddsApi.fetchAllOdds().then(events => {
      log.info('SERVER', `Auto-fetched ${events.length} bookmaker events on startup`);
    }).catch(err => log.warn('SERVER', `Auto-fetch odds failed: ${err.message}`));
    // Auto-refresh odds every 30 minutes
    setInterval(() => {
      oddsApi.fetchAllOdds().catch(() => {});
    }, 30 * 60 * 1000);
  } catch (err) {
    log.warn('SERVER', `Failed to set Odds API key: ${err.message}`);
  }
}

// Auto-load LLM API key from environment variable
if (process.env.OPENAI_API_KEY && independentSignals) {
  try {
    independentSignals.llm.configure({
      apiKey: process.env.OPENAI_API_KEY,
      provider: process.env.LLM_PROVIDER || 'openai',
      model: process.env.LLM_MODEL || undefined,
    });
    log.info('SERVER', `LLM configured from env: provider=${process.env.LLM_PROVIDER || 'openai'}`);
  } catch (err) {
    log.warn('SERVER', `Failed to configure LLM: ${err.message}`);
  }
}

// Auto-fetch Polymarket markets on startup (non-blocking)
markets.refreshMarkets().then(mktList => {
  log.info('SERVER', `Auto-fetched ${mktList.length} Polymarket markets on startup`);
}).catch(err => log.warn('SERVER', `Auto-fetch markets failed: ${err.message}`));

// Auto-refresh Polymarket markets every 15 minutes
setInterval(() => {
  markets.refreshMarkets().catch(() => {});
}, 15 * 60 * 1000);

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

// API Key Authentication — protects all routes except /api/health and /api/auth/*
app.use(authMiddleware);

// ─── Health ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ─── Auth ────────────────────────────────────────────────────────────
app.get('/api/auth/key', (req, res) => {
  res.json({ key: getKey() });
});

app.post('/api/auth/verify', (req, res) => {
  res.json({ valid: true });
});

app.post('/api/auth/regenerate', (req, res) => {
  const key = regenerateKey();
  res.json({ key });
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

// ─── Accumulator (Parlay) Builder ────────────────────────────────────
app.post('/api/accas/build', async (req, res) => {
  if (!accaBuilder) return res.status(503).json({ error: 'Acca builder not available' });
  try {
    const { maxLegs, minLegs } = req.body || {};
    const accas = accaBuilder.buildAccas(maxLegs || 5, minLegs || 2);
    const result = accaBuilder.getAccas();
    // Snapshot picks for track record
    if (picksTracker && result.accas?.length > 0) {
      picksTracker.snapshotAccas(result.accas);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/accas', (req, res) => {
  if (!accaBuilder) return res.json({ accas: [], stats: { total: 0 }, lastBuildTime: null });
  res.json(accaBuilder.getAccas());
});

app.get('/api/accas/top', (req, res) => {
  if (!accaBuilder) return res.json([]);
  const limit = parseInt(req.query.limit) || 10;
  res.json(accaBuilder.getTopAccas(limit));
});

// Public acca endpoint (no auth required)
app.get('/api/public/accas', (req, res) => {
  if (!accaBuilder) return res.json({ accas: [], stats: { total: 0 }, lastBuildTime: null });
  const data = accaBuilder.getAccas();
  // Sanitize: remove bookmaker keys, just show picks and odds
  const publicAccas = (data.accas || []).slice(0, 5).map(a => ({
    grade: a.grade,
    numLegs: a.numLegs,
    combinedOdds: a.combinedOdds,
    evPercent: a.evPercent,
    crossSport: a.crossSport,
    legs: a.legs.map(l => ({
      match: l.match,
      pick: l.pick,
      odds: l.odds,
      sport: l.sport,
      betType: l.betType,
    })),
    hypothetical: a.hypothetical,
    generatedAt: a.generatedAt,
  }));
  res.json({ accas: publicAccas, stats: data.stats, lastBuildTime: data.lastBuildTime });
});

// ─── CLV Analysis Endpoint ───────────────────────────────────────────
app.get('/api/accas/clv', (req, res) => {
  if (!accaBuilder) return res.status(503).json({ error: 'Acca builder not available' });
  try {
    const clv = accaBuilder.analyzeCLV();
    res.json(clv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Line Movement Endpoint ──────────────────────────────────────────
app.get('/api/accas/movements', (req, res) => {
  if (!accaBuilder) return res.status(503).json({ error: 'Acca builder not available' });
  try {
    const data = accaBuilder.getAccas();
    const movements = data.stats?.lineMovements || 0;
    const steamMoves = data.stats?.steamMoves || 0;
    // Also read line-history.json for detailed movements
    let lineHistory = {};
    try {
      lineHistory = JSON.parse(fs.readFileSync(path.join(__dirname, 'logs', 'line-history.json'), 'utf-8'));
    } catch { /* no history yet */ }
    const recentMoves = Object.entries(lineHistory)
      .map(([key, snapshots]) => ({ key, snapshots: snapshots.slice(-5), count: snapshots.length }))
      .filter(m => m.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    res.json({ movements, steamMoves, recentMoves });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Picks Track Record ──────────────────────────────────────────────
app.get('/api/picks/track-record', (req, res) => {
  if (!picksTracker) return res.json({ summary: { totalPicks: 0 }, recent: [], byGrade: {}, dailyPnl: [] });
  res.json(picksTracker.getTrackRecord());
});

app.get('/api/picks/history', (req, res) => {
  if (!picksTracker) return res.json({ picks: [], total: 0, page: 1, totalPages: 0 });
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  res.json(picksTracker.getHistory(page, limit));
});

app.post('/api/picks/resolve', async (req, res) => {
  if (!picksTracker) return res.status(503).json({ error: 'Picks tracker not available' });
  try {
    const apiKey = oddsApi.hasApiKey() ? process.env.ODDS_API_KEY : null;
    const result = await picksTracker.checkAndResolve(apiKey);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/public/picks/track-record', (req, res) => {
  if (!picksTracker) return res.json({ summary: { totalPicks: 0 }, recent: [], byGrade: {}, dailyPnl: [] });
  const record = picksTracker.getTrackRecord();
  // Sanitize for public: limit recent to 10, remove internal IDs
  record.recent = record.recent.slice(0, 10).map(p => ({
    grade: p.grade, numLegs: p.numLegs, combinedOdds: p.combinedOdds,
    result: p.result, pnl: p.pnl, savedAt: p.savedAt, wonLegs: p.wonLegs,
    legs: p.legs.map(l => ({ match: l.match, pick: l.pick, sport: l.sport, result: l.result, score: l.score })),
  }));
  res.json(record);
});

// ─── Picks Learning / Intelligence ──────────────────────────────────
app.get('/api/picks/learning', (req, res) => {
  if (!picksLearner) return res.json({ learnedAt: null, totalResolved: 0, adjustments: null, insights: ['Learning engine not available'] });
  const report = picksLearner.getLearningReport();
  res.json(report);
});

app.post('/api/picks/learn', (req, res) => {
  if (!picksLearner) return res.status(503).json({ error: 'Learning engine not available' });
  const result = picksLearner.learn();
  if (!result) return res.json({ success: false, message: 'Not enough resolved picks to learn from' });
  res.json({ success: true, totalResolved: result.totalResolved, insights: result.insights });
});

app.get('/api/public/picks/learning', (req, res) => {
  if (!picksLearner) return res.json({ insights: [], adjustments: null });
  const report = picksLearner.getLearningReport();
  // Sanitized public version
  res.json({
    totalResolved: report.totalResolved || 0,
    overallWinRate: report.overallWinRate || 0,
    overallROI: report.overallROI || 0,
    insights: report.insights || [],
    learnedAt: report.learnedAt,
  });
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
  res.json({ status: 'ok', message: 'Paper trade history cleared, bankroll reset to $1000' });
});

app.post('/api/paper-trades/manual', (req, res) => {
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

app.get('/api/paper-trades/bankroll', (req, res) => {
  res.json({
    bankroll: paperTrader.getSimBankroll(),
    stats: paperTrader.getStats(),
  });
});

app.post('/api/paper-trades/bankroll', (req, res) => {
  const { amount } = req.body;
  if (!amount || amount < 0) return res.status(400).json({ error: 'Valid amount required' });
  paperTrader.setSimBankroll(parseFloat(amount));
  res.json({ bankroll: paperTrader.getSimBankroll() });
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
    const strategies = ['NO_BETS', 'SPORTS_EDGE', 'ARBITRAGE'];
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

// ─── Intelligence: Alerts ────────────────────────────────────────────
app.get('/api/intel/alerts', (req, res) => {
  res.json({ alerts: alerts.getAlerts(), history: alerts.getAlertHistory(parseInt(req.query.limit) || 50) });
});

app.post('/api/intel/alerts', (req, res) => {
  try {
    const alert = alerts.createAlert(req.body);
    res.json(alert);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/intel/alerts/:alertId', (req, res) => {
  const removed = alerts.deleteAlert(req.params.alertId);
  if (!removed) return res.status(404).json({ error: 'Alert not found' });
  res.json(removed);
});

app.delete('/api/intel/alerts-history', (req, res) => {
  alerts.clearHistory();
  res.json({ status: 'ok' });
});

// ─── Intelligence: Watchlist ─────────────────────────────────────────
app.get('/api/intel/watchlist', (req, res) => {
  const currentMarkets = markets.getCachedMarkets();
  const opps = scanner.getOpportunities(500);
  res.json(watchlist.getEnriched(currentMarkets, opps));
});

app.post('/api/intel/watchlist', (req, res) => {
  try {
    const result = watchlist.add(req.body, req.body.notes);
    if (result.error) return res.status(409).json(result);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/intel/watchlist/:conditionId', (req, res) => {
  const removed = watchlist.remove(req.params.conditionId);
  if (!removed) return res.status(404).json({ error: 'Not in watchlist' });
  res.json(removed);
});

app.patch('/api/intel/watchlist/:conditionId/notes', (req, res) => {
  const updated = watchlist.updateNotes(req.params.conditionId, req.body.notes);
  if (!updated) return res.status(404).json({ error: 'Not in watchlist' });
  res.json(updated);
});

// ─── Intelligence: Market Movers ─────────────────────────────────────
app.get('/api/intel/movers', (req, res) => {
  const currentMarkets = markets.getCachedMarkets();
  const limit = parseInt(req.query.limit) || 10;
  res.json(alerts.getMarketMovers(currentMarkets, limit));
});

// ─── Intelligence: Signal Credibility ────────────────────────────────
app.get('/api/intel/credibility', (req, res) => {
  res.json(signalTracker.getReport());
});

// ─── Intelligence: Cross-Platform Divergences ────────────────────────
app.get('/api/intel/divergences', (req, res) => {
  try {
    const mktList = markets.getCachedMarkets();
    const matches = oddsApi.matchAllMarkets(mktList);
    const divergences = Array.from(matches.entries())
      .map(([condId, data]) => ({ conditionId: condId, ...data }))
      .filter(d => Math.abs(d.divergence || 0) >= 0.03)
      .sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence));

    res.json({
      count: divergences.length,
      divergences,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Intelligence: Market Comparison ─────────────────────────────────
app.get('/api/intel/compare/:conditionId', (req, res) => {
  try {
    const condId = req.params.conditionId;
    const polyMarket = markets.getCachedMarkets().find(m => m.conditionId === condId);
    const kalshiMkt = kalshiMarkets ? kalshiMarkets.getCachedMarkets().find(m => m.conditionId === condId) : null;
    const bookmaker = oddsApi.matchAllMarkets(markets.getCachedMarkets()).get(condId);
    const signals = scanner.getOpportunities(500).filter(o => o.conditionId === condId);

    const badge = signals.length > 0 ? signalTracker.getBadge(signals[0].strategy, signals[0].score) : null;

    res.json({
      conditionId: condId,
      polymarket: polyMarket || null,
      kalshi: kalshiMkt || null,
      bookmaker: bookmaker || null,
      signals,
      credibilityBadge: badge,
      watched: watchlist.isWatched(condId),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Independent Data Sources ────────────────────────────────────────

// Status of all independent sources
app.get('/api/intel/independent/status', (req, res) => {
  if (!independentSignals) return res.json({ available: false });
  res.json(independentSignals.getStatus());
});

// Configure LLM analysis provider
app.post('/api/intel/independent/llm/configure', (req, res) => {
  if (!independentSignals) return res.status(503).json({ error: 'Independent signals module not loaded' });
  try {
    const { apiKey, provider, model } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'apiKey required' });
    independentSignals.llm.configure({ apiKey, provider, model });
    res.json({ status: 'configured', provider: provider || 'openai', model });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get LLM analysis status + cost tracking
app.get('/api/intel/independent/llm/status', (req, res) => {
  if (!independentSignals) return res.json({ available: false });
  res.json(independentSignals.llm.getStatus());
});

// Get recent edge opportunities — serves cached auto-scan results instantly
app.get('/api/intel/independent/edges', (req, res) => {
  if (!independentSignals) return res.json({ edges: [], available: false });
  const limit = parseInt(req.query.limit) || 20;
  const minQuality = parseInt(req.query.minQuality) || 0;

  // Prefer cached auto-scan results (instant response)
  let edges = cachedScanResults.length > 0
    ? cachedScanResults.filter(e => e.edgeSignal === 'STRONG' || e.edgeSignal === 'MODERATE')
    : independentSignals.getRecentEdges(limit * 2);

  // Filter by quality if requested
  if (minQuality > 0) {
    edges = edges.filter(e => (e.edgeQuality || 0) >= minQuality);
  }

  res.json({
    edges: edges.slice(0, limit),
    calibration: independentSignals.getCalibrationData(),
    lastScan: lastScanTime ? lastScanTime.toISOString() : null,
    nextScan: lastScanTime ? new Date(lastScanTime.getTime() + SCAN_INTERVAL).toISOString() : null,
    scanRunning,
  });
});

// Get ALL cached scan results (not just edges — includes full analysis)
app.get('/api/intel/independent/cached', (req, res) => {
  const minQuality = parseInt(req.query.minQuality) || 0;
  let results = [...cachedScanResults];
  if (minQuality > 0) {
    results = results.filter(e => (e.edgeQuality || 0) >= minQuality);
  }
  res.json({
    count: results.length,
    results,
    lastScan: lastScanTime ? lastScanTime.toISOString() : null,
    nextScan: lastScanTime ? new Date(lastScanTime.getTime() + SCAN_INTERVAL).toISOString() : null,
    scanRunning,
    totalCached: cachedScanResults.length,
  });
});

// Manually trigger a scan (returns immediately, scan runs in background)
app.post('/api/intel/independent/scan', (req, res) => {
  if (scanRunning) return res.json({ status: 'already_running', lastScan: lastScanTime?.toISOString() });
  runAutoScan().catch(() => {});
  res.json({ status: 'started', lastScan: lastScanTime?.toISOString() });
});

// Scanner status
app.get('/api/intel/independent/scanner', (req, res) => {
  res.json({
    running: scanRunning,
    lastScan: lastScanTime ? lastScanTime.toISOString() : null,
    nextScan: lastScanTime ? new Date(lastScanTime.getTime() + SCAN_INTERVAL).toISOString() : null,
    cachedResults: cachedScanResults.length,
    interval: SCAN_INTERVAL / 1000 + 's',
    edgeCount: cachedScanResults.filter(e => e.edgeSignal === 'STRONG' || e.edgeSignal === 'MODERATE').length,
    aGrade: cachedScanResults.filter(e => (e.edgeQuality || 0) >= 75).length,
    bGrade: cachedScanResults.filter(e => (e.edgeQuality || 0) >= 55 && (e.edgeQuality || 0) < 75).length,
  });
});

// Analyze a specific market with all independent sources
app.get('/api/intel/independent/:conditionId', async (req, res) => {
  if (!independentSignals) return res.status(503).json({ error: 'Independent signals module not loaded' });
  try {
    const condId = req.params.conditionId;
    const market = markets.getCachedMarkets().find(m => m.conditionId === condId);
    if (!market) return res.status(404).json({ error: 'Market not found' });

    const signal = await independentSignals.getIndependentSignal(market);
    res.json(signal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger LLM analysis for a specific market
app.post('/api/intel/independent/llm/analyze', async (req, res) => {
  if (!independentSignals) return res.status(503).json({ error: 'Independent signals module not loaded' });
  try {
    const { conditionId, headlines } = req.body;
    if (!conditionId) return res.status(400).json({ error: 'conditionId required' });

    const market = markets.getCachedMarkets().find(m => m.conditionId === conditionId);
    if (!market) return res.status(404).json({ error: 'Market not found' });

    const result = await independentSignals.llm.analyzeMarket(market, headlines || []);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch analyze top markets
app.post('/api/intel/independent/batch', async (req, res) => {
  if (!independentSignals) return res.status(503).json({ error: 'Independent signals module not loaded' });
  try {
    const body = req.body || {};
    const maxMarkets = body.maxMarkets || body.count || 10;
    const skipLLM = body.skipLLM || false;
    const allMarkets = markets.getCachedMarkets();
    const results = await independentSignals.batchAnalyze(allMarkets, { maxMarkets, skipLLM });

    const entries = [];
    for (const [condId, signal] of results) {
      entries.push({ conditionId: condId, ...signal });
    }

    // Record ALL edges with real divergence for resolution tracking
    // Track everything with 2+ sources — builds track record fast from sports
    if (edgeResolver) {
      for (const e of entries) {
        if ((e.edgeSignal === 'STRONG' || e.edgeSignal === 'MODERATE') && (e.sourceCount || 0) >= 1) {
          edgeResolver.recordEdge(e);
        }
      }
    }

    // Fire webhook alerts for high-quality STRONG edges
    const strongEdges = entries.filter(e => e.edgeSignal === 'STRONG' && (e.edgeQuality || 0) >= 55);
    if (strongEdges.length > 0) {
      fireWebhookAlerts(strongEdges).catch(() => {});
    }

    res.json({
      count: entries.length,
      results: entries.sort((a, b) => (b.absDivergence || 0) - (a.absDivergence || 0)),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Calibration & Track Record ──────────────────────────────────────

app.get('/api/intel/calibration', (req, res) => {
  if (!independentSignals) return res.json({ available: false });

  const calibration = independentSignals.getCalibrationData();
  const edges = independentSignals.getRecentEdges(200);

  // Compute additional metrics
  const last24h = edges.filter(e => Date.now() - (e.timestamp || 0) < 86400000);
  const last7d = edges.filter(e => Date.now() - (e.timestamp || 0) < 604800000);

  // Quality distribution
  const qualityDist = { A: 0, B: 0, C: 0, D: 0 };
  for (const e of edges) {
    const grade = e.edgeGrade || (e.edgeQuality >= 75 ? 'A' : e.edgeQuality >= 55 ? 'B' : e.edgeQuality >= 35 ? 'C' : 'D');
    qualityDist[grade] = (qualityDist[grade] || 0) + 1;
  }

  // Average edge quality
  const avgQuality = edges.length > 0
    ? Math.round(edges.reduce((sum, e) => sum + (e.edgeQuality || 0), 0) / edges.length)
    : 0;

  // Source hit rates
  const sourceHits = {};
  for (const e of edges) {
    const count = e.sourceCount || e.validatedSourceCount || 0;
    sourceHits[count] = (sourceHits[count] || 0) + 1;
  }

  res.json({
    calibration,
    metrics: {
      totalEdges: edges.length,
      last24h: last24h.length,
      last7d: last7d.length,
      avgQuality,
      qualityDistribution: qualityDist,
      sourceHitRates: sourceHits,
      strongEdges: edges.filter(e => e.edgeSignal === 'STRONG').length,
      moderateEdges: edges.filter(e => e.edgeSignal === 'MODERATE').length,
      highQualityEdges: edges.filter(e => (e.edgeQuality || 0) >= 55).length,
    },
    systemStatus: independentSignals.getStatus(),
  });
});

// ─── Public Track Record (no auth) ───────────────────────────────────
app.get('/api/public/track-record', (req, res) => {
  try {
    const record = edgeResolver ? edgeResolver.getTrackRecord() : null;
    const resFile = path.join(__dirname, 'logs/edge-resolutions.json');
    let allEdges = [];
    try {
      const raw = JSON.parse(fs.readFileSync(resFile, 'utf8'));
      allEdges = raw.resolutions || [];
    } catch { /* empty */ }

    // Build a sanitized public view
    const pending = allEdges.filter(e => !e.resolved);
    const resolved = allEdges.filter(e => e.resolved);

    // Grade distribution of ALL tracked edges
    const gradeDistribution = {};
    for (const e of allEdges) {
      const g = e.edgeGrade || '?';
      if (!gradeDistribution[g]) gradeDistribution[g] = 0;
      gradeDistribution[g]++;
    }

    // Source count distribution
    const sourceCountDist = {};
    for (const e of allEdges) {
      const sc = e.sourceCount || 0;
      const bucket = sc >= 6 ? '6+' : String(sc);
      if (!sourceCountDist[bucket]) sourceCountDist[bucket] = 0;
      sourceCountDist[bucket]++;
    }

    // Active edges (pending) — show questions, grades, divergence ranges
    const activeEdges = pending
      .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
      .map(e => ({
        question: e.question,
        edgeGrade: e.edgeGrade,
        edgeDirection: e.edgeDirection,
        divergence: e.divergence,
        sourceCount: e.sourceCount,
        recordedAt: e.recordedAt,
        marketPrice: e.marketPrice,
        ourProb: e.ourProb,
      }));

    // Resolved edges — full detail
    const resolvedEdges = resolved
      .sort((a, b) => new Date(b.resolvedAt) - new Date(a.resolvedAt))
      .map(e => ({
        question: e.question,
        edgeGrade: e.edgeGrade,
        edgeDirection: e.edgeDirection,
        outcome: e.outcome === 1 ? 'YES' : 'NO',
        pnlPp: e.pnlPp,
        weWereBetter: e.weWereBetter,
        ourProb: e.ourProb,
        marketPrice: e.marketPrice,
        resolvedAt: e.resolvedAt,
        recordedAt: e.recordedAt,
      }));

    // Timeline: edges recorded per day
    const timeline = {};
    for (const e of allEdges) {
      const day = e.recordedAt?.slice(0, 10);
      if (day) {
        if (!timeline[day]) timeline[day] = { recorded: 0, resolved: 0 };
        timeline[day].recorded++;
        if (e.resolved) timeline[day].resolved++;
      }
    }

    res.json({
      summary: record?.summary || { totalEdges: allEdges.length, resolvedEdges: resolved.length, wins: 0, losses: 0, totalPnLpp: 0, pending: pending.length },
      hypothetical: record?.hypothetical || { totalBets: 0, totalReturn: 0, roi: 0 },
      byGrade: record?.byGrade || {},
      gradeDistribution,
      sourceCountDist,
      activeEdges,
      resolvedEdges,
      timeline,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Track record unavailable' });
  }
});

// ─── Track Record & Resolution ───────────────────────────────────────

// Get track record (resolved edges, P&L, accuracy)
app.get('/api/intel/track-record', (req, res) => {
  if (!edgeResolver) return res.json({ available: false, summary: { totalEdges: 0, resolvedEdges: 0, wins: 0, losses: 0, totalPnLpp: 0 }, pending: 0, recent: [], byGrade: {}, hypothetical: { totalBets: 0, totalReturn: 0, roi: 0 } });
  res.json(edgeResolver.getTrackRecord());
});

// Manually trigger resolution check
app.post('/api/intel/check-resolutions', async (req, res) => {
  if (!edgeResolver) return res.status(503).json({ error: 'Edge resolver not loaded' });
  try {
    const result = await edgeResolver.checkResolutions(async (conditionId) => {
      // Try Polymarket first
      const pm = markets.getCachedMarkets().find(m => m.conditionId === conditionId);
      if (pm) return pm;
      // Try Kalshi
      if (kalshiMarkets) {
        const km = kalshiMarkets.getCachedMarkets().find(m => m.conditionId === conditionId);
        if (km) return km;
      }
      return null;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Webhook / Discord Alerts ────────────────────────────────────────

const WEBHOOK_FILE = path.join(__dirname, 'logs/webhook-config.json');
let webhookConfig = { urls: [], enabled: false, minQuality: 55, minEdge: 'STRONG' };
try {
  if (fs.existsSync(WEBHOOK_FILE)) {
    webhookConfig = { ...webhookConfig, ...JSON.parse(fs.readFileSync(WEBHOOK_FILE, 'utf8')) };
    log.info('SERVER', `Loaded webhook config: ${webhookConfig.urls.length} URLs, enabled=${webhookConfig.enabled}`);
  }
} catch { /* fresh start */ }

// Auto-configure Discord from env
if (process.env.DISCORD_WEBHOOK_URL) {
  if (!webhookConfig.urls.includes(process.env.DISCORD_WEBHOOK_URL)) {
    webhookConfig.urls.push(process.env.DISCORD_WEBHOOK_URL);
  }
  webhookConfig.enabled = true;
  log.info('SERVER', `Discord webhook loaded from env: ${process.env.DISCORD_WEBHOOK_URL.slice(0, 50)}...`);
}

function saveWebhookConfig() {
  try { fs.promises.writeFile(WEBHOOK_FILE, JSON.stringify(webhookConfig, null, 2)); } catch { /* ok */ }
}

// Get webhook config
app.get('/api/intel/webhooks', (req, res) => {
  res.json({
    enabled: webhookConfig.enabled,
    urlCount: webhookConfig.urls.length,
    minQuality: webhookConfig.minQuality,
    minEdge: webhookConfig.minEdge,
    hasUrls: webhookConfig.urls.length > 0,
  });
});

// Set webhook config
app.post('/api/intel/webhooks', (req, res) => {
  const { url, enabled, minQuality, minEdge } = req.body;
  if (url) {
    if (!webhookConfig.urls.includes(url)) webhookConfig.urls.push(url);
  }
  if (typeof enabled === 'boolean') webhookConfig.enabled = enabled;
  if (typeof minQuality === 'number') webhookConfig.minQuality = minQuality;
  if (minEdge) webhookConfig.minEdge = minEdge;
  saveWebhookConfig();
  res.json({ status: 'updated', config: { enabled: webhookConfig.enabled, urlCount: webhookConfig.urls.length, minQuality: webhookConfig.minQuality } });
});

// Delete webhook URL
app.delete('/api/intel/webhooks', (req, res) => {
  const { url } = req.body;
  if (url) webhookConfig.urls = webhookConfig.urls.filter(u => u !== url);
  saveWebhookConfig();
  res.json({ status: 'deleted', urlCount: webhookConfig.urls.length });
});

// Fire alerts to all configured webhooks
async function fireWebhookAlerts(edges) {
  if (!webhookConfig.enabled || webhookConfig.urls.length === 0) return;

  const filtered = edges.filter(e =>
    (e.edgeQuality || 0) >= webhookConfig.minQuality &&
    (e.edgeSignal === 'STRONG' || (webhookConfig.minEdge === 'MODERATE' && e.edgeSignal === 'MODERATE'))
  );
  if (filtered.length === 0) return;

  const message = {
    content: `🎯 **Market PlayMaker Edge Alert** — ${filtered.length} high-quality edge${filtered.length > 1 ? 's' : ''} detected`,
    embeds: filtered.slice(0, 5).map(e => ({
      title: e.question || 'Unknown market',
      color: e.edgeSignal === 'STRONG' ? 0x22c55e : 0x6366f1,
      fields: [
        { name: 'Market Price', value: `${((e.marketPrice || 0) * 100).toFixed(0)}%`, inline: true },
        { name: 'Independent Est.', value: `${((e.prob || 0) * 100).toFixed(0)}%`, inline: true },
        { name: 'Edge', value: `${(Math.abs(e.divergence || 0) * 100).toFixed(1)}pp ${e.edgeDirection || ''}`, inline: true },
        { name: 'Quality', value: `${e.edgeQuality || 0}/100 (${e.edgeGrade || '?'})`, inline: true },
        { name: 'Sources', value: `${e.sourceCount || 0} (${e.validatedSourceCount || 0} validated)`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    })),
  };

  for (const url of webhookConfig.urls) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(5000),
      });
      log.info('WEBHOOK', `Alert sent to ${url.slice(0, 40)}... (${filtered.length} edges)`);
    } catch (err) {
      log.warn('WEBHOOK', `Failed to send to ${url.slice(0, 40)}: ${err.message}`);
    }
  }
}

// ─── Debug: Build info endpoint ──────────────────────────────────────
app.get('/api/debug/build', (req, res) => {
  const candidates = [
    path.join(__dirname, '..', 'build'),
    path.join(__dirname, 'build'),
    path.join(process.cwd(), 'build'),
    path.join(process.cwd(), '..', 'build'),
  ];
  const found = candidates.find(p => fs.existsSync(path.join(p, 'index.html')));
  // List files in key directories for debugging
  let rootFiles = [], cwdFiles = [], parentFiles = [];
  try { rootFiles = fs.readdirSync('/app').slice(0, 30); } catch(e) { rootFiles = [e.message]; }
  try { cwdFiles = fs.readdirSync(process.cwd()).slice(0, 30); } catch(e) { cwdFiles = [e.message]; }
  try { parentFiles = fs.readdirSync(path.join(__dirname, '..')).slice(0, 30); } catch(e) { parentFiles = [e.message]; }
  res.json({ candidates, found: found || null, cwd: process.cwd(), dirname: __dirname, rootFiles, cwdFiles, parentFiles });
});

// ─── Production: Serve React Frontend ────────────────────────────────
// Try multiple paths — Railway may flatten structure differently than local dev
const buildCandidates = [
  path.join(__dirname, '..', 'build'),   // local dev: bot/../build
  path.join(__dirname, 'build'),          // Railway: /app/build
  path.join(process.cwd(), 'build'),      // cwd/build
  path.join(process.cwd(), '..', 'build'),// cwd/../build
];
const buildPath = buildCandidates.find(p => fs.existsSync(path.join(p, 'index.html')));
if (buildPath) {
  app.use(express.static(buildPath));
  // Client-side routing: serve index.html for any non-API route
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(buildPath, 'index.html'));
    }
  });
  log.info('SERVER', `Serving React build from ${buildPath}`);
} else {
  log.warn('SERVER', `No React build found at ${buildPath} — frontend will not be served`);
  app.get('/', (req, res) => {
    res.json({ error: 'Frontend not built', buildPath, hint: 'Run npm run build in project root', dirname: __dirname });
  });
}

// ─── Start Server ────────────────────────────────────────────────────
const PORT = config.PORT;

app.listen(PORT, () => {
  log.info('SERVER', `📊 Market PlayMaker Intelligence API running on http://localhost:${PORT}`);
  log.info('SERVER', `   🔑 Auth:      API key authentication ${process.env.AUTH_DISABLED === 'true' ? 'DISABLED' : 'ENABLED'}`);
  log.info('SERVER', `   📊 Dashboard: http://localhost:3000/polymarket`);
  log.info('SERVER', `   🔍 Markets:   http://localhost:${PORT}/api/markets`);
  log.info('SERVER', `   🎯 Signals:   http://localhost:${PORT}/api/opportunities`);
  log.info('SERVER', `   📈 Status:    http://localhost:${PORT}/api/bot/status`);
  log.info('SERVER', `   🔔 Alerts:    http://localhost:${PORT}/api/intel/alerts`);
  log.info('SERVER', `   ⭐ Watchlist: http://localhost:${PORT}/api/intel/watchlist`);
  log.info('SERVER', `   🧠 LLM:       http://localhost:${PORT}/api/intel/independent/llm/status`);
  log.info('SERVER', `   🔬 Sources:   http://localhost:${PORT}/api/intel/independent/status`);
  log.info('SERVER', `   📊 Record:    http://localhost:${PORT}/api/intel/track-record`);
  log.info('SERVER', `   🎯 Picks:     http://localhost:${PORT}/api/picks/track-record`);

  // ─── Start Auto-Scanner ──────────────────────────────────────────
  // Wait for markets to load, then run first scan
  const scanStartDelay = 20000; // 20s after startup for markets to cache
  setTimeout(async () => {
    const mktCount = markets.getCachedMarkets().length;
    if (mktCount > 0) {
      log.info('SCANNER', `Starting initial auto-scan (${mktCount} markets loaded)...`);
      await runAutoScan();
    } else {
      log.warn('SCANNER', 'No markets loaded yet, will start scanning on next interval');
    }
  }, scanStartDelay);

  // Schedule recurring scans every 15 minutes
  setInterval(() => {
    runAutoScan().catch(err => log.error('SCANNER', `Scheduled scan failed: ${err.message}`));
  }, SCAN_INTERVAL);
  log.info('SCANNER', `Auto-scanner enabled: every ${SCAN_INTERVAL / 60000} min, ${SCAN_MARKETS} markets per scan`);

  // Backfill existing edges from history into resolution tracker
  if (edgeResolver && independentSignals) {
    try {
      const history = independentSignals.getRecentEdges(500);
      log.info('SERVER', `Backfill: found ${history.length} total edges in history`);
      let backfilled = 0;
      for (const e of history) {
        if (e.edgeSignal === 'STRONG' || e.edgeSignal === 'MODERATE') {
          edgeResolver.recordEdge(e);
          backfilled++;
        }
      }
      log.info('SERVER', `Backfilled ${backfilled} edges into resolution tracker`);
    } catch (err) { log.error('SERVER', 'Backfill failed:', err.message); }
  }

  // Auto-check edge resolutions every 10 minutes (sports resolve fast)
  if (edgeResolver) {
    setInterval(async () => {
      try {
        const result = await edgeResolver.checkResolutions(async (conditionId) => {
          const pm = markets.getCachedMarkets().find(m => m.conditionId === conditionId);
          if (pm) return pm;
          if (kalshiMarkets) {
            const km = kalshiMarkets.getCachedMarkets().find(m => m.conditionId === conditionId);
            if (km) return km;
          }
          return null;
        });
        if (result.resolved > 0) {
          log.info('SERVER', `Auto-resolution: ${result.resolved} edges resolved out of ${result.checked} pending`);
        }
      } catch { /* non-critical */ }
    }, 10 * 60 * 1000);
  }

  // Auto-check picks resolutions every 30 minutes
  if (picksTracker) {
    // Also snapshot any existing cached accas on startup
    if (accaBuilder) {
      try {
        const data = accaBuilder.getAccas();
        if (data.accas?.length > 0) picksTracker.snapshotAccas(data.accas);
      } catch { /* non-critical */ }
    }
    setInterval(async () => {
      try {
        const apiKey = process.env.ODDS_API_KEY;
        if (apiKey) {
          const result = await picksTracker.checkAndResolve(apiKey);
          if (result.legsResolved > 0) {
            log.info('SERVER', `Picks resolution: ${result.legsResolved} legs resolved, ${result.scoresFetched} scores fetched`);
          }
        }
      } catch { /* non-critical */ }
    }, 30 * 60 * 1000);
    log.info('SERVER', '🎯 Picks tracker: auto-resolution every 30 min');
  }
});
