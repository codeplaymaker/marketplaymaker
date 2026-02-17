const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
let currentLevel = LOG_LEVELS.INFO;

// ─── Async Write Stream (non-blocking) ───────────────────────────────
// Use a rotating write stream per day to avoid blocking the event loop.
let _currentDate = '';
let _logStream = null;
let _tradeStream = null;

function getLogStream() {
  const date = new Date().toISOString().slice(0, 10);
  if (date !== _currentDate || !_logStream) {
    if (_logStream) _logStream.end();
    if (_tradeStream) _tradeStream.end();
    _currentDate = date;
    _logStream = fs.createWriteStream(path.join(LOG_DIR, `bot-${date}.log`), { flags: 'a' });
    _tradeStream = fs.createWriteStream(path.join(LOG_DIR, `trades-${date}.json`), { flags: 'a' });
    _logStream.on('error', () => {}); // Swallow write errors silently
    _tradeStream.on('error', () => {});
  }
  return { logStream: _logStream, tradeStream: _tradeStream };
}

function timestamp() {
  return new Date().toISOString();
}

function formatMsg(level, category, message, data) {
  const entry = {
    ts: timestamp(),
    level,
    cat: category,
    msg: message,
    ...(data && { data }),
  };
  return JSON.stringify(entry);
}

function log(level, category, message, data) {
  if (LOG_LEVELS[level] > currentLevel) return;
  const line = formatMsg(level, category, message, data);
  // Non-blocking write
  try { getLogStream().logStream.write(line + '\n'); } catch { /* ignore */ }
  const color = { ERROR: '\x1b[31m', WARN: '\x1b[33m', INFO: '\x1b[36m', DEBUG: '\x1b[90m' }[level] || '';
  console.log(`${color}[${timestamp()}] [${level}] [${category}] ${message}\x1b[0m`, data || '');
}

// Trade-specific log (persisted separately for P&L analysis)
const tradeLog = [];

function logTrade(trade) {
  const entry = { ...trade, ts: timestamp() };
  tradeLog.push(entry);
  // Non-blocking write
  try { getLogStream().tradeStream.write(JSON.stringify(entry) + '\n'); } catch { /* ignore */ }
  log('INFO', 'TRADE', `${trade.action} ${trade.side} ${trade.shares}@${trade.price} on ${trade.market}`, trade);
}

function getTradeLog() {
  return [...tradeLog];
}

function setLevel(level) {
  if (LOG_LEVELS[level] !== undefined) currentLevel = LOG_LEVELS[level];
}

// Graceful shutdown — flush streams
function flush() {
  if (_logStream) _logStream.end();
  if (_tradeStream) _tradeStream.end();
}

module.exports = {
  error: (cat, msg, data) => log('ERROR', cat, msg, data),
  warn: (cat, msg, data) => log('WARN', cat, msg, data),
  info: (cat, msg, data) => log('INFO', cat, msg, data),
  debug: (cat, msg, data) => log('DEBUG', cat, msg, data),
  logTrade,
  getTradeLog,
  setLevel,
  flush,
};
