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
let lastBarTime = 0;
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

    // 3. Get candles
    const [m5Candles, h4Candles, dailyCandles] = await Promise.all([
      executor.getCandles(config.symbol, config.timeframe, 200),
      executor.getCandles(config.symbol, config.htfTimeframe, 100),
      executor.getCandles(config.symbol, '1d', 30),
    ]);

    if (!m5Candles.length) return;

    // 4. Check for new bar (skip duplicate analysis)
    const curBarTime = m5Candles[m5Candles.length - 1].time;
    if (curBarTime === lastBarTime) return;
    lastBarTime = curBarTime;

    // 5. Session check
    const sessionCheck = sessions.isSessionAllowed(adaptive);
    if (!sessionCheck.allowed) {
      if (scanCount % 60 === 0) { // Log every ~60 scans
        log.info(`[ICT Bot] Off-session: ${sessionCheck.reason}`);
      }
      return;
    }

    // 6. ADR check
    if (!ictAnalysis.isADROK(dailyCandles)) {
      log.info('[ICT Bot] ADR exhausted — skipping');
      return;
    }

    // 7. Run ICT analysis
    const analysis = ictAnalysis.analyze(m5Candles, h4Candles, dailyCandles);
    if (!analysis) return;

    // 8. Check for signals
    const signal = analysis.signals.long || analysis.signals.short;
    if (!signal) return;

    // 9. Apply adaptive weight to confluence
    const weight = adaptive.getWeight(signal.entryType);
    const adaptedConf = signal.confluence * weight;
    if (adaptedConf < config.minConfluence) {
      log.info(`[ICT Bot] Signal rejected — adapted confluence ${adaptedConf.toFixed(1)} < ${config.minConfluence} (${signal.entryType} weight: ${weight.toFixed(2)})`);
      return;
    }

    // 10. Execute trade
    log.info(`[ICT Bot] SIGNAL: ${signal.direction.toUpperCase()} | ${signal.entryType} | Conf: ${signal.confluence} (adapted: ${adaptedConf.toFixed(1)}) | Session: ${sessionCheck.session}`);

    const trade = await executor.executeTrade(signal);

    if (trade) {
      // Send Telegram alert
      await sendTelegramAlert(signal, trade);
    }

  } catch (e) {
    log.error('[ICT Bot] Scan error:', e.message);
  }
}

/**
 * Send Telegram notification
 */
async function sendTelegramAlert(signal, trade) {
  if (!config.telegramToken || !config.telegramChatId) return;

  const emoji = signal.direction === 'buy' ? '🟢' : '🔴';
  const text = [
    `${emoji} *ICT Gold ${signal.direction.toUpperCase()}*`,
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
  log.info(`[ICT Bot] Symbol: ${config.symbol} | TF: ${config.timeframe} | HTF: ${config.htfTimeframe}`);
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
  const ictState = ictAnalysis.getState();
  const sessionCheck = sessions.isSessionAllowed(adaptive);

  return {
    running,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    connected: executor.isConnected(),
    symbol: config.symbol,
    timeframe: config.timeframe,
    scanCount,
    dailyTrades: executor.getDailyTrades(),
    maxDailyTrades: config.maxDailyTrades,
    openTrade: executor.getOpenTrade(),
    session: sessionCheck.session || 'off-hours',
    sessionAllowed: sessionCheck.allowed,
    structure: ictState.structureBias === 1 ? 'BULLISH' : ictState.structureBias === -1 ? 'BEARISH' : 'NEUTRAL',
    htfBias: ictState.htfBias === 1 ? 'BULL' : ictState.htfBias === -1 ? 'BEAR' : 'FLAT',
    activeFVGs: ictState.fvgs?.filter(f => f.active).length || 0,
    activeOBs: ictState.obs?.filter(o => o.active).length || 0,
    adaptive: adaptSummary,
  };
}

module.exports = { start, stop, scan, getStatus };
