/**
 * WebSocket Real-Time Layer — Socket.IO server for live frontend updates.
 *
 * Replaces SSE polling with bidirectional WebSocket communication.
 * Clients receive instant push updates for:
 *   - Trade executions
 *   - Signal detections
 *   - Price movements
 *   - System health changes
 *   - Alpha engine events (new markets, news breaks, dips)
 *   - Scan completions
 */
const log = require('../utils/logger');

let io = null;
let _stats = { connections: 0, peakConnections: 0, messagesSent: 0, started: null };

// ─── Initialization ──────────────────────────────────────────────────
function initialize(httpServer, corsOptions = {}) {
  try {
    const { Server } = require('socket.io');
    io = new Server(httpServer, {
      cors: {
        origin: corsOptions.origin || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
    });

    io.on('connection', (socket) => {
      _stats.connections++;
      if (_stats.connections > _stats.peakConnections) {
        _stats.peakConnections = _stats.connections;
      }

      log.debug('WS', `Client connected: ${socket.id} (${_stats.connections} active)`);

      // Join rooms based on interest
      socket.on('subscribe', (rooms) => {
        if (Array.isArray(rooms)) {
          rooms.forEach(room => socket.join(room));
          log.debug('WS', `${socket.id} subscribed to: ${rooms.join(', ')}`);
        }
      });

      socket.on('unsubscribe', (rooms) => {
        if (Array.isArray(rooms)) {
          rooms.forEach(room => socket.leave(room));
        }
      });

      // Handle request for initial state
      socket.on('request:status', () => {
        socket.emit('status:update', _lastStatus);
      });

      socket.on('disconnect', () => {
        _stats.connections--;
        log.debug('WS', `Client disconnected: ${socket.id} (${_stats.connections} active)`);
      });
    });

    _stats.started = new Date().toISOString();
    log.info('WS', 'Socket.IO real-time layer initialized');
    return io;
  } catch (err) {
    log.warn('WS', `Socket.IO initialization failed: ${err.message}`);
    return null;
  }
}

// ─── Event Emitters ──────────────────────────────────────────────────
let _lastStatus = {};

function emit(event, data) {
  if (!io) return;
  try {
    io.emit(event, { ...data, timestamp: new Date().toISOString() });
    _stats.messagesSent++;
  } catch (err) {
    log.debug('WS', `Emit failed: ${err.message}`);
  }
}

function emitToRoom(room, event, data) {
  if (!io) return;
  try {
    io.to(room).emit(event, { ...data, timestamp: new Date().toISOString() });
    _stats.messagesSent++;
  } catch (err) {
    log.debug('WS', `Room emit failed: ${err.message}`);
  }
}

// ─── Typed Event Emitters ────────────────────────────────────────────

function tradeExecuted(trade) {
  emit('trade:executed', {
    type: 'trade:executed',
    trade: {
      id: trade.id,
      market: trade.market,
      side: trade.side,
      size: trade.positionSize,
      price: trade.fillPrice || trade.price,
      strategy: trade.strategy,
      status: trade.status,
      orderType: trade.orderType,
    },
  });
}

function signalDetected(signal) {
  emit('signal:detected', {
    type: 'signal:detected',
    signal: {
      market: signal.market || signal.question,
      conditionId: signal.conditionId,
      edge: signal.edge || signal.divergence,
      edgeSignal: signal.edgeSignal,
      edgeGrade: signal.edgeGrade,
      strategy: signal.strategy,
      source: signal.source,
    },
  });
}

function priceUpdate(conditionId, price, change) {
  emitToRoom('prices', 'price:update', {
    type: 'price:update',
    conditionId,
    price,
    change,
  });
}

function newMarketAlert(market, analysis) {
  emit('alpha:new-market', {
    type: 'alpha:new-market',
    question: analysis.question,
    conditionId: market.condition_id,
    score: analysis.score,
    liquidity: analysis.liquidity,
    opportunity: analysis.opportunity,
  });
}

function newsBreakAlert(signal) {
  emit('alpha:news-break', {
    type: 'alpha:news-break',
    headline: signal.headline,
    market: signal.market,
    side: signal.side,
    edge: signal.estimatedEdge,
    isBreaking: signal.isBreaking,
    impactScore: signal.impactScore,
  });
}

function panicDipAlert(dip) {
  emit('alpha:panic-dip', {
    type: 'alpha:panic-dip',
    question: dip.question,
    conditionId: dip.conditionId,
    dropPct: dip.dropPct,
    score: dip.score,
    newsJustified: dip.newsJustified,
    netEdge: dip.netEdge,
  });
}

function scanComplete(result) {
  emit('scan:complete', {
    type: 'scan:complete',
    edgesFound: result.edgesFound || 0,
    provenEdges: result.provenEdges || 0,
    duration: result.duration,
  });
}

function statusUpdate(status) {
  _lastStatus = status;
  emit('status:update', { type: 'status:update', ...status });
}

function healthUpdate(health) {
  emit('health:update', { type: 'health:update', ...health });
}

function calibrationUpdate(calibration) {
  emit('calibration:update', { type: 'calibration:update', ...calibration });
}

// ─── Status ──────────────────────────────────────────────────────────
function getStats() {
  return {
    ..._stats,
    rooms: io ? io.sockets.adapter.rooms.size : 0,
    available: io !== null,
  };
}

function getClientCount() {
  return _stats.connections;
}

function close() {
  if (io) {
    io.disconnectSockets();
    io.close();
    io = null;
    log.info('WS', 'Socket.IO server closed');
  }
}

module.exports = {
  initialize,
  emit,
  emitToRoom,
  // Typed emitters
  tradeExecuted,
  signalDetected,
  priceUpdate,
  newMarketAlert,
  newsBreakAlert,
  panicDipAlert,
  scanComplete,
  statusUpdate,
  healthUpdate,
  calibrationUpdate,
  // Admin
  getStats,
  getClientCount,
  close,
};
