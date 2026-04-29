import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket() {
  const [state, setState] = useState('connecting');
  const [message, setMessage] = useState(null);
  const wsRef = useRef(null);
  const attemptsRef = useRef(0);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const ws = new WebSocket(`ws://${location.host}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setState('connected');
      attemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        setMessage(JSON.parse(event.data));
      } catch (e) {
        console.error('Invalid WS message', e);
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      if (attemptsRef.current < 3) {
        attemptsRef.current++;
        setState('connecting');
        setTimeout(connect, 1000);
      } else {
        setState('error');
      }
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { state, message, send };
}
