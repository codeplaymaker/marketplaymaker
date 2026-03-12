/**
 * Route index — mounts all route modules on the Express app.
 *
 * Usage in server.js:
 *   const mountRoutes = require('./routes');
 *   mountRoutes(app, deps);
 */

const createMarketsRoutes   = require('./markets');
const createRiskRoutes      = require('./risk');
const createTradingRoutes   = require('./trading');
const createIntelRoutes     = require('./intel');
const createSocialRoutes    = require('./social');
const createWatchlistRoutes = require('./watchlist');
const createICTRoutes       = require('./ict');
const createAlphaRoutes     = require('./alpha');
const createInfraRoutes     = require('./infra');

module.exports = function mountRoutes(app, deps) {
  // Markets & Opportunities
  app.use('/api', createMarketsRoutes({
    markets: deps.markets, client: deps.client, scanner: deps.scanner,
    executor: deps.executor, kalshiClient: deps.kalshiClient,
    kalshiMarkets: deps.kalshiMarkets, config: deps.config,
  }));

  // Risk, Performance, Calibration & Database
  app.use('/api', createRiskRoutes({
    riskManager: deps.riskManager, scanner: deps.scanner,
    executor: deps.executor, resolver: deps.resolver, database: deps.database,
  }));

  // Bot Control, Trades, Orders & Paper Trading
  app.use('/api', createTradingRoutes({
    scanner: deps.scanner, executor: deps.executor,
    riskManager: deps.riskManager, paperTrader: deps.paperTrader,
  }));

  // Intel / Analytics (odds, accas, picks, learning, signals, PnL, webhooks)
  app.use('/api', createIntelRoutes({
    oddsApi: deps.oddsApi, markets: deps.markets, scanner: deps.scanner,
    signalTracker: deps.signalTracker, alerts: deps.alerts, watchlist: deps.watchlist,
    accaBuilder: deps.accaBuilder, picksTracker: deps.picksTracker,
    picksLearner: deps.picksLearner, paperTrader: deps.paperTrader,
    independentSignals: deps.independentSignals, edgeResolver: deps.edgeResolver,
    wsClient: deps.wsClient, newsSignal: deps.newsSignal, client: deps.client,
    kalshiMarkets: deps.kalshiMarkets, scanState: deps.scanState, webhooks: deps.webhooks,
  }));

  // Social / Cultural Intelligence (YouTube, Twitter, Cultural Events)
  app.use('/api', createSocialRoutes({
    youtubeTracker: deps.youtubeTracker, twitterTracker: deps.twitterTracker,
    culturalEvents: deps.culturalEvents, markets: deps.markets,
    edgeResolver: deps.edgeResolver,
  }));

  // Alerts & Watchlist
  app.use('/api', createWatchlistRoutes({
    alerts: deps.alerts, watchlist: deps.watchlist,
    markets: deps.markets, scanner: deps.scanner,
  }));

  // ICT Playbook (technical analysis engine)
  app.use('/api', createICTRoutes());

  // Alpha Engines (new market detector, news reactor, panic dips, calibration, pipeline)
  app.use('/api', createAlphaRoutes({
    newMarketDetector: deps.newMarketDetector,
    newsReactor: deps.newsReactor,
    panicDipDetector: deps.panicDipDetector,
    calibrationCollector: deps.calibrationCollector,
    executionPipeline: deps.executionPipeline,
  }));

  // Infrastructure (health, optimizer, ensemble, news stream, cleanup, WS)
  app.use('/api', createInfraRoutes({
    healthMonitor: deps.healthMonitor,
    logCleanup: deps.logCleanup,
    strategyOptimizer: deps.strategyOptimizer,
    probabilityEnsemble: deps.probabilityEnsemble,
    wsServer: deps.wsServer,
    newsStream: deps.newsStream,
  }));
};
