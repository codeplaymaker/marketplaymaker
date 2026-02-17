/**
 * Market Alerts Engine
 *
 * Monitors markets and fires alerts when conditions are met.
 * This is the core engagement feature for the intelligence platform —
 * users set alerts and get notified when something interesting happens.
 *
 * Alert types:
 *   PRICE_MOVE    — Market moves X% in Y minutes
 *   DIVERGENCE    — Polymarket vs bookmaker diverges by X%
 *   NEW_SIGNAL    — High-score opportunity appears (score >= threshold)
 *   VOLUME_SPIKE  — 24h volume jumps significantly
 *   RESOLUTION    — Market resolves (YES/NO)
 *
 * Alerts are checked on each scan cycle. Fired alerts are stored
 * in history for the user to review.
 */

const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');

const ALERTS_FILE = path.join(__dirname, '..', 'logs', 'alerts.json');

// ─── State ───────────────────────────────────────────────────────────
let alerts = [];        // Active alert rules
let alertHistory = [];  // Fired alerts
let priceSnaps = {};    // conditionId → [{ ts, price }]  for price-move tracking

const MAX_HISTORY = 500;
const SNAP_TTL = 3600000; // 1 hour of price snapshots

// Load from disk
try {
  if (fs.existsSync(ALERTS_FILE)) {
    const saved = JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf8'));
    alerts = saved.alerts || [];
    alertHistory = saved.history || [];
    log.info('ALERTS', `Loaded ${alerts.length} alerts, ${alertHistory.length} history entries`);
  }
} catch { /* fresh start */ }

function save() {
  try {
    fs.promises.writeFile(ALERTS_FILE, JSON.stringify({ alerts, history: alertHistory.slice(-MAX_HISTORY) }, null, 2));
  } catch { /* non-critical */ }
}

// ─── Alert CRUD ──────────────────────────────────────────────────────

function createAlert(config) {
  const alert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: config.type,                     // PRICE_MOVE | DIVERGENCE | NEW_SIGNAL | VOLUME_SPIKE
    conditionId: config.conditionId || null,// null = all markets
    market: config.market || null,
    threshold: config.threshold || 0.05,   // e.g. 5% for price move
    direction: config.direction || 'BOTH', // UP | DOWN | BOTH
    enabled: true,
    createdAt: new Date().toISOString(),
    firedCount: 0,
    lastFired: null,
    cooldownMs: config.cooldownMs || 300000, // 5 min cooldown between fires
  };

  alerts.push(alert);
  save();
  log.info('ALERTS', `Created alert: ${alert.type} on ${alert.market || 'ALL'} (threshold: ${alert.threshold})`);
  return alert;
}

function deleteAlert(alertId) {
  const idx = alerts.findIndex(a => a.id === alertId);
  if (idx === -1) return null;
  const removed = alerts.splice(idx, 1)[0];
  save();
  return removed;
}

function getAlerts() {
  return alerts;
}

function getAlertHistory(limit = 50) {
  return alertHistory.slice(-limit).reverse();
}

function clearHistory() {
  alertHistory = [];
  save();
}

// ─── Price Snapshot Tracking ─────────────────────────────────────────

function recordPriceSnapshot(markets) {
  const now = Date.now();
  for (const m of markets) {
    if (!m.conditionId) continue;
    if (!priceSnaps[m.conditionId]) priceSnaps[m.conditionId] = [];
    priceSnaps[m.conditionId].push({ ts: now, price: m.yesPrice, volume: m.volume24hr });
    // Trim old snapshots
    priceSnaps[m.conditionId] = priceSnaps[m.conditionId].filter(s => now - s.ts < SNAP_TTL);
  }
}

// ─── Alert Checking (called each scan) ──────────────────────────────

function checkAlerts(markets, opportunities) {
  const now = Date.now();
  const fired = [];

  for (const alert of alerts) {
    if (!alert.enabled) continue;
    if (alert.lastFired && now - new Date(alert.lastFired).getTime() < alert.cooldownMs) continue;

    let triggered = null;

    switch (alert.type) {
      case 'PRICE_MOVE':
        triggered = checkPriceMove(alert, markets);
        break;
      case 'DIVERGENCE':
        triggered = checkDivergence(alert, opportunities);
        break;
      case 'NEW_SIGNAL':
        triggered = checkNewSignal(alert, opportunities);
        break;
      case 'VOLUME_SPIKE':
        triggered = checkVolumeSpike(alert, markets);
        break;
    }

    if (triggered) {
      alert.firedCount++;
      alert.lastFired = new Date().toISOString();

      const entry = {
        alertId: alert.id,
        type: alert.type,
        market: triggered.market,
        message: triggered.message,
        data: triggered.data,
        firedAt: alert.lastFired,
      };

      alertHistory.push(entry);
      fired.push(entry);
      log.info('ALERTS', `🔔 Alert fired: ${triggered.message}`);
    }
  }

  if (fired.length > 0) save();
  return fired;
}

function checkPriceMove(alert, markets) {
  const targets = alert.conditionId
    ? markets.filter(m => m.conditionId === alert.conditionId)
    : markets;

  for (const m of targets) {
    const snaps = priceSnaps[m.conditionId];
    if (!snaps || snaps.length < 2) continue;

    const oldest = snaps[0];
    const current = m.yesPrice;
    const change = current - oldest.price;
    const changePct = Math.abs(change / (oldest.price || 0.5));

    if (changePct >= alert.threshold) {
      const dir = change > 0 ? 'UP' : 'DOWN';
      if (alert.direction !== 'BOTH' && alert.direction !== dir) continue;

      return {
        market: m.question,
        message: `${m.question?.slice(0, 60)} moved ${dir} ${(changePct * 100).toFixed(1)}% (${oldest.price.toFixed(2)} → ${current.toFixed(2)})`,
        data: { conditionId: m.conditionId, from: oldest.price, to: current, changePct, direction: dir },
      };
    }
  }
  return null;
}

function checkDivergence(alert, opportunities) {
  const divOpps = opportunities.filter(o =>
    o.bookmaker && Math.abs(o.bookmaker.divergence || 0) >= alert.threshold
  );

  if (divOpps.length > 0) {
    const top = divOpps.sort((a, b) => Math.abs(b.bookmaker.divergence) - Math.abs(a.bookmaker.divergence))[0];
    return {
      market: top.market,
      message: `Bookmaker divergence: ${top.market?.slice(0, 50)} — Poly ${(top.yesPrice * 100).toFixed(0)}% vs Books ${(top.bookmaker.consensusProb * 100).toFixed(0)}% (${(Math.abs(top.bookmaker.divergence) * 100).toFixed(1)}% gap)`,
      data: { conditionId: top.conditionId, divergence: top.bookmaker.divergence, polyPrice: top.yesPrice, bookmakerProb: top.bookmaker.consensusProb },
    };
  }
  return null;
}

function checkNewSignal(alert, opportunities) {
  const threshold = alert.threshold * 100; // Convert to score scale (0-100)
  const highScore = opportunities.filter(o =>
    o.score >= threshold &&
    (!alert.conditionId || o.conditionId === alert.conditionId)
  );

  if (highScore.length > 0) {
    const top = highScore[0];
    return {
      market: top.market,
      message: `High-confidence signal: ${top.strategy} on "${top.market?.slice(0, 50)}" — Score ${top.score}/100`,
      data: { conditionId: top.conditionId, strategy: top.strategy, score: top.score, side: top.side },
    };
  }
  return null;
}

function checkVolumeSpike(alert, markets) {
  const targets = alert.conditionId
    ? markets.filter(m => m.conditionId === alert.conditionId)
    : markets;

  for (const m of targets) {
    const snaps = priceSnaps[m.conditionId];
    if (!snaps || snaps.length < 3) continue;

    const oldVolume = snaps[0].volume || 0;
    const newVolume = m.volume24hr || 0;
    if (oldVolume === 0) continue;

    const spike = (newVolume - oldVolume) / oldVolume;
    if (spike >= alert.threshold) {
      return {
        market: m.question,
        message: `Volume spike on "${m.question?.slice(0, 50)}" — ${(spike * 100).toFixed(0)}% increase ($${(oldVolume / 1000).toFixed(1)}K → $${(newVolume / 1000).toFixed(1)}K)`,
        data: { conditionId: m.conditionId, oldVolume, newVolume, spikePct: spike },
      };
    }
  }
  return null;
}

// ─── Market Movers (biggest price changes) ───────────────────────────

function getMarketMovers(markets, limit = 10) {
  const movers = [];

  for (const m of markets) {
    const snaps = priceSnaps[m.conditionId];
    if (!snaps || snaps.length < 2) continue;

    const oldest = snaps[0];
    const change = m.yesPrice - oldest.price;
    const changePct = oldest.price > 0 ? change / oldest.price : 0;

    movers.push({
      conditionId: m.conditionId,
      market: m.question,
      platform: m.platform || 'POLYMARKET',
      currentPrice: m.yesPrice,
      previousPrice: oldest.price,
      change,
      changePct,
      direction: change > 0 ? 'UP' : change < 0 ? 'DOWN' : 'FLAT',
      volume24hr: m.volume24hr,
      liquidity: m.liquidity,
      timeframeMs: Date.now() - oldest.ts,
    });
  }

  return movers
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, limit);
}

module.exports = {
  createAlert,
  deleteAlert,
  getAlerts,
  getAlertHistory,
  clearHistory,
  recordPriceSnapshot,
  checkAlerts,
  getMarketMovers,
};
