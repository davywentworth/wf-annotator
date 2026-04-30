import { useState, useEffect } from 'react';

export function useServer() {
  const [state, setState] = useState('connecting');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const es = new EventSource('/api/events');

    es.onopen = () => setState('connected');

    es.onmessage = (event) => {
      try {
        setMessage(JSON.parse(event.data));
      } catch (e) {
        console.error('Invalid SSE message', e);
      }
    };

    es.onerror = () => setState('error');

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
