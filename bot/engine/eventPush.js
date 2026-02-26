/**
 * Real-Time Event Push — Server-Sent Events (SSE)
 * 
 * Pushes live events to connected frontend clients without polling.
 * Uses SSE (no WebSocket dependency needed — built into Express + browser EventSource).
 * 
 * Event types:
 *   scan:complete   — new scan cycle finished with edges found
 *   trade:new       — paper or live trade executed
 *   trade:closed    — position resolved
 *   edge:detected   — new high-quality edge found
 *   alert:fired     — user alert triggered
 *   price:move      — significant market price movement
 *   risk:warning    — risk limit approaching or breached
 *   status:update   — bot status change (started/stopped/mode change)
 */
const log = require('../utils/logger');

// Connected SSE clients
const clients = new Set();
let eventId = 0;

/**
 * SSE endpoint handler — mount as app.get('/api/events', sseHandler)
 */
function sseHandler(req, res) {
  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  const client = { id: ++eventId, res, connectedAt: Date.now() };
  clients.add(client);
  log.info('SSE', `Client connected (${clients.size} total)`);

  // Keep-alive ping every 30s
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);

  req.on('close', () => {
    clients.delete(client);
    clearInterval(keepAlive);
    log.info('SSE', `Client disconnected (${clients.size} remaining)`);
  });
}

/**
 * Broadcast an event to all connected clients
 */
function broadcast(type, data) {
  if (clients.size === 0) return;

  const event = {
    type,
    data,
    timestamp: new Date().toISOString(),
    id: ++eventId,
  };

  const payload = `id: ${eventId}\nevent: ${type}\ndata: ${JSON.stringify(event)}\n\n`;

  for (const client of clients) {
    try {
      client.res.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

// ─── Convenience Methods ─────────────────────────────────────────────

function onScanComplete(stats) {
  broadcast('scan:complete', {
    marketsScanned: stats.marketsScanned,
    edgesFound: stats.edgesFound,
    tradesExecuted: stats.tradesExecuted,
    topEdges: (stats.topEdges || []).slice(0, 5).map(e => ({
      market: e.market?.slice(0, 60),
      edge: e.edge,
      grade: e.qualityGrade,
    })),
  });
}

function onTradeNew(trade) {
  broadcast('trade:new', {
    market: trade.market?.slice(0, 80),
    side: trade.side,
    size: trade.positionSize || trade.size,
    price: trade.price,
    edge: trade.edge,
    strategy: trade.strategy,
    mode: trade.mode || 'paper',
  });
}

function onTradeClosed(result) {
  broadcast('trade:closed', {
    market: result.market?.slice(0, 80),
    side: result.side,
    pnl: result.pnl,
    closePrice: result.closePrice,
  });
}

function onEdgeDetected(edge) {
  broadcast('edge:detected', {
    market: edge.market?.slice(0, 80),
    ourProb: edge.ourProb,
    marketPrice: edge.marketPrice,
    edge: edge.edge,
    grade: edge.qualityGrade,
  });
}

function onAlertFired(alert) {
  broadcast('alert:fired', {
    type: alert.type,
    market: alert.market?.slice(0, 80),
    message: alert.message?.slice(0, 200),
  });
}

function onRiskWarning(warning) {
  broadcast('risk:warning', {
    level: warning.level,
    message: warning.message,
    metric: warning.metric,
    value: warning.value,
  });
}

function onStatusUpdate(status) {
  broadcast('status:update', status);
}

function getClientCount() {
  return clients.size;
}

module.exports = {
  sseHandler,
  broadcast,
  onScanComplete,
  onTradeNew,
  onTradeClosed,
  onEdgeDetected,
  onAlertFired,
  onRiskWarning,
  onStatusUpdate,
  getClientCount,
};
