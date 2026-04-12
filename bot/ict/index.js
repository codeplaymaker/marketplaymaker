/**
 * ICT Gold Bot — Main Entry Point
 * 
 * Runs on Railway, connects to IC Markets MT4 via MetaAPI.
 * Scans XAUUSD every bar for ICT setups: MSS, FVG, OB, OTE, LiqSweep.
 * Auto-adapts weights based on trade results.
 * 
 * Env vars required:
 *   META_API_TOKEN        - Your MetaAPI auth token
 *   META_API_ACCOUNT_ID   - Your MT4 account ID in MetaAPI
 *   TELEGRAM_BOT_TOKEN    - (optional) For trade alerts
 *   TELEGRAM_CHAT_ID      - (optional) Your chat ID
 */
const config = require('./config');
const ictAnalysis = require('./ictAnalysis');
const executor = require('./executor');
const adaptive = require('./adaptiveLearner');
const sessions = require('./sessions');
const log = require('../utils/logger');

let scanTimer = null;
let running = false;
let lastBarTimes = {};  // per-symbol
let startTime = Date.now();
let scanCount = 0;

/**
 * Main scan loop — runs every minute, acts on new bars
 */
async function scan() {
  try {
    scanCount++;

    // 1. Manage existing position every tick
    await executor.managePosition();

    // 2. Close before lunch
    if (sessions.shouldCloseForLunch()) {
      await executor.closeAllPositions('Pre-lunch close');
      return;
    }

    // 3. Session check (same for all symbols)
    const sessionCheck = sessions.isSessionAllowed(adaptive);
    if (!sessionCheck.allowed) {
      if (scanCount % 60 === 0) {
        log.info(`[ICT Bot] Off-session: ${sessionCheck.reason}`);
      }
      return;
    }

    // 4. Scan each symbol
    for (const symbol of config.symbols) {
      await scanSymbol(symbol, sessionCheck);
    }

  } catch (e) {
    log.error('[ICT Bot] Scan error:', e.message);
  }
}

/**
 * Scan a single symbol for ICT setups
 */
async function scanSymbol(symbol, sessionCheck) {
  try {
    // Get candles
    const [m5Candles, h4Candles, dailyCandles] = await Promise.all([
      executor.getCandles(symbol, config.timeframe, 200),
      executor.getCandles(symbol, config.htfTimeframe, 100),
      executor.getCandles(symbol, '1d', 30),
    ]);

    if (!m5Candles.length) return;

    // Check for new bar
    const curBarTime = m5Candles[m5Candles.length - 1].time;
    if (curBarTime === lastBarTimes[symbol]) return;
    lastBarTimes[symbol] = curBarTime;

    // ADR check
    if (!ictAnalysis.isADROK(dailyCandles)) {
      return;
    }

    // Run ICT analysis (pass symbol for per-symbol state)
    const analysis = ictAnalysis.analyze(m5Candles, h4Candles, dailyCandles, symbol);
    if (!analysis) return;

    // Check for signals
    const signal = analysis.signals.long || analysis.signals.short;
    if (!signal) return;

    // Tag signal with symbol
    signal.symbol = symbol;

    // Apply adaptive weight
    const weight = adaptive.getWeight(signal.entryType);
    const adaptedConf = signal.confluence * weight;
    if (adaptedConf < config.minConfluence) {
      log.info(`[ICT Bot] ${symbol} signal rejected — adapted confluence ${adaptedConf.toFixed(1)} < ${config.minConfluence} (${signal.entryType} weight: ${weight.toFixed(2)})`);
      return;
    }

    // Execute trade
    log.info(`[ICT Bot] ${symbol} SIGNAL: ${signal.direction.toUpperCase()} | ${signal.entryType} | Conf: ${signal.confluence} (adapted: ${adaptedConf.toFixed(1)}) | Session: ${sessionCheck.session}`);

    const trade = await executor.executeTrade(signal);

    if (trade) {
      await sendTelegramAlert(signal, trade);
    }
  } catch (e) {
    log.error(`[ICT Bot] ${symbol} scan error:`, e.message);
  }
}

/**
 * Send Telegram notification
 */
async function sendTelegramAlert(signal, trade) {
  if (!config.telegramToken || !config.telegramChatId) return;

  const emoji = signal.direction === 'buy' ? '🟢' : '🔴';
  const text = [
    `${emoji} *ICT ${signal.symbol} ${signal.direction.toUpperCase()}*`,
    ``,
    `Entry: ${signal.entryType} | Conf: ${signal.confluence}`,
    `Price: $${signal.entryPrice.toFixed(2)}`,
    `SL: $${signal.sl.toFixed(2)}`,
    `TP1: $${signal.tp1.toFixed(2)} (${config.tp1RR}R)`,
    `TP2: $${signal.tp2.toFixed(2)} (${config.tp2RR}R)`,
    `Lots: ${trade.lots}`,
    `Session: ${trade.session || 'N/A'}`,
    `Structure: ${signal.structureBias === 1 ? 'Bullish' : 'Bearish'}`,
    `HTF: ${signal.htfBias === 1 ? 'Bull' : signal.htfBias === -1 ? 'Bear' : 'Flat'}`,
  ].join('\n');

  try {
    const url = `https://api.telegram.org/bot${config.telegramToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
    if (!res.ok) log.error('[ICT Bot] Telegram alert failed:', res.status);
  } catch (e) {
    log.error('[ICT Bot] Telegram error:', e.message);
  }
}

/**
 * Start the bot
 */
async function start() {
  log.info('═══════════════════════════════════════');
  log.info('  ICT Gold Bot v1.0 starting...');
  log.info('═══════════════════════════════════════');

  if (!config.metaApi.token || !config.metaApi.accountId) {
    log.error('[ICT Bot] Missing META_API_TOKEN or META_API_ACCOUNT_ID');
    return false;
  }

  // Connect to MetaAPI
  const connected = await executor.init();
  if (!connected) {
    log.error('[ICT Bot] Failed to connect to MetaAPI');
    return false;
  }

  // Log account info
  const acctInfo = await executor.getAccountInfo();
  if (acctInfo) {
    log.info(`[ICT Bot] Account: ${acctInfo.name || 'N/A'} | Balance: $${acctInfo.balance?.toFixed(2)} | Equity: $${acctInfo.equity?.toFixed(2)}`);
  }

  // Log adaptive state
  const adaptSummary = adaptive.getSummary();
  log.info(`[ICT Bot] Adaptive: ${adaptSummary.totalTrades} historical trades | LotMult: ${adaptSummary.lotMultiplier}`);

  // Start scan loop
  running = true;
  scanTimer = setInterval(scan, config.scanIntervalMs);
  log.info(`[ICT Bot] Scanner started — checking every ${config.scanIntervalMs / 1000}s`);
  log.info(`[ICT Bot] Symbols: ${config.symbols.join(', ')} | TF: ${config.timeframe} | HTF: ${config.htfTimeframe}`);
  log.info(`[ICT Bot] Risk: ${config.riskPercent}% | MaxDaily: ${config.maxDailyTrades} | MinConf: ${config.minConfluence}`);

  // Run first scan immediately
  setTimeout(scan, 5000);

  return true;
}

function stop() {
  if (scanTimer) clearInterval(scanTimer);
  running = false;
  log.info('[ICT Bot] Stopped');
}

/**
 * Health/status endpoint data
 */
function getStatus() {
  const adaptSummary = adaptive.getSummary();
  const sessionCheck = sessions.isSessionAllowed(adaptive);

  // Per-symbol state
  const symbolStates = {};
  for (const symbol of config.symbols) {
    const s = ictAnalysis.getState(symbol);
    symbolStates[symbol] = {
      structure: s.structureBias === 1 ? 'BULLISH' : s.structureBias === -1 ? 'BEARISH' : 'NEUTRAL',
      htfBias: s.htfBias === 1 ? 'BULL' : s.htfBias === -1 ? 'BEAR' : 'FLAT',
      activeFVGs: s.fvgs?.filter(f => f.active).length || 0,
      activeOBs: s.obs?.filter(o => o.active).length || 0,
    };
  }

  // Backward-compat: pick first symbol for top-level fields
  const firstState = symbolStates[config.symbols[0]] || {};

  return {
    running,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    connected: executor.isConnected(),
    symbols: config.symbols,
    symbol: config.symbols.join(', '),
    timeframe: config.timeframe,
    scanCount,
    dailyTrades: executor.getDailyTrades(),
    maxDailyTrades: config.maxDailyTrades,
    openTrade: executor.getOpenTrade(),
    session: sessionCheck.session || 'off-hours',
    sessionAllowed: sessionCheck.allowed,
    structure: firstState.structure || 'NEUTRAL',
    htfBias: firstState.htfBias || 'FLAT',
    activeFVGs: Object.values(symbolStates).reduce((s, v) => s + v.activeFVGs, 0),
    activeOBs: Object.values(symbolStates).reduce((s, v) => s + v.activeOBs, 0),
    symbolStates,
    adaptive: adaptSummary,
    config: { minConfluence: config.minConfluence, useHTFBias: config.useHTFBias, riskPercent: config.riskPercent },
  };
}

module.exports = { start, stop, scan, getStatus };
