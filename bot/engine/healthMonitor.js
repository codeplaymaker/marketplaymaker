/**
 * Health Monitor — Tracks system component health and alerts on failures.
 *
 * Monitors:
 *   - Data sources (14 external feeds) — uptime, latency, error rate
 *   - Engine modules — running state, last activity
 *   - API connectivity — Polymarket, Kalshi, Binance
 *   - Resource usage — memory, event loop lag
 *   - Database — connection, write latency
 *
 * Alerts via Telegram when components degrade or fail.
 */
const log = require('../utils/logger');

// ─── Component Registry ──────────────────────────────────────────────
const components = new Map(); // name → ComponentState

class ComponentState {
  constructor(name, category, critical = false) {
    this.name = name;
    this.category = category;
    this.critical = critical;
    this.status = 'unknown'; // healthy | degraded | down | unknown
    this.lastCheck = null;
    this.lastSuccess = null;
    this.lastError = null;
    this.errorMessage = null;
    this.consecutiveErrors = 0;
    this.totalChecks = 0;
    this.totalErrors = 0;
    this.latencyMs = null;
    this.latencyHistory = []; // last 20 readings
    this.metadata = {};
  }

  recordSuccess(latencyMs = null, metadata = {}) {
    this.lastCheck = new Date().toISOString();
    this.lastSuccess = this.lastCheck;
    this.consecutiveErrors = 0;
    this.totalChecks++;
    this.status = 'healthy';
    this.errorMessage = null;
    if (latencyMs !== null) {
      this.latencyMs = latencyMs;
      this.latencyHistory.push(latencyMs);
      if (this.latencyHistory.length > 20) this.latencyHistory.shift();
      // Mark degraded if p95 latency > 5s
      const p95 = this.getP95Latency();
      if (p95 > 5000) this.status = 'degraded';
    }
    Object.assign(this.metadata, metadata);
  }

  recordError(error, metadata = {}) {
    this.lastCheck = new Date().toISOString();
    this.lastError = this.lastCheck;
    this.errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
    this.consecutiveErrors++;
    this.totalChecks++;
    this.totalErrors++;
    this.status = this.consecutiveErrors >= 3 ? 'down' : 'degraded';
    Object.assign(this.metadata, metadata);
  }

  getP95Latency() {
    if (this.latencyHistory.length === 0) return 0;
    const sorted = [...this.latencyHistory].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
  }

  getErrorRate() {
    return this.totalChecks > 0 ? (this.totalErrors / this.totalChecks) : 0;
  }

  toJSON() {
    return {
      name: this.name,
      category: this.category,
      critical: this.critical,
      status: this.status,
      lastCheck: this.lastCheck,
      lastSuccess: this.lastSuccess,
      lastError: this.lastError,
      errorMessage: this.errorMessage,
      consecutiveErrors: this.consecutiveErrors,
      errorRate: Math.round(this.getErrorRate() * 1000) / 10, // percent
      latencyMs: this.latencyMs,
      p95LatencyMs: Math.round(this.getP95Latency()),
      totalChecks: this.totalChecks,
      metadata: this.metadata,
    };
  }
}

// ─── Register Components ─────────────────────────────────────────────
function register(name, category, critical = false) {
  const comp = new ComponentState(name, category, critical);
  components.set(name, comp);
  return comp;
}

function recordSuccess(name, latencyMs = null, metadata = {}) {
  const comp = components.get(name);
  if (!comp) return;
  const wasDown = comp.status === 'down';
  comp.recordSuccess(latencyMs, metadata);
  if (wasDown) {
    log.info('HEALTH', `✅ ${name} recovered after ${comp.totalErrors} errors`);
    _fireRecoveryAlert(comp);
  }
}

function recordError(name, error, metadata = {}) {
  const comp = components.get(name);
  if (!comp) return;
  comp.recordError(error, metadata);
  if (comp.status === 'down' && comp.consecutiveErrors === 3) {
    log.error('HEALTH', `🚨 ${name} is DOWN: ${comp.errorMessage}`);
    _fireDownAlert(comp);
  }
}

// ─── System Health Check ─────────────────────────────────────────────
function getStatus() {
  const all = [];
  for (const [, comp] of components) {
    all.push(comp.toJSON());
  }

  const healthy = all.filter(c => c.status === 'healthy').length;
  const degraded = all.filter(c => c.status === 'degraded').length;
  const down = all.filter(c => c.status === 'down').length;
  const unknown = all.filter(c => c.status === 'unknown').length;
  const criticalDown = all.filter(c => c.status === 'down' && c.critical).length;

  // System-level metrics
  const mem = process.memoryUsage();
  const system = {
    uptime: process.uptime(),
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
      externalMB: Math.round(mem.external / 1024 / 1024),
    },
    eventLoopLagMs: _lastEventLoopLag,
  };

  let overallStatus = 'healthy';
  if (criticalDown > 0) overallStatus = 'critical';
  else if (down > 0) overallStatus = 'degraded';
  else if (degraded > 2) overallStatus = 'degraded';

  return {
    overallStatus,
    timestamp: new Date().toISOString(),
    summary: { total: all.length, healthy, degraded, down, unknown },
    system,
    components: all,
    byCategory: _groupByCategory(all),
  };
}

function _groupByCategory(all) {
  const cats = {};
  for (const c of all) {
    if (!cats[c.category]) cats[c.category] = [];
    cats[c.category].push(c);
  }
  return cats;
}

// ─── Event Loop Lag Monitoring ───────────────────────────────────────
let _lastEventLoopLag = 0;
let _lagInterval = null;

function _monitorEventLoop() {
  let lastTime = Date.now();
  _lagInterval = setInterval(() => {
    const now = Date.now();
    const expected = 1000;
    const lag = Math.max(0, now - lastTime - expected);
    _lastEventLoopLag = lag;
    lastTime = now;
    if (lag > 500) {
      log.warn('HEALTH', `Event loop lag: ${lag}ms (expected <50ms)`);
    }
  }, 1000);
}

// ─── Periodic Health Sweep ───────────────────────────────────────────
let _sweepInterval = null;
let _alertCallback = null;

function start(options = {}) {
  _alertCallback = options.onAlert || null;
  _monitorEventLoop();

  // Register default system components
  register('polymarket-api', 'api', true);
  register('polymarket-clob', 'api', true);
  register('kalshi-api', 'api', false);
  register('binance-ws', 'api', false);
  register('gamma-api', 'api', true);

  // Data sources
  register('news-rss', 'data', false);
  register('espn-data', 'data', false);
  register('bookmaker-odds', 'data', false);
  register('twitter-tracker', 'data', false);
  register('youtube-tracker', 'data', false);
  register('cultural-events', 'data', false);
  register('llm-analysis', 'data', false);
  register('independent-signals', 'data', true);
  register('news-signal', 'data', false);

  // Engines
  register('scanner', 'engine', true);
  register('executor', 'engine', true);
  register('risk-manager', 'engine', true);
  register('probability-model', 'engine', false);
  register('new-market-detector', 'engine', false);
  register('news-reactor', 'engine', false);
  register('panic-dip-detector', 'engine', false);
  register('calibration-collector', 'engine', false);
  register('execution-pipeline', 'engine', false);
  register('edge-resolver', 'engine', false);

  // Infrastructure
  register('sqlite-db', 'infra', false);
  register('telegram-bot', 'infra', false);

  // Run sweep every 60s to check for stale components
  _sweepInterval = setInterval(_staleSweep, 60000);

  log.info('HEALTH', `Health monitor started: ${components.size} components registered`);
}

function stop() {
  if (_lagInterval) clearInterval(_lagInterval);
  if (_sweepInterval) clearInterval(_sweepInterval);
  _lagInterval = null;
  _sweepInterval = null;
}

function _staleSweep() {
  const now = Date.now();
  const staleThresholdMs = 5 * 60 * 1000; // 5 minutes without a check = stale

  for (const [name, comp] of components) {
    if (comp.lastCheck && (now - new Date(comp.lastCheck).getTime()) > staleThresholdMs) {
      if (comp.status !== 'unknown') {
        comp.status = 'unknown';
        log.debug('HEALTH', `${name} marked unknown — no checks for 5+ minutes`);
      }
    }
  }

  // Memory alert
  const mem = process.memoryUsage();
  if (mem.heapUsed > 512 * 1024 * 1024) { // > 512MB
    log.warn('HEALTH', `High memory usage: ${Math.round(mem.heapUsed / 1024 / 1024)}MB heap`);
  }
}

function _fireDownAlert(comp) {
  if (_alertCallback) {
    _alertCallback({
      type: 'component_down',
      component: comp.name,
      category: comp.category,
      critical: comp.critical,
      message: `🚨 ${comp.critical ? 'CRITICAL' : ''} ${comp.name} is DOWN: ${comp.errorMessage}`,
      consecutiveErrors: comp.consecutiveErrors,
    });
  }
}

function _fireRecoveryAlert(comp) {
  if (_alertCallback) {
    _alertCallback({
      type: 'component_recovered',
      component: comp.name,
      message: `✅ ${comp.name} recovered`,
    });
  }
}

module.exports = {
  register,
  recordSuccess,
  recordError,
  getStatus,
  start,
  stop,
};
