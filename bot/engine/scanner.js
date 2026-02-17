const markets = require('../polymarket/markets');
const strategies = require('../strategies');
const log = require('../utils/logger');
const config = require('../config');
const resolver = require('./resolver');
const riskManager = require('./riskManager');
const executor = require('./executor');
const paperTrader = require('./paperTrader');
const alerts = require('./alerts');
const signalTracker = require('./signalTracker');
const fs = require('fs');
const path = require('path');

// Kalshi integration — optional
let kalshiMarkets = null;
try { kalshiMarkets = require('../kalshi/markets'); } catch { /* optional */ }

const SCANNER_STATE_FILE = path.join(__dirname, '..', 'logs', 'scanner-state.json');

// New modules — optional (graceful if missing)
let wsClient = null;
let newsSignal = null;
try { wsClient = require('../polymarket/websocket'); } catch { /* optional */ }
try { newsSignal = require('../data/newsSignal'); } catch { /* optional */ }

let independentSignals = null;
try { independentSignals = require('../data/independentSignals'); } catch { /* optional */ }

let scanInterval = null;
let isRunning = false;
let lastScan = null;
let opportunities = [];
let bankroll = 1000;
let scanCount = 0;
let lastIndependentResults = null;

// Load persisted bankroll
try {
  if (fs.existsSync(SCANNER_STATE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(SCANNER_STATE_FILE, 'utf8'));
    if (saved.bankroll > 0) {
      bankroll = saved.bankroll;
      log.info('SCANNER', `Loaded bankroll $${bankroll} from disk`);
    }
  }
} catch { /* use default */ }

function saveScannerState() {
  try {
    fs.writeFileSync(SCANNER_STATE_FILE, JSON.stringify({ bankroll, savedAt: new Date().toISOString() }, null, 2));
  } catch { /* non-critical */ }
}

/**
 * Market Scanner Engine v3
 *
 * UPGRADES:
 * - WebSocket: subscribes to top markets for real-time orderbook data
 * - News sentiment: periodically fetches headlines for sentiment signal
 * - Pending orders: checks limit/TWAP orders each scan cycle
 * - Richer status reporting
 */

async function scan() {
  try {
    log.info('SCANNER', 'Running scan cycle...');
    scanCount++;

    // Refresh market data (Polymarket)
    const polyMarkets = await markets.refreshMarkets();
    // Tag Polymarket markets with platform
    for (const m of polyMarkets) { if (!m.platform) m.platform = 'POLYMARKET'; }

    // Refresh market data (Kalshi)
    let kalshiMkts = [];
    if (kalshiMarkets && config.kalshi?.enabled !== false) {
      try {
        kalshiMkts = await kalshiMarkets.refreshMarkets();
        log.info('SCANNER', `Kalshi: ${kalshiMkts.length} markets loaded`);
      } catch (err) {
        log.warn('SCANNER', `Kalshi refresh failed: ${err.message}`);
      }
    }

    const allMarkets = [...polyMarkets, ...kalshiMkts];
    if (allMarkets.length === 0) {
      log.warn('SCANNER', 'No markets available');
      lastScan = new Date().toISOString();
      return {
        scanNumber: scanCount,
        timestamp: lastScan,
        marketsScanned: 0,
        opportunitiesFound: 0,
        topOpportunities: [],
        warning: 'No active markets found',
      };
    }

    // Subscribe top markets to WebSocket for real-time data
    if (wsClient && wsClient.getStatus().connected) {
      const topByVolume = allMarkets
        .sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0))
        .slice(0, 30);
      for (const m of topByVolume) {
        if (m.yesTokenId) wsClient.subscribe(m.yesTokenId);
        if (m.noTokenId) wsClient.subscribe(m.noTokenId);
      }
    }

    // Run all strategies
    const newOpps = await strategies.runAll(allMarkets, bankroll);
    opportunities = newOpps;
    lastScan = new Date().toISOString();

    // Record paper trades for performance tracking
    if (newOpps.length > 0) {
      paperTrader.recordScanResults(newOpps);
      // Record signals for credibility tracking
      for (const opp of newOpps.slice(0, 10)) {
        signalTracker.recordSignal(opp);
      }
    }

    // Record price snapshots & check alerts
    alerts.recordPriceSnapshot(allMarkets);
    const firedAlerts = alerts.checkAlerts(allMarkets, newOpps);

    // Check pending limit/TWAP orders
    let pendingResult = { filled: 0, expired: 0, pending: 0 };
    if (executor.checkPendingOrders) {
      const priceMap = {};
      for (const m of allMarkets) {
        if (m.conditionId) priceMap[m.conditionId] = m.yesPrice;
      }
      pendingResult = executor.checkPendingOrders(priceMap);
    }

    // Run independent signal analysis (LLM + Polling + Expert)
    let independentEdges = [];
    if (independentSignals) {
      try {
        const indResults = await independentSignals.batchAnalyze(allMarkets, {
          maxMarkets: 15,
          skipLLM: scanCount % 3 !== 0, // LLM every 3rd scan to save API costs
        });
        // Store edge results for status reporting
        for (const [condId, signal] of indResults) {
          if (signal.edgeSignal === 'STRONG' || signal.edgeSignal === 'MODERATE') {
            independentEdges.push({ conditionId: condId, ...signal });
          }
        }
        lastIndependentResults = indResults;
        log.info('SCANNER', `Independent signals: ${indResults.size} analyzed, ${independentEdges.length} edges found`);
      } catch (err) {
        log.warn('SCANNER', `Independent signal batch failed: ${err.message}`);
      }
    }

    log.info('SCANNER', `Scan #${scanCount}: ${newOpps.length} opps from ${allMarkets.length} markets | pending: ${pendingResult.pending}${firedAlerts.length > 0 ? ` | 🔔 ${firedAlerts.length} alerts` : ''}${independentEdges.length > 0 ? ` | 🧠 ${independentEdges.length} independent edges` : ''}`);

    return {
      scanNumber: scanCount,
      timestamp: lastScan,
      marketsScanned: allMarkets.length,
      opportunitiesFound: newOpps.length,
      topOpportunities: newOpps.slice(0, 5),
      pendingOrders: pendingResult,
      alerts: firedAlerts,
      independentEdges: independentEdges.slice(0, 10),
    };
  } catch (err) {
    log.error('SCANNER', `Scan failed: ${err.message}`);
    return {
      scanNumber: scanCount,
      timestamp: new Date().toISOString(),
      marketsScanned: 0,
      opportunitiesFound: 0,
      topOpportunities: [],
      error: err.message,
    };
  }
}

function start(initialBankroll) {
  if (isRunning) {
    log.warn('SCANNER', 'Scanner already running');
    return;
  }

  if (initialBankroll) bankroll = initialBankroll;
  isRunning = true;

  log.info('SCANNER', `Starting scanner v3 with $${bankroll} bankroll`);

  // Start WebSocket connection for real-time data
  if (wsClient) {
    try {
      wsClient.connect();
      log.info('SCANNER', 'WebSocket client connecting...');
    } catch (err) {
      log.warn('SCANNER', `WebSocket failed to start: ${err.message}`);
    }
  }

  // Start news sentiment periodic fetch
  if (newsSignal && newsSignal.startPeriodicFetch) {
    try {
      newsSignal.startPeriodicFetch(15 * 60 * 1000); // Every 15 min
      log.info('SCANNER', 'News sentiment signal started');
    } catch (err) {
      log.warn('SCANNER', `News signal failed: ${err.message}`);
    }
  }

  // Start resolution tracker (for real positions)
  resolver.startChecking(
    () => riskManager.getPositions(),
    (resolution) => {
      log.info('SCANNER', `Market resolved: "${resolution.position?.market}" → ${resolution.resolution?.outcome}`);
      if (resolution.position) {
        riskManager.closePosition(
          resolution.position.conditionId,
          resolution.position.side,
          resolution.resolution?.outcome === 'YES' ? 1 : 0
        );
      }
    }
  );

  // Start paper trade auto-resolution checker (the self-learning loop)
  paperTrader.startResolutionChecker();
  log.info('SCANNER', 'Self-learning paper trade system started');

  // Run immediately, then on interval
  scan();
  scanInterval = setInterval(scan, config.scanner.opportunityScanMs);
}

function stop() {
  if (!isRunning) return;

  clearInterval(scanInterval);
  scanInterval = null;
  isRunning = false;
  resolver.stopChecking();

  // Disconnect WebSocket
  if (wsClient && wsClient.disconnect) {
    try { wsClient.disconnect(); } catch { /* ignore */ }
  }

  // Stop news fetching
  if (newsSignal && newsSignal.stopPeriodicFetch) {
    try { newsSignal.stopPeriodicFetch(); } catch { /* ignore */ }
  }

  // Stop paper trade auto-resolution
  paperTrader.stopResolutionChecker();

  log.info('SCANNER', 'Scanner stopped');
}

function getStatus() {
  const polyCount = markets.getCachedMarkets().length;
  const kalshiCount = kalshiMarkets ? kalshiMarkets.getCachedMarkets().length : 0;

  const status = {
    running: isRunning,
    lastScan,
    scanCount,
    bankroll,
    opportunityCount: opportunities.length,
    intervalMs: config.scanner.opportunityScanMs,
    platforms: {
      polymarket: { markets: polyCount, enabled: true },
      kalshi: { markets: kalshiCount, enabled: !!(kalshiMarkets && config.kalshi?.enabled !== false) },
    },
  };

  // WebSocket status
  if (wsClient) {
    try {
      status.websocket = wsClient.getStatus();
    } catch { status.websocket = { available: false }; }
  }

  // News signal status
  if (newsSignal && newsSignal.getStatus) {
    try {
      status.newsSignal = newsSignal.getStatus();
    } catch { status.newsSignal = { available: false }; }
  }

  // Paper trade / self-learning status
  try {
    status.paperTrading = paperTrader.getStats();
  } catch { status.paperTrading = { available: false }; }

  // Independent signal sources status
  if (independentSignals) {
    try {
      status.independentSources = independentSignals.getStatus();
      if (lastIndependentResults) {
        status.independentSources.lastResultCount = lastIndependentResults.size;
      }
    } catch { status.independentSources = { available: false }; }
  }

  return status;
}

function getOpportunities(limit = 50) {
  return opportunities.slice(0, limit);
}

function getOpportunitiesByStrategy(strategyName) {
  return opportunities.filter((o) => o.strategy === strategyName);
}

function setBankroll(amount) {
  bankroll = amount;
  saveScannerState();
  log.info('SCANNER', `Bankroll updated to $${bankroll}`);
}

function getBankroll() {
  return bankroll;
}

module.exports = {
  scan,
  start,
  stop,
  getStatus,
  getOpportunities,
  getOpportunitiesByStrategy,
  setBankroll,
  getBankroll,
};
