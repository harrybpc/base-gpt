import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = 'ws://localhost:8080';

export function useWebSocket(onMessage) {
  const wsRef = useRef(null);
  const retryRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const [status, setStatus] = useState('connecting'); // connecting | connected | disconnected

  const connect = useCallback(() => {
    setStatus('connecting');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      clearTimeout(retryRef.current);
    };

    ws.onmessage = (e) => {
      try { onMessageRef.current(JSON.parse(e.data)); } catch {}
    };

    ws.onclose = () => {
      setStatus('disconnected');
      retryRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  return { status, send };
}
