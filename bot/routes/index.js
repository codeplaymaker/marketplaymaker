/**
 * Route index — mounts all route modules on the Express app.
 *
 * Usage in server.js:
 *
 *   const mountRoutes = require('./routes');
 *   mountRoutes(app, {
 *     // Core
 *     scanner, executor, riskManager, resolver, markets, client, oddsApi,
 *     paperTrader, config, database,
 *     // Kalshi (optional)
 *     kalshiClient, kalshiMarkets,
 *     // Intelligence (optional)
 *     wsClient, newsSignal, independentSignals, edgeResolver,
 *     accaBuilder, picksTracker, picksLearner,
 *     // Social (optional)
 *     youtubeTracker, twitterTracker, culturalEvents,
 *     // Intel helpers
 *     alerts, watchlist, signalTracker,
 *     // Mutable state container for auto-scanner (object updated in-place by server.js)
 *     scanState: { cachedScanResults, lastScanTime, scanRunning, SCAN_INTERVAL, runAutoScan },
 *     // Webhook helpers
 *     webhooks: { config: webhookConfig, save: saveWebhookConfig, fire: fireWebhookAlerts },
 *   });
 *
 * Routes NOT included here (keep in server.js):
 *   GET  /api/health
 *   GET  /api/auth/key
 *   POST /api/auth/verify
 *   POST /api/auth/regenerate
 *   GET  /api/debug/build
 */

const createMarketsRoutes   = require('./markets');
const createRiskRoutes      = require('./risk');
const createTradingRoutes   = require('./trading');
const createIntelRoutes     = require('./intel');
const createSocialRoutes    = require('./social');
const createWatchlistRoutes = require('./watchlist');

module.exports = function mountRoutes(app, deps) {
  // Markets & Opportunities — /api/markets/*, /api/opportunities/*, /api/execute, /api/auto-execute, /api/kalshi/*
  app.use('/api', createMarketsRoutes({
    markets:        deps.markets,
    client:         deps.client,
    scanner:        deps.scanner,
    executor:       deps.executor,
    kalshiClient:   deps.kalshiClient,
    kalshiMarkets:  deps.kalshiMarkets,
    config:         deps.config,
  }));

  // Risk, Performance, Calibration & Database — /api/risk/*, /api/positions, /api/calibration, /api/db/*
  app.use('/api', createRiskRoutes({
    riskManager: deps.riskManager,
    scanner:     deps.scanner,
    executor:    deps.executor,
    resolver:    deps.resolver,
    database:    deps.database,
  }));

  // Bot Control, Trades, Orders & Paper Trading — /api/bot/*, /api/trades, /api/orders/*, /api/paper-trades/*
  app.use('/api', createTradingRoutes({
    scanner:     deps.scanner,
    executor:    deps.executor,
    riskManager: deps.riskManager,
    paperTrader: deps.paperTrader,
  }));

  // Intel / Analytics — /api/odds/*, /api/accas/*, /api/picks/*, /api/learning/*,
  //   /api/intel/independent/*, /api/intel/calibration, /api/intel/divergences, etc.
  app.use('/api', createIntelRoutes({
    oddsApi:            deps.oddsApi,
    markets:            deps.markets,
    scanner:            deps.scanner,
    signalTracker:      deps.signalTracker,
    alerts:             deps.alerts,
    watchlist:          deps.watchlist,
    accaBuilder:        deps.accaBuilder,
    picksTracker:       deps.picksTracker,
    picksLearner:       deps.picksLearner,
    paperTrader:        deps.paperTrader,
    independentSignals: deps.independentSignals,
    edgeResolver:       deps.edgeResolver,
    wsClient:           deps.wsClient,
    newsSignal:         deps.newsSignal,
    kalshiMarkets:      deps.kalshiMarkets,
    scanState:          deps.scanState,
    webhooks:           deps.webhooks,
  }));

  // Social / Cultural Intelligence — /api/intel/youtube/*, /api/intel/twitter/*, /api/intel/cultural/*
  app.use('/api', createSocialRoutes({
    youtubeTracker:  deps.youtubeTracker,
    twitterTracker:  deps.twitterTracker,
    culturalEvents:  deps.culturalEvents,
  }));

  // Alerts & Watchlist — /api/intel/alerts/*, /api/intel/watchlist/*
  app.use('/api', createWatchlistRoutes({
    alerts:    deps.alerts,
    watchlist: deps.watchlist,
    markets:   deps.markets,
    scanner:   deps.scanner,
  }));
};
