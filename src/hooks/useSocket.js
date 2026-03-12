import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const BOT_API = process.env.REACT_APP_BOT_URL || '';
const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';

/**
 * useSocket — Real-time WebSocket hook via Socket.IO.
 *
 * Replaces/supplements SSE with bidirectional, typed events.
 *
 * Usage:
 *   const { connected, lastTrade, lastSignal, healthStatus, subscribe, events } = useSocket();
 */
export default function useSocket({ maxHistory = 100, autoConnect = true } = {}) {
  const [connected, setConnected] = useState(false);
  const [lastTrade, setLastTrade] = useState(null);
  const [lastSignal, setLastSignal] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [events, setEvents] = useState([]);
  const socketRef = useRef(null);

  const pushEvent = useCallback((event) => {
    setEvents(prev => {
      const next = [event, ...prev];
      return next.length > maxHistory ? next.slice(0, maxHistory) : next;
    });
  }, [maxHistory]);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const url = BOT_API || (isLocal ? 'http://localhost:4000' : window.location.origin);
    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      setConnected(true);
      console.log('[WS] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      console.log('[WS] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      setConnected(false);
      console.warn('[WS] Connection error:', err.message);
    });

    // ─── Typed Event Handlers ─────────────────────────────────────
    socket.on('trade:executed', (data) => {
      setLastTrade(data);
      pushEvent({ type: 'trade:executed', data, timestamp: Date.now() });
    });

    socket.on('signal:detected', (data) => {
      setLastSignal(data);
      pushEvent({ type: 'signal:detected', data, timestamp: Date.now() });
    });

    socket.on('scan:complete', (data) => {
      setScanResult(data);
      pushEvent({ type: 'scan:complete', data, timestamp: Date.now() });
    });

    socket.on('health:update', (data) => {
      setHealthStatus(data);
      pushEvent({ type: 'health:update', data, timestamp: Date.now() });
    });

    socket.on('price:update', (data) => {
      pushEvent({ type: 'price:update', data, timestamp: Date.now() });
    });

    socket.on('news:break', (data) => {
      pushEvent({ type: 'news:break', data, timestamp: Date.now() });
    });

    socket.on('newmarket:alert', (data) => {
      pushEvent({ type: 'newmarket:alert', data, timestamp: Date.now() });
    });

    socket.on('panicdip:alert', (data) => {
      pushEvent({ type: 'panicdip:alert', data, timestamp: Date.now() });
    });

    socket.on('calibration:update', (data) => {
      pushEvent({ type: 'calibration:update', data, timestamp: Date.now() });
    });

    socket.on('status:update', (data) => {
      pushEvent({ type: 'status:update', data, timestamp: Date.now() });
    });

    socketRef.current = socket;
  }, [pushEvent]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  const subscribe = useCallback((room) => {
    socketRef.current?.emit('subscribe', room);
  }, []);

  const unsubscribe = useCallback((room) => {
    socketRef.current?.emit('unsubscribe', room);
  }, []);

  useEffect(() => {
    if (autoConnect) connect();
    return () => disconnect();
  }, [autoConnect, connect, disconnect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastTrade(null);
    setLastSignal(null);
  }, []);

  return {
    connected,
    lastTrade,
    lastSignal,
    healthStatus,
    scanResult,
    events,
    subscribe,
    unsubscribe,
    clearEvents,
    connect,
    disconnect,
    socket: socketRef.current,
  };
}
