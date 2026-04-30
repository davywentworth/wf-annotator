import { useState, useEffect, useRef, useCallback } from 'react';

export function useServer() {
  const [state, setState] = useState('connecting');
  const [message, setMessage] = useState(null);
  const receivedRef = useRef(false);

  useEffect(() => {
    const es = new EventSource('/api/events');

    es.onopen = () => setState('connected');

    es.onmessage = (event) => {
      try {
        receivedRef.current = true;
        setMessage(JSON.parse(event.data));
      } catch (e) {
        console.error('Invalid SSE message', e);
      }
    };

    // Only surface an error if we never received the wireframe.
    // EventSource auto-reconnects on transient drops; the server also
    // intentionally closes after submit/approve, which fires onerror.
    es.onerror = () => {
      if (!receivedRef.current) setState('error');
    };

    return () => es.close();
  }, []);

  // Returns true on success, false on failure. Callers should only act
  // on state changes (e.g. clearing annotations) when true is returned.
  const send = useCallback(async (data) => {
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
      return true;
    } catch (e) {
      console.error('Submit failed', e);
      return false;
    }
  }, []);

  return { state, message, send };
}
