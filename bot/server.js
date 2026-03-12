/**
 * MarketPlayMaker Intelligence Server
 *
 * Clean architecture:
 *   - server.js      → Bootstrap, middleware, startup orchestration
 *   - routes/*.js    → All API endpoints (markets, risk, trading, intel, social, watchlist)
 *   - engine/*.js    → Business logic (scanner, executor, resolver, risk, etc.)
 *   - data/*.js      → External data sources
 *   - strategies/*.js → Trading strategies
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const config = require('./config');
const log = require('./utils/logger');
const mountRoutes = require('./routes');

// ─── Core Modules ────────────────────────────────────────────────────
const scanner = require('./engine/scanner');
const executor = require('./engine/executor');
const riskManager = require('./engine/riskManager');
const resolver = require('./engine/resolver');
const markets = require('./polymarket/markets');
const client = require('./polymarket/client');
const oddsApi = require('./bookmakers/oddsApi');
const paperTrader = require('./engine/paperTrader');
const { authMiddleware, getKey, regenerateKey } = require('./utils/auth');
const alerts = require('./engine/alerts');
const watchlist = require('./engine/watchlist');
const signalTracker = require('./engine/signalTracker');
const telegramBot = require('./telegram');
const btcBot = require('./btcBot');
const btcSniper = require('./btcSniper');

// ─── Optional Modules (graceful degradation) ─────────────────────────
function optionalRequire(mod) { try { return require(mod); } catch { return null; } }

let database = null;
try {
  database = require('./engine/database');
  if (database.initialize()) {
    log.info('SERVER', 'SQLite database initialized');
    const migrationResult = database.migrateFromJSON();
    if (migrationResult.migrated) log.info('SERVER', `DB migration: ${JSON.stringify(migrationResult.stats)}`);
  }
} catch (err) { log.warn('SERVER', `SQLite not available: ${err.message}`); }

const kalshiClient      = optionalRequire('./kalshi/client');
const kalshiMarkets     = optionalRequire('./kalshi/markets');
const wsClient          = optionalRequire('./polymarket/websocket');
const newsSignal        = optionalRequire('./data/newsSignal');
const eventPush         = optionalRequire('./engine/eventPush');
const independentSignals = optionalRequire('./data/independentSignals');
const youtubeTracker    = optionalRequire('./data/youtubeTracker');
const twitterTracker    = optionalRequire('./data/twitterTracker');
const culturalEvents    = optionalRequire('./data/culturalEvents');
const edgeResolver      = optionalRequire('./engine/edgeResolver');
const accaBuilder       = optionalRequire('./strategies/accaBuilder');
const picksTracker      = optionalRequire('./engine/picksTracker');
const picksLearner      = optionalRequire('./engine/picksLearner');

// ─── New Alpha Engines ───────────────────────────────────────────────
const newMarketDetector   = optionalRequire('./engine/newMarketDetector');
const newsReactor         = optionalRequire('./engine/newsReactor');
const panicDipDetector    = optionalRequire('./engine/panicDipDetector');
const calibrationCollector = optionalRequire('./engine/calibrationCollector');
const executionPipeline   = optionalRequire('./engine/executionPipeline');

if (newMarketDetector) log.info('SERVER', 'New market detector loaded');
if (newsReactor) log.info('SERVER', 'Rapid news reactor loaded');
if (panicDipDetector) log.info('SERVER', 'Panic dip detector loaded');
if (calibrationCollector) log.info('SERVER', 'Calibration collector loaded');
if (executionPipeline) log.info('SERVER', 'Execution pipeline loaded');

// ─── Infrastructure Modules (10/10 upgrades) ─────────────────────────
const healthMonitor       = optionalRequire('./engine/healthMonitor');
const logCleanup          = optionalRequire('./engine/logCleanup');
const strategyOptimizer   = optionalRequire('./engine/strategyOptimizer');
const probabilityEnsemble = optionalRequire('./engine/probabilityEnsemble');
const wsServer            = optionalRequire('./engine/wsServer');
const newsStream          = optionalRequire('./engine/newsStream');

if (healthMonitor) log.info('SERVER', 'Health monitor loaded');
if (logCleanup) log.info('SERVER', 'Log cleanup loaded');
if (strategyOptimizer) log.info('SERVER', 'Strategy optimizer loaded');
if (probabilityEnsemble) log.info('SERVER', 'Probability ensemble loaded');
if (wsServer) log.info('SERVER', 'WebSocket server loaded');
if (newsStream) log.info('SERVER', 'News stream loaded');

if (kalshiClient)  log.info('SERVER', 'Kalshi modules loaded');
if (edgeResolver)  log.info('SERVER', 'Edge resolver loaded');

// ═══════════════════════════════════════════════════════════════════════
// EXPRESS APP
// ═══════════════════════════════════════════════════════════════════════
const app = express();

// ─── Process Stability ───────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  log.error('CRASH', `Uncaught exception: ${err.message}`);
  log.error('CRASH', err.stack);
});
process.on('unhandledRejection', (reason) => {
  log.error('CRASH', `Unhandled rejection: ${reason}`);
});

// ─── Auto-Scanner State ──────────────────────────────────────────────
const SCAN_CACHE_FILE = path.join(__dirname, 'logs/scan-cache.json');
let cachedScanResults = [];
let lastScanTime = null;
let scanRunning = false;
const SCAN_INTERVAL = 15 * 60 * 1000;
const SCAN_MARKETS = 30;

try {
  if (fs.existsSync(SCAN_CACHE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(SCAN_CACHE_FILE, 'utf8'));
    cachedScanResults = saved.results || [];
    lastScanTime = saved.timestamp ? new Date(saved.timestamp) : null;
    log.info('SCANNER', `Loaded ${cachedScanResults.length} cached edges from disk`);
  }
} catch { /* fresh start */ }

async function runAutoScan() {
  if (scanRunning) return log.info('SCANNER', 'Scan already in progress, skipping');
  if (!independentSignals) return log.warn('SCANNER', 'Independent signals module not loaded, skipping');
  const allMarkets = markets.getCachedMarkets();
  if (allMarkets.length === 0) return log.warn('SCANNER', 'No markets cached yet, will retry');

  scanRunning = true;
  const startTime = Date.now();
  log.info('SCANNER', `Auto-scan starting: ${allMarkets.length} markets available, analyzing top ${SCAN_MARKETS}...`);

  try {
    const results = await independentSignals.batchAnalyze(allMarkets, { maxMarkets: SCAN_MARKETS });
    const entries = [];
    for (const [condId, signal] of results) entries.push({ conditionId: condId, ...signal });
    entries.sort((a, b) => (b.absDivergence || 0) - (a.absDivergence || 0));

    // ─── SANITY FILTER: Reject signals with unrealistic divergences ───
    // The old model produced 30pp+ deviations from market price (e.g. Mkt: 48% → Est: 16%).
    // Without BOOKMAKER confirmation, no signal should diverge more than 12% from market.
    // With bookmaker confirmation, allow up to 20%.
    const saneEntries = entries.filter(e => {
      const absDivPct = Math.abs(e.divergence || 0);
      if (absDivPct > 0.20) return false; // Never trust 20%+ divergence
      if (absDivPct > 0.12 && !(e.bookmakerCount >= 5)) return false; // 12%+ needs bookmaker backup
      return true;
    });

    const filtered = entries.length - saneEntries.length;
    if (filtered > 0) log.info('SCANNER', `Sanity filter: removed ${filtered} unrealistic signals (>12% divergence without bookmaker confirmation)`);

    cachedScanResults = saneEntries;
    lastScanTime = new Date();

    // Persist to disk (async, non-blocking)
    fs.promises.writeFile(SCAN_CACHE_FILE, JSON.stringify({
      results: saneEntries, timestamp: lastScanTime.toISOString(),
      marketCount: allMarkets.length, scanDuration: Date.now() - startTime,
    }, null, 2)).catch(() => {});

    // Record edges for resolution
    if (edgeResolver) {
      for (const e of saneEntries) {
        if ((e.edgeSignal === 'STRONG' || e.edgeSignal === 'MODERATE') && (e.sourceCount || 0) >= 1) edgeResolver.recordEdge(e);
      }
    }

    // ─── TRACKING MERGE (2026-03-11): Feed autoScan edges to paperTrader too ───
    // Previously autoScan only fed edgeResolver, while paperTrader required manual scanner.start().
    // This caused two completely separate tracking systems with only 4 overlapping conditions.
    // Now both systems track the same signals for unified performance measurement.
    try {
      const strategies = require('./strategies');
      const edgeOpps = saneEntries
        .filter(e => e.edgeSignal === 'STRONG' || e.edgeSignal === 'MODERATE')
        .map(e => ({
          conditionId: e.conditionId,
          market: e.question,
          question: e.question,
          strategy: e.strategy || e.edgeSource || 'autoScan',
          side: e.edgeDirection === 'BUY_YES' ? 'YES' : (e.edgeDirection === 'BUY_NO' ? 'NO' : 'YES'),
          price: e.marketPrice,
          yesPrice: e.marketPrice,
          noPrice: 1 - (e.marketPrice || 0.5),
          score: e.edgeQuality || 50,
          confidence: e.edgeSignal,
          edge: e.divergence,
          netEdge: e.divergence,
          positionSize: 10,
          liquidity: e.liquidity || 50000,
          riskLevel: e.edgeGrade === 'A' ? 'LOW' : 'MEDIUM',
        }));
      if (edgeOpps.length > 0) {
        const recorded = paperTrader.recordScanResults(edgeOpps, 25);
        if (recorded > 0) log.info('SCANNER', `Paper trader: recorded ${recorded} new positions from autoScan`);
      }
    } catch (err) {
      log.debug('SCANNER', `Paper trader feed failed: ${err.message}`);
    }

    // ─── Run Proven Edge strategy for REAL signals ───
    let provenEdgeOpps = [];
    try {
      const provenEdge = require('./strategies/provenEdge');
      const polyMarkets = allMarkets.filter(m => !m.platform || m.platform === 'POLYMARKET');
      for (const m of polyMarkets) { if (!m.platform) m.platform = 'POLYMARKET'; }
      provenEdgeOpps = await provenEdge.findOpportunities(polyMarkets, scanner.getBankroll());
      if (provenEdgeOpps.length > 0) {
        log.info('SCANNER', `Proven Edge: ${provenEdgeOpps.length} externally-validated edges found`);
        // Push proven edges as Telegram alerts (these are the REAL signals)
        const provenAlerts = provenEdgeOpps.map(o => ({
          question: o.market,
          conditionId: o.conditionId,
          marketPrice: o.entryPrice,
          prob: o.edge.externalProb || o.edge.fairProb || o.entryPrice,
          divergence: o.edge.net,
          absDivergence: Math.abs(o.edge.net),
          edgeSignal: o.score >= 65 ? 'STRONG' : 'MODERATE',
          edgeQuality: o.score,
          edgeGrade: o.grade,
          edgeDirection: `${o.side} (${o.type})`,
          sourceCount: o.bookmaker?.bookmakerCount || 1,
          provenEdge: true,
          riskNote: o.riskNote,
        }));
        if (provenAlerts.length > 0) telegramBot.pushEdgeAlert(provenAlerts).catch(() => {});
      }
    } catch (err) {
      log.debug('SCANNER', `Proven edge scan failed: ${err.message}`);
    }

    // Webhook alerts for A-grade STRONG edges (sane only)
    const strongEdges = saneEntries.filter(e => e.edgeSignal === 'STRONG' && (e.edgeQuality || 0) >= 55);
    if (strongEdges.length > 0) fireWebhookAlerts(strongEdges).catch(() => {});

    // OLD independent-signal alerts DISABLED — 47% historical win rate = noise.
    // Only proven edge alerts (bookmaker-validated, cross-platform arb, orderbook arb) are pushed above.
    // const anyEdges = saneEntries.filter(e => e.edgeSignal === 'STRONG' || e.edgeSignal === 'MODERATE');
    // if (anyEdges.length > 0) telegramBot.pushEdgeAlert(anyEdges).catch(() => {});

    const aCount = saneEntries.filter(e => (e.edgeQuality || 0) >= 75).length;
    const bCount = saneEntries.filter(e => (e.edgeQuality || 0) >= 55 && (e.edgeQuality || 0) < 75).length;
    const edgeCount = saneEntries.filter(e => e.edgeSignal === 'STRONG' || e.edgeSignal === 'MODERATE').length;
    log.info('SCANNER', `Auto-scan complete: ${saneEntries.length} analyzed (${filtered} filtered), A=${aCount} B=${bCount}, ${edgeCount} edges, ${provenEdgeOpps.length} proven (${((Date.now() - startTime) / 1000).toFixed(1)}s)`);

    // Emit scan results via WebSocket
    if (wsServer) {
      wsServer.scanComplete({ edgeCount, totalAnalyzed: saneEntries.length, filtered, provenEdges: provenEdgeOpps.length, duration: Date.now() - startTime });
      for (const e of strongEdges || []) { wsServer.signalDetected({ type: 'edge', ...e }); }
    }
    // Record health
    if (healthMonitor) healthMonitor.recordSuccess('scanner', Date.now() - startTime, { edgeCount });
  } catch (err) {
    log.error('SCANNER', `Auto-scan failed: ${err.message}`);
    if (healthMonitor) healthMonitor.recordError('scanner', err.message);
  } finally {
    scanRunning = false;
  }
}

// ─── Webhook Helpers ─────────────────────────────────────────────────
const WEBHOOK_FILE = path.join(__dirname, 'logs/webhook-config.json');
let webhookConfig = { urls: [], enabled: false, minQuality: 55, minEdge: 'STRONG' };
try {
  if (fs.existsSync(WEBHOOK_FILE)) {
    webhookConfig = { ...webhookConfig, ...JSON.parse(fs.readFileSync(WEBHOOK_FILE, 'utf8')) };
  }
} catch { /* fresh start */ }

if (process.env.DISCORD_WEBHOOK_URL) {
  if (!webhookConfig.urls.includes(process.env.DISCORD_WEBHOOK_URL)) webhookConfig.urls.push(process.env.DISCORD_WEBHOOK_URL);
  webhookConfig.enabled = true;
}

function saveWebhookConfig() {
  fs.promises.writeFile(WEBHOOK_FILE, JSON.stringify(webhookConfig, null, 2)).catch(() => {});
}

async function fireWebhookAlerts(edges) {
  // Telegram signals now handled separately in runAutoScan with per-user filtering
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message), signal: AbortSignal.timeout(5000),
      });
      log.info('WEBHOOK', `Alert sent to ${url.slice(0, 40)}...`);
    } catch (err) {
      log.warn('WEBHOOK', `Failed: ${err.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MIDDLEWARE STACK
// ═══════════════════════════════════════════════════════════════════════

// CORS
const allowedOrigins = ['http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    if (process.env.NODE_ENV === 'production') return cb(new Error(`Origin ${origin} not allowed`), false);
    cb(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.set('etag', false);

// ─── Rate Limiting ───────────────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 600;

function rateLimit(req, res, next) {
  if (req.path === '/api/health') return next();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  let record = rateLimitMap.get(ip);
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) { record = { windowStart: now, count: 0 }; rateLimitMap.set(ip, record); }
  record.count++;
  res.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  res.set('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_MAX - record.count)));
  if (record.count > RATE_LIMIT_MAX) return res.status(429).json({ error: 'Too many requests', retryAfter: Math.ceil((record.windowStart + RATE_LIMIT_WINDOW - now) / 1000) });
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap) { if (now - record.windowStart > RATE_LIMIT_WINDOW * 2) rateLimitMap.delete(ip); }
}, 300000);

app.use(rateLimit);

// ─── Security Headers ────────────────────────────────────────────────
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => log.info('HTTP', `${req.method} ${req.url} → ${res.statusCode} (${Date.now() - start}ms)`));
  next();
});

// Authentication
app.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════════════
// CORE ROUTES (kept in server.js — tiny, auth-specific)
// ═══════════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString(),
    version: require('./package.json').version || '1.0.0',
    memory: { heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB', rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB' },
    markets: markets.getCachedMarkets().length,
    scanner: { running: scanRunning, cachedEdges: cachedScanResults.length },
    components: healthMonitor ? healthMonitor.getStatus() : null,
    ws: wsServer ? wsServer.getStats() : null,
    optimizer: strategyOptimizer ? { report: strategyOptimizer.getReport() } : null,
    ensemble: probabilityEnsemble ? { report: probabilityEnsemble.getReport() } : null,
    newsStream: newsStream ? newsStream.getStatus() : null,
    logCleanup: logCleanup ? { diskUsage: logCleanup.getDiskUsage() } : null,
  });
});

if (eventPush) {
  app.get('/api/events', eventPush.sseHandler);
  app.get('/api/events/status', (req, res) => res.json({ clients: eventPush.getClientCount(), available: true }));
}

app.get('/api/auth/key', (req, res) => res.json({ key: getKey() }));
app.post('/api/auth/verify', (req, res) => res.json({ valid: true }));
app.post('/api/auth/regenerate', (req, res) => res.json({ key: regenerateKey() }));

// ═══════════════════════════════════════════════════════════════════════
// MOUNT ALL ROUTE MODULES
// ═══════════════════════════════════════════════════════════════════════

mountRoutes(app, {
  // Core
  scanner, executor, riskManager, resolver, markets, client, oddsApi,
  paperTrader, config, database,
  // Kalshi
  kalshiClient, kalshiMarkets,
  // Intelligence
  wsClient, newsSignal, independentSignals, edgeResolver,
  accaBuilder, picksTracker, picksLearner,
  // Social
  youtubeTracker, twitterTracker, culturalEvents,
  // Helpers
  alerts, watchlist, signalTracker,
  // New Alpha Engines
  newMarketDetector, newsReactor, panicDipDetector,
  calibrationCollector, executionPipeline,
  // Infrastructure (10/10)
  healthMonitor, logCleanup, strategyOptimizer,
  probabilityEnsemble, wsServer, newsStream,
  // Scanner state (mutable, shared by reference)
  scanState: { get cachedScanResults() { return cachedScanResults; }, get lastScanTime() { return lastScanTime; }, get scanRunning() { return scanRunning; }, get SCAN_INTERVAL() { return SCAN_INTERVAL; }, runAutoScan },
  // Webhook helpers
  webhooks: { config: webhookConfig, save: saveWebhookConfig, fire: fireWebhookAlerts },
  // Telegram
  telegramBot,
});

// ═══════════════════════════════════════════════════════════════════════
// STATIC SERVING & SPA FALLBACK
// ═══════════════════════════════════════════════════════════════════════

const buildCandidates = [
  path.join(__dirname, '..', 'build'),
  path.join(__dirname, 'build'),
  path.join(process.cwd(), 'build'),
];
const buildPath = buildCandidates.find(p => fs.existsSync(path.join(p, 'index.html')));

if (buildPath) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(buildPath, 'index.html'));
  });
  log.info('SERVER', `Serving React build from ${buildPath}`);
} else {
  log.warn('SERVER', 'No React build found — frontend will not be served');
  app.get('/', (req, res) => res.json({ error: 'Frontend not built', hint: 'Run npm run build in project root' }));
}

// ═══════════════════════════════════════════════════════════════════════
// ENVIRONMENT AUTO-CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

async function configureEnvironment() {
  // Odds API
  if (process.env.ODDS_API_KEY) {
    try {
      oddsApi.setApiKey(process.env.ODDS_API_KEY);
      log.info('SERVER', 'Odds API key loaded from environment');
      const oddsStart = Date.now();
      oddsApi.fetchAllOdds().then(ev => {
        log.info('SERVER', `Auto-fetched ${ev.length} bookmaker events`);
        if (healthMonitor) healthMonitor.recordSuccess('bookmaker-odds', Date.now() - oddsStart, { count: ev.length });
      }).catch(err => { if (healthMonitor) healthMonitor.recordError('bookmaker-odds', err.message); });
      setInterval(() => {
        const t = Date.now();
        oddsApi.fetchAllOdds()
          .then(ev => { if (healthMonitor) healthMonitor.recordSuccess('bookmaker-odds', Date.now() - t, { count: ev.length }); })
          .catch(err => { if (healthMonitor) healthMonitor.recordError('bookmaker-odds', err.message); });
      }, 30 * 60 * 1000);
    } catch (err) { log.warn('SERVER', `Odds API setup failed: ${err.message}`); }
  }

  // LLM
  if (process.env.OPENAI_API_KEY && independentSignals) {
    try {
      independentSignals.llm.configure({
        apiKey: process.env.OPENAI_API_KEY,
        provider: process.env.LLM_PROVIDER || 'openai',
        model: process.env.LLM_MODEL || undefined,
      });
      log.info('SERVER', `LLM configured: provider=${process.env.LLM_PROVIDER || 'openai'}`);
    } catch (err) { log.warn('SERVER', `LLM setup failed: ${err.message}`); }
  }

  // YouTube
  if (process.env.YOUTUBE_API_KEY) {
    if (independentSignals?.youtube?.setApiKey) independentSignals.youtube.setApiKey(process.env.YOUTUBE_API_KEY);
    if (youtubeTracker?.setApiKey) youtubeTracker.setApiKey(process.env.YOUTUBE_API_KEY);
    log.info('SERVER', 'YouTube tracker API key loaded');
  }

  // Twitter
  if (process.env.RAPIDAPI_KEY) {
    if (independentSignals?.twitter) try { independentSignals.twitter.setApiKey(process.env.RAPIDAPI_KEY); } catch (err) { log.debug('SERVER', 'Twitter API key set failed: ' + err.message); }
    if (twitterTracker?.setApiKey) try { twitterTracker.setApiKey(process.env.RAPIDAPI_KEY); } catch (err) { log.debug('SERVER', 'Twitter tracker API key set failed: ' + err.message); }
    log.info('SERVER', 'Twitter RapidAPI fallback key loaded');
  } else if (twitterTracker) {
    log.info('SERVER', 'Twitter tracker running FREE (Nitter scraping)');
  }

  // Cultural events + News
  if (process.env.NEWSDATA_API_KEY && independentSignals?.culturalEvents) {
    try { independentSignals.culturalEvents.setNewsApiKey(process.env.NEWSDATA_API_KEY); } catch (err) { log.debug('SERVER', 'Cultural events API key set failed: ' + err.message); }
  }

  // Polymarket CLOB API credentials (for authenticated trading)
  if (process.env.POLY_API_KEY) {
    try {
      const clobExecutor = optionalRequire('./polymarket/clobExecutor');
      if (clobExecutor) {
        const privateKey = process.env.POLYGON_PRIVATE_KEY || null;
        const initialized = await clobExecutor.initialize(privateKey, {
          apiKey: process.env.POLY_API_KEY,
          apiSecret: process.env.POLY_API_SECRET,
          apiPassphrase: process.env.POLY_PASSPHRASE,
          dryRun: !privateKey, // dry-run if no private key
        });
        if (initialized) {
          log.info('SERVER', 'Polymarket CLOB executor initialized with API credentials');
        } else {
          log.info('SERVER', 'Polymarket CLOB API keys loaded (no wallet key — dry-run mode)');
        }
      }
    } catch (err) { log.warn('SERVER', `CLOB executor setup failed: ${err.message}`); }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// STARTUP + SCHEDULED TASKS
// ═══════════════════════════════════════════════════════════════════════

const PORT = config.PORT;
let server;

server = app.listen(PORT, () => {
  log.info('SERVER', `📊 Market PlayMaker Intelligence API running on http://localhost:${PORT}`);
  log.info('SERVER', `   Dashboard: http://localhost:3000/polymarket`);
  log.info('SERVER', `   Health:    http://localhost:${PORT}/api/health`);

  // ═══════════════════════════════════════════════════════════════════
  // INITIALIZE INFRASTRUCTURE MODULES (10/10 upgrades)
  // ═══════════════════════════════════════════════════════════════════

  // WebSocket server — must init first (uses HTTP server)
  if (wsServer) {
    try {
      wsServer.initialize(server, { origin: allowedOrigins });
      log.info('SERVER', '🔌 WebSocket server initialized (Socket.IO)');
    } catch (err) { log.warn('SERVER', `WebSocket init failed: ${err.message}`); }
  }

  // Health monitor — heartbeat for all components
  if (healthMonitor) {
    try {
      healthMonitor.start({
        onAlert: (alert) => {
          log.warn('HEALTH', `Component ${alert.component} is ${alert.status}: ${alert.message || ''}`);
          if (alert.status === 'down') {
            const msg = `⚠️ *Component Down*\n\`${alert.component}\` — ${alert.message || 'no response'}`;
            telegramBot.sendToAll?.(msg)?.catch(() => {});
          }
          if (wsServer) wsServer.healthUpdate(alert);
        },
      });
      log.info('SERVER', '🏥 Health monitor started');
    } catch (err) { log.warn('SERVER', `Health monitor failed: ${err.message}`); }
  }

  // Log cleanup — prevents unbounded file growth
  if (logCleanup) {
    try {
      logCleanup.start();
      log.info('SERVER', '🧹 Log cleanup started (6h cycle)');
    } catch (err) { log.warn('SERVER', `Log cleanup failed: ${err.message}`); }
  }

  // Strategy optimizer — Thompson Sampling for allocation
  if (strategyOptimizer) {
    try {
      strategyOptimizer.initialize(executor);
      strategyOptimizer.start();
      log.info('SERVER', '🎲 Strategy optimizer started (30min cycle)');
    } catch (err) { log.warn('SERVER', `Strategy optimizer failed: ${err.message}`); }
  }

  // Probability ensemble — multi-model predictions
  if (probabilityEnsemble) {
    try {
      probabilityEnsemble.initialize(database);
      probabilityEnsemble.start();
      log.info('SERVER', '🧠 Probability ensemble started');
    } catch (err) { log.warn('SERVER', `Probability ensemble failed: ${err.message}`); }
  }

  // News stream — multi-source streaming news
  if (newsStream) {
    try {
      newsStream.start({
        healthMonitor,
        onBreakingNews: (article) => {
          log.info('NEWS', `🔴 Breaking: "${article.title?.slice(0, 80)}" (score: ${article.impactScore})`);
          if (wsServer) wsServer.newsBreakAlert(article);
          // Feed to news reactor for market matching
          if (newsReactor?.ingestArticle) newsReactor.ingestArticle(article);
        },
      });
      log.info('SERVER', '📰 News stream started (13 sources, 4 tiers)');
    } catch (err) { log.warn('SERVER', `News stream failed: ${err.message}`); }
  }

  configureEnvironment();

  // Initialize Telegram bot
  telegramBot.initialize(process.env.TELEGRAM_BOT_TOKEN, {
    scanner, executor, paperTrader, markets, client, config,
    scanState: { get cachedScanResults() { return cachedScanResults; }, get lastScanTime() { return lastScanTime; }, get scanRunning() { return scanRunning; }, runAutoScan },
  });

  // Initialize BTC Bot (5-minute scanner)
  btcBot.initialize({
    sendToAll: (msg) => telegramBot.sendToAll ? telegramBot.sendToAll(msg) : null,
    sendTo: telegramBot.sendTo,
    bankroll: parseFloat(process.env.BTC_BOT_BANKROLL || '1000'),
  });

  // Initialize BTC 5-Min Sniper (real-time Binance + Polymarket)
  btcSniper.initialize({
    sendToAll: (msg) => telegramBot.sendToAll ? telegramBot.sendToAll(msg) : null,
    sendTo: telegramBot.sendTo,
    bankroll: parseFloat(process.env.SNIPER_BANKROLL || '1000'),
  });

  // Auto-fetch markets
  const mktStart = Date.now();
  markets.refreshMarkets()
    .then(mktList => {
      log.info('SERVER', `Fetched ${mktList.length} Polymarket markets`);
      if (healthMonitor) healthMonitor.recordSuccess('polymarket-api', Date.now() - mktStart, { count: mktList.length });
    })
    .catch(err => {
      log.warn('SERVER', `Market fetch failed: ${err.message}`);
      if (healthMonitor) healthMonitor.recordError('polymarket-api', err.message);
    });
  setInterval(() => {
    const t = Date.now();
    markets.refreshMarkets()
      .then(mktList => { if (healthMonitor) healthMonitor.recordSuccess('polymarket-api', Date.now() - t, { count: mktList.length }); })
      .catch(err => { if (healthMonitor) healthMonitor.recordError('polymarket-api', err.message); });
  }, 15 * 60 * 1000);

  // ═══════════════════════════════════════════════════════════════════
  // NEW ALPHA ENGINES — Start after market cache warms
  // ═══════════════════════════════════════════════════════════════════
  setTimeout(() => {
    const cachedMkts = markets.getCachedMarkets();

    // 1. New Market Detector — polls every 30s for newly listed markets
    if (newMarketDetector) {
      try {
        // Seed known markets from cache to avoid false positives on first run
        if (cachedMkts.length > 0) newMarketDetector.seedFromCache(cachedMkts);
        newMarketDetector.start({
          onNewMarket: (market, analysis) => {
            log.info('SERVER', `🆕 New market detected: "${analysis.question?.slice(0, 60)}" (score: ${analysis.score})`);
            if (healthMonitor) healthMonitor.recordSuccess('new-market-detector', 0, { score: analysis.score });
            // Push to execution pipeline
            if (executionPipeline && analysis.opportunity) {
              executionPipeline.fromNewMarketDetector(market, analysis);
            }
            // Telegram alert for high-score new markets
            if (analysis.score >= 40) {
              const msg = `🆕 *New Market Detected*\n"${analysis.question?.slice(0, 100)}"\nScore: ${analysis.score} | Liq: $${analysis.liquidity?.toFixed(0)}\n${analysis.opportunity ? `⚡ Edge: ${(analysis.opportunity.estimatedEdge * 100).toFixed(1)}% ${analysis.opportunity.side}` : ''}`;
              telegramBot.sendToAll?.(msg)?.catch(() => {});
            }
          },
          onMispricedMarket: (market, analysis, opp) => {
            log.info('SERVER', `🎯 Mispriced new market: "${analysis.question?.slice(0, 60)}" — ${opp.type} edge: ${(opp.estimatedEdge * 100).toFixed(1)}%`);
          },
        });
        log.info('SERVER', '🆕 New market detector started (30s poll)');
      } catch (err) { log.warn('SERVER', `New market detector failed: ${err.message}`); }
    }

    // 2. Rapid News Reactor — polls RSS every 45s for breaking news
    if (newsReactor) {
      try {
        newsReactor.start({
          onNewsSignal: (signal) => {
            log.info('SERVER', `🚨 News signal: "${signal.headline?.slice(0, 60)}" → ${signal.side} ${signal.market?.slice(0, 40)} (edge: ${(signal.estimatedEdge * 100).toFixed(1)}%)`);
            if (healthMonitor) healthMonitor.recordSuccess('news-reactor', 0, { edge: signal.estimatedEdge });
            // Push to execution pipeline
            if (executionPipeline) {
              executionPipeline.fromNewsReactor(signal);
            }
            // Telegram alert for breaking news signals
            if (signal.isBreaking || signal.estimatedEdge > 0.05) {
              const msg = `🚨 *Breaking News Signal*\n"${signal.headline?.slice(0, 100)}"\n→ ${signal.side} "${signal.market?.slice(0, 80)}"\nEdge: ${(signal.estimatedEdge * 100).toFixed(1)}% | Impact: ${(signal.impactScore * 100).toFixed(0)}%`;
              telegramBot.sendToAll?.(msg)?.catch(() => {});
            }
          },
        });
        log.info('SERVER', '🚨 Rapid news reactor started (45s poll)');
      } catch (err) { log.warn('SERVER', `News reactor failed: ${err.message}`); }
    }

    // 3. Panic Dip Detector — monitors price drops across all markets
    if (panicDipDetector) {
      try {
        panicDipDetector.start({
          onDipSignal: (dip) => {
            log.info('SERVER', `🔻 Panic dip: "${dip.question?.slice(0, 50)}" dropped ${(dip.dropPct * 100).toFixed(1)}% — edge: ${(dip.netEdge * 100).toFixed(1)}%`);
            if (healthMonitor) healthMonitor.recordSuccess('panic-dip-detector', 0, { dropPct: dip.dropPct });
            // Push to execution pipeline
            if (executionPipeline) {
              executionPipeline.fromPanicDip(dip);
            }
            // Telegram alert for significant dips
            if (dip.score >= 50 && !dip.newsJustified) {
              const msg = `🔻 *Panic Dip Detected*\n"${dip.question?.slice(0, 100)}"\nDrop: ${(dip.dropPct * 100).toFixed(1)}% in ${dip.dropDurationMin}min\nEdge: ${(dip.netEdge * 100).toFixed(1)}% | Target: ${(dip.reversionTarget * 100).toFixed(0)}%\n${dip.newsJustified ? '⚠️ News-justified' : '✅ No adverse news'}`;
              telegramBot.sendToAll?.(msg)?.catch(() => {});
            }
          },
        });
        // Feed initial price snapshots
        if (cachedMkts.length > 0) panicDipDetector.recordAllSnapshots(cachedMkts);
        log.info('SERVER', '🔻 Panic dip detector started');
      } catch (err) { log.warn('SERVER', `Panic dip detector failed: ${err.message}`); }
    }

    // 4. Calibration Collector — actively seeks resolution data
    if (calibrationCollector) {
      try {
        calibrationCollector.start();
        log.info('SERVER', '📊 Calibration collector started (10min poll)');
      } catch (err) { log.warn('SERVER', `Calibration collector failed: ${err.message}`); }
    }

  }, 15000); // Wait 15s for market cache to warm

  // ═══════════════════════════════════════════════════════════════════
  // HEALTH HEARTBEATS — report running status for always-on modules
  // ═══════════════════════════════════════════════════════════════════
  if (healthMonitor) {
    // Initial heartbeat after startup settles (30s)
    setTimeout(() => {
      // Report database health
      if (database) {
        try { database.db?.pragma('integrity_check'); healthMonitor.recordSuccess('sqlite-db', 0); }
        catch (err) { healthMonitor.recordError('sqlite-db', err.message); }
      }
      // Report Telegram health
      if (telegramBot?.isActive?.()) healthMonitor.recordSuccess('telegram-bot', 0);
      // Report executor / risk-manager health (they're loaded and ready)
      if (executor) healthMonitor.recordSuccess('executor', 0, { status: 'ready' });
      if (riskManager) healthMonitor.recordSuccess('risk-manager', 0, { status: 'ready' });
      // Report signal sources
      if (independentSignals) healthMonitor.recordSuccess('independent-signals', 0, { status: 'ready' });
      if (probabilityEnsemble) healthMonitor.recordSuccess('probability-model', 0, { status: 'ready' });
      // Report alpha engines
      if (newMarketDetector?.getStatus?.()?.running) healthMonitor.recordSuccess('new-market-detector', 0, { status: 'running' });
      if (newsReactor?.getStatus?.()?.running) healthMonitor.recordSuccess('news-reactor', 0, { status: 'running' });
      if (panicDipDetector?.getStatus?.()?.running) healthMonitor.recordSuccess('panic-dip-detector', 0, { status: 'running' });
      if (calibrationCollector?.getStatus?.()?.running) healthMonitor.recordSuccess('calibration-collector', 0, { status: 'running' });
      if (executionPipeline) healthMonitor.recordSuccess('execution-pipeline', 0, { status: 'ready' });
      if (edgeResolver) healthMonitor.recordSuccess('edge-resolver', 0, { status: 'ready' });
      // Report data sources as loaded
      if (newsSignal) healthMonitor.recordSuccess('news-signal', 0, { status: 'loaded' });
      if (twitterTracker) healthMonitor.recordSuccess('twitter-tracker', 0, { status: 'loaded' });
      if (youtubeTracker) healthMonitor.recordSuccess('youtube-tracker', 0, { status: 'loaded' });
      if (culturalEvents) healthMonitor.recordSuccess('cultural-events', 0, { status: 'loaded' });
      // Report API components
      if (kalshiClient) healthMonitor.recordSuccess('kalshi-api', 0, { status: 'loaded' });
      if (markets) healthMonitor.recordSuccess('gamma-api', 0, { status: 'loaded' });
    }, 30000);

    // Periodic heartbeat every 5 minutes for always-on components
    setInterval(() => {
      if (database) {
        try { database.db?.pragma('integrity_check'); healthMonitor.recordSuccess('sqlite-db', 0); }
        catch (err) { healthMonitor.recordError('sqlite-db', err.message); }
      }
      if (telegramBot?.isActive?.()) healthMonitor.recordSuccess('telegram-bot', 0);
      if (executor) healthMonitor.recordSuccess('executor', 0, { status: 'ready' });
      if (riskManager) healthMonitor.recordSuccess('risk-manager', 0, { status: 'ready' });
      if (independentSignals) healthMonitor.recordSuccess('independent-signals', 0);
      if (probabilityEnsemble) healthMonitor.recordSuccess('probability-model', 0);
      if (newMarketDetector?.getStatus?.()?.running) healthMonitor.recordSuccess('new-market-detector', 0);
      if (newsReactor?.getStatus?.()?.running) healthMonitor.recordSuccess('news-reactor', 0);
      if (panicDipDetector?.getStatus?.()?.running) healthMonitor.recordSuccess('panic-dip-detector', 0);
      if (calibrationCollector?.getStatus?.()?.running) healthMonitor.recordSuccess('calibration-collector', 0);
      if (executionPipeline) healthMonitor.recordSuccess('execution-pipeline', 0);
      if (edgeResolver) healthMonitor.recordSuccess('edge-resolver', 0);
      if (newsSignal) healthMonitor.recordSuccess('news-signal', 0);
      if (twitterTracker) healthMonitor.recordSuccess('twitter-tracker', 0);
      if (youtubeTracker) healthMonitor.recordSuccess('youtube-tracker', 0);
      if (culturalEvents) healthMonitor.recordSuccess('cultural-events', 0);
      if (kalshiClient) healthMonitor.recordSuccess('kalshi-api', 0);
      if (markets) healthMonitor.recordSuccess('gamma-api', 0);
    }, 5 * 60 * 1000);
  }

  // Feed price snapshots to panic dip detector every scan cycle
  if (panicDipDetector) {
    setInterval(() => {
      try {
        const mkts = markets.getCachedMarkets();
        if (mkts.length > 0) {
          panicDipDetector.recordAllSnapshots(mkts);
          const dips = panicDipDetector.detectDips(mkts);
          panicDipDetector.updateActiveDips(mkts);
        }
      } catch (err) { log.debug('SERVER', `Dip scan failed: ${err.message}`); }
    }, 60000); // Every 60 seconds
  }

  // Periodically process execution pipeline queue
  if (executionPipeline) {
    setInterval(() => {
      executionPipeline.processQueue().catch(err => log.debug('SERVER', `Pipeline process failed: ${err.message}`));
    }, 30000); // Every 30 seconds
    // Save pipeline state periodically
    setInterval(() => executionPipeline.saveState(), 5 * 60 * 1000);
  }

  // Auto-scanner (delayed for market cache to warm)
  setTimeout(async () => {
    if (markets.getCachedMarkets().length > 0) {
      log.info('SCANNER', `Starting initial scan (${markets.getCachedMarkets().length} markets)...`);
      await runAutoScan();
    }
  }, 20000);
  setInterval(() => runAutoScan().catch(err => log.error('SCANNER', `Scheduled scan failed: ${err.message}`)), SCAN_INTERVAL);
  log.info('SCANNER', `Auto-scanner: every ${SCAN_INTERVAL / 60000} min, ${SCAN_MARKETS} markets`);

  // Start paper trade resolution checker (2026-03-11)
  // Previously never started on boot — 174 paper trades sitting unresolved.
  // This checks Polymarket API every 60s to resolve settled markets.
  try {
    paperTrader.startResolutionChecker();
    log.info('SERVER', 'Paper trade resolution checker started (60s cycle)');
  } catch (err) { log.warn('SERVER', `Paper trade resolution checker failed: ${err.message}`); }

  // Backfill edges
  if (edgeResolver && independentSignals) {
    try {
      const history = independentSignals.getRecentEdges(500);
      let backfilled = 0;
      for (const e of history) {
        if (e.edgeSignal === 'STRONG' || e.edgeSignal === 'MODERATE') { edgeResolver.recordEdge(e); backfilled++; }
      }
      log.info('SERVER', `Backfilled ${backfilled} edges into resolution tracker`);
    } catch (err) { log.error('SERVER', 'Backfill failed:', err.message); }
  }

  // Auto-resolve edges every 10 min
  if (edgeResolver) {
    setInterval(async () => {
      try {
        const result = await edgeResolver.checkResolutions(async (conditionId) => {
          const pm = markets.getCachedMarkets().find(m => m.conditionId === conditionId);
          if (pm) return pm;
          if (kalshiMarkets) { const km = kalshiMarkets.getCachedMarkets().find(m => m.conditionId === conditionId); if (km) return km; }
          try { const apiMarket = await client.getMarketById(conditionId); if (apiMarket) return apiMarket; } catch (err) { log.debug('SERVER', 'Market fetch by ID failed: ' + err.message); }
          return null;
        });
        if (result.resolved > 0) {
          log.info('SERVER', `Auto-resolution: ${result.resolved}/${result.checked} resolved`);
          // Push resolution signals to Telegram users
          if (result.resolutions?.length > 0) telegramBot.pushResolutionSignal(result.resolutions).catch(() => {});
        }
      } catch (err) { log.debug('SERVER', 'Edge auto-resolution failed: ' + err.message); }
    }, 10 * 60 * 1000);
  }

  // Auto-resolve picks every 30 min
  if (picksTracker) {
    if (accaBuilder) {
      try { const data = accaBuilder.getAccas(); if (data.accas?.length > 0) picksTracker.snapshotAccas(data.accas); } catch (err) { log.debug('SERVER', 'Acca snapshot failed: ' + err.message); }
    }
    setInterval(async () => {
      try {
        if (process.env.ODDS_API_KEY) {
          const result = await picksTracker.checkAndResolve(process.env.ODDS_API_KEY);
          if (result.legsResolved > 0) log.info('SERVER', `Picks: ${result.legsResolved} legs resolved`);
        }
      } catch (err) { log.debug('SERVER', 'Picks auto-resolution failed: ' + err.message); }
    }, 30 * 60 * 1000);
    log.info('SERVER', 'Picks tracker: auto-resolution every 30 min');
  }
});

// ═══════════════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════════════

function gracefulShutdown(signal) {
  log.info('SERVER', `${signal} received — shutting down gracefully...`);

  // Stop Telegram polling
  try { telegramBot.stop(); } catch { /* ignore */ }

  // Stop BTC bot
  try { btcBot.stop(); } catch { /* ignore */ }

  // Stop BTC Sniper
  try { btcSniper.stop(); } catch { /* ignore */ }

  // Stop new alpha engines
  try { if (newMarketDetector) newMarketDetector.stop(); } catch { /* ignore */ }
  try { if (newsReactor) newsReactor.stop(); } catch { /* ignore */ }
  try { if (panicDipDetector) panicDipDetector.stop(); } catch { /* ignore */ }
  try { if (calibrationCollector) calibrationCollector.stop(); } catch { /* ignore */ }
  try { if (executionPipeline) executionPipeline.saveState(); } catch { /* ignore */ }

  // Stop infrastructure modules
  try { if (newsStream) newsStream.stop(); } catch { /* ignore */ }
  try { if (probabilityEnsemble) probabilityEnsemble.stop(); } catch { /* ignore */ }
  try { if (strategyOptimizer) strategyOptimizer.stop(); } catch { /* ignore */ }
  try { if (logCleanup) logCleanup.stop(); } catch { /* ignore */ }
  try { if (healthMonitor) healthMonitor.stop(); } catch { /* ignore */ }
  try { if (wsServer) wsServer.close(); } catch { /* ignore */ }

  // Checkpoint SQLite WAL
  try { if (logCleanup) logCleanup.checkpointDatabase(); } catch { /* ignore */ }

  // Stop accepting new connections
  server.close(() => {
    log.info('SERVER', 'HTTP server closed');

    // Flush pending data
    try {
      if (cachedScanResults.length > 0) {
        fs.writeFileSync(SCAN_CACHE_FILE, JSON.stringify({
          results: cachedScanResults, timestamp: lastScanTime?.toISOString(),
        }, null, 2));
      }
    } catch (err) { log.debug('SERVER', 'Failed to flush scan cache on shutdown: ' + err.message); }

    try { saveWebhookConfig(); } catch (err) { log.debug('SERVER', 'Failed to save webhook config on shutdown: ' + err.message); }

    log.info('SERVER', 'Shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 10s
  setTimeout(() => {
    log.error('SERVER', 'Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
