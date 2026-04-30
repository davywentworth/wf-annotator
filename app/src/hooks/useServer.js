import { useState, useEffect, useRef } from 'react';

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

  const send = async (data) => {
    try {
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error('Submit failed', e);
    }
  };

  return { state, message, send };
}
