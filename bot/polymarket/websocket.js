/**
 * Polymarket WebSocket Client — Real-Time Orderbook Feed
 *
 * Instead of REST polling every 5 seconds (which is too slow for arb + ICT),
 * this module maintains persistent WebSocket connections to the Polymarket
 * CLOB WebSocket API for real-time orderbook updates.
 *
 * Architecture:
 * - Subscribes to orderbook channels for tracked markets
 * - Maintains local orderbook state with incremental updates
 * - Emits events when orderbook changes significantly
 * - Auto-reconnects on disconnection
 * - Rate-limited subscription management
 *
 * CLOB WebSocket API: wss://ws-subscriptions-clob.polymarket.com/ws/market
 * Protocol: JSON messages over WebSocket
 */

const { EventEmitter } = require('events');
const log = require('../utils/logger');

const WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
const MAX_SUBSCRIPTIONS = 50;          // Max concurrent market subscriptions
const RECONNECT_DELAY_MS = 3000;       // Reconnect after 3s
const MAX_RECONNECT_DELAY_MS = 30000;  // Max 30s backoff
const HEARTBEAT_INTERVAL_MS = 30000;   // Ping every 30s
const STALE_THRESHOLD_MS = 120000;     // Consider data stale after 2 minutes

class PolymarketWebSocket extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.connected = false;
    this.subscriptions = new Map();     // tokenId → { orderbook, lastUpdate, subscribers }
    this.reconnectAttempts = 0;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.stats = {
      messagesReceived: 0,
      orderbookUpdates: 0,
      reconnects: 0,
      errors: 0,
      connectedAt: null,
    };
  }

  /**
   * Connect to the WebSocket server.
   * Resolves when connection is established.
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }

      try {
        // Use dynamic import for WebSocket (Node.js 18+ has built-in, older needs ws)
        let WebSocket;
        try {
          WebSocket = require('ws');
        } catch {
          // Node 18+ built-in WebSocket
          WebSocket = globalThis.WebSocket;
        }

        if (!WebSocket) {
          log.warn('WS', 'WebSocket not available — install ws package: npm install ws');
          reject(new Error('WebSocket not available'));
          return;
        }

        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.stats.connectedAt = new Date().toISOString();
          log.info('WS', `Connected to Polymarket CLOB WebSocket`);

          // Start heartbeat
          this._startHeartbeat();

          // Re-subscribe to all tracked markets
          for (const tokenId of this.subscriptions.keys()) {
            this._sendSubscribe(tokenId);
          }

          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.stats.messagesReceived++;
          try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            this._handleMessage(data);
          } catch (err) {
            this.stats.errors++;
          }
        };

        this.ws.onerror = (err) => {
          this.stats.errors++;
          log.warn('WS', `WebSocket error: ${err.message || 'unknown'}`);
          this.emit('error', err);
        };

        this.ws.onclose = (event) => {
          this.connected = false;
          this._stopHeartbeat();
          log.warn('WS', `WebSocket closed: code=${event.code} reason=${event.reason || 'none'}`);
          this.emit('disconnected', event);
          this._scheduleReconnect();
        };

        // Timeout for initial connection
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (err) {
        log.error('WS', `Failed to create WebSocket: ${err.message}`);
        reject(err);
      }
    });
  }

  /**
   * Subscribe to real-time orderbook updates for a market token.
   */
  subscribe(tokenId) {
    if (!tokenId) return;

    if (this.subscriptions.size >= MAX_SUBSCRIPTIONS) {
      // Evict least recently updated subscription
      let oldestId = null;
      let oldestTime = Infinity;
      for (const [id, sub] of this.subscriptions) {
        if (sub.lastUpdate < oldestTime) {
          oldestTime = sub.lastUpdate;
          oldestId = id;
        }
      }
      if (oldestId) this.unsubscribe(oldestId);
    }

    if (!this.subscriptions.has(tokenId)) {
      this.subscriptions.set(tokenId, {
        orderbook: { bids: [], asks: [] },
        lastUpdate: Date.now(),
        subscribers: 1,
      });
    } else {
      this.subscriptions.get(tokenId).subscribers++;
    }

    if (this.connected) {
      this._sendSubscribe(tokenId);
    }
  }

  /**
   * Unsubscribe from a market token.
   */
  unsubscribe(tokenId) {
    const sub = this.subscriptions.get(tokenId);
    if (!sub) return;

    sub.subscribers--;
    if (sub.subscribers <= 0) {
      this.subscriptions.delete(tokenId);
      if (this.connected) {
        this._sendUnsubscribe(tokenId);
      }
    }
  }

  /**
   * Get the current real-time orderbook for a token.
   * Falls back to null if no WebSocket data available.
   */
  getOrderbook(tokenId) {
    const sub = this.subscriptions.get(tokenId);
    if (!sub) return null;

    // Check staleness
    if (Date.now() - sub.lastUpdate > STALE_THRESHOLD_MS) {
      return null; // Data too old, caller should use REST fallback
    }

    return sub.orderbook;
  }

  /**
   * Check if we have fresh real-time data for a token.
   */
  hasFreshData(tokenId) {
    const sub = this.subscriptions.get(tokenId);
    if (!sub) return false;
    return Date.now() - sub.lastUpdate < STALE_THRESHOLD_MS;
  }

  /**
   * Disconnect and clean up.
   */
  disconnect() {
    this._stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.close(1000, 'Client disconnect');
      } catch { /* ignore */ }
      this.ws = null;
    }

    this.connected = false;
    this.subscriptions.clear();
    log.info('WS', 'Disconnected from Polymarket WebSocket');
  }

  /**
   * Get WebSocket connection status and stats.
   */
  getStatus() {
    return {
      connected: this.connected,
      subscriptions: this.subscriptions.size,
      maxSubscriptions: MAX_SUBSCRIPTIONS,
      stats: { ...this.stats },
      tokens: Array.from(this.subscriptions.keys()).slice(0, 10),
    };
  }

  // ─── Internal Methods ──────────────────────────────────────────────

  _sendSubscribe(tokenId) {
    if (!this.ws || this.ws.readyState !== 1) return; // 1 = OPEN
    try {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'market',
        assets_id: tokenId,
      }));
    } catch (err) {
      log.warn('WS', `Subscribe failed for ${tokenId}: ${err.message}`);
    }
  }

  _sendUnsubscribe(tokenId) {
    if (!this.ws || this.ws.readyState !== 1) return;
    try {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        channel: 'market',
        assets_id: tokenId,
      }));
    } catch { /* ignore */ }
  }

  _handleMessage(data) {
    // Handle different message types from the CLOB WebSocket
    if (!data) return;

    // Orderbook snapshot
    if (data.type === 'book' || data.event_type === 'book') {
      const tokenId = data.asset_id || data.market;
      const sub = this.subscriptions.get(tokenId);
      if (!sub) return;

      sub.orderbook = {
        bids: (data.bids || []).map(b => ({
          price: String(b.price || b[0]),
          size: String(b.size || b[1]),
        })),
        asks: (data.asks || []).map(a => ({
          price: String(a.price || a[0]),
          size: String(a.size || a[1]),
        })),
      };
      sub.lastUpdate = Date.now();
      this.stats.orderbookUpdates++;

      this.emit('orderbook', { tokenId, orderbook: sub.orderbook });
    }

    // Price change event
    if (data.type === 'price_change' || data.event_type === 'price_change') {
      const tokenId = data.asset_id || data.market;
      this.emit('priceChange', {
        tokenId,
        price: parseFloat(data.price || data.new_price || 0),
        oldPrice: parseFloat(data.old_price || 0),
        timestamp: data.timestamp || Date.now(),
      });
    }

    // Last trade
    if (data.type === 'last_trade_price' || data.event_type === 'last_trade_price') {
      const tokenId = data.asset_id || data.market;
      this.emit('trade', {
        tokenId,
        price: parseFloat(data.price || 0),
        size: parseFloat(data.size || data.amount || 0),
        side: data.side || 'unknown',
        timestamp: data.timestamp || Date.now(),
      });
    }

    // Tick size change
    if (data.type === 'tick_size_change') {
      // Just acknowledge
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === 1) {
        try {
          this.ws.ping?.() || this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch { /* ignore */ }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    this.stats.reconnects++;

    // Exponential backoff with jitter
    const delay = Math.min(
      RECONNECT_DELAY_MS * Math.pow(1.5, this.reconnectAttempts - 1) + Math.random() * 1000,
      MAX_RECONNECT_DELAY_MS
    );

    log.info('WS', `Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (err) {
        log.warn('WS', `Reconnect failed: ${err.message}`);
        this._scheduleReconnect();
      }
    }, delay);
  }
}

// Singleton instance
const wsClient = new PolymarketWebSocket();

module.exports = {
  connect: () => wsClient.connect(),
  disconnect: () => wsClient.disconnect(),
  subscribe: (tokenId) => wsClient.subscribe(tokenId),
  unsubscribe: (tokenId) => wsClient.unsubscribe(tokenId),
  getOrderbook: (tokenId) => wsClient.getOrderbook(tokenId),
  hasFreshData: (tokenId) => wsClient.hasFreshData(tokenId),
  getStatus: () => wsClient.getStatus(),
  on: (event, handler) => wsClient.on(event, handler),
  off: (event, handler) => wsClient.off(event, handler),
  instance: wsClient,
};
