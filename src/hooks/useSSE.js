import { useEffect, useRef, useState, useCallback } from 'react';

const BOT_API = process.env.REACT_APP_BOT_URL || '';

/**
 * React hook for consuming Server-Sent Events from the bot server.
 * 
 * Usage:
 *   const { events, lastEvent, connected } = useSSE();
 *   
 *   // Or with specific event types:
 *   const { lastEvent } = useSSE({ eventTypes: ['trade:new', 'edge:detected'] });
 *   
 *   // With callback:
 *   useSSE({ onEvent: (event) => console.log(event) });
 */
export default function useSSE({ eventTypes = null, onEvent = null, maxHistory = 50 } = {}) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [lastEvent, setLastEvent] = useState(null);
  const sourceRef = useRef(null);
  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
    }

    try {
      const source = new EventSource(`${BOT_API}/polybot/events`);
      sourceRef.current = source;

      source.onopen = () => {
        setConnected(true);
        if (reconnectRef.current) {
          clearTimeout(reconnectRef.current);
          reconnectRef.current = null;
        }
      };

      source.onerror = () => {
        setConnected(false);
        source.close();
        // Reconnect after 5s
        reconnectRef.current = setTimeout(connect, 5000);
      };

      // Listen for all event types the bot emits
      const allTypes = [
        'scan:complete', 'trade:new', 'trade:closed',
        'edge:detected', 'alert:fired', 'price:move',
        'risk:warning', 'status:update',
      ];

      const typesToListen = eventTypes || allTypes;

      for (const type of typesToListen) {
        source.addEventListener(type, (e) => {
          try {
            const parsed = JSON.parse(e.data);
            setLastEvent(parsed);
            setEvents(prev => {
              const next = [parsed, ...prev];
              return next.length > maxHistory ? next.slice(0, maxHistory) : next;
            });
            if (onEvent) onEvent(parsed);
          } catch {
            // ignore parse errors
          }
        });
      }

      // Also listen for generic messages
      source.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.type === 'connected') {
            setConnected(true);
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // EventSource not available or URL invalid
      setConnected(false);
    }
  }, [eventTypes, onEvent, maxHistory]);

  useEffect(() => {
    connect();
    return () => {
      if (sourceRef.current) sourceRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  return { events, lastEvent, connected, clearEvents };
}
