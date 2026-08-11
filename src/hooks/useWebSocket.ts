import { useEffect, useRef, useCallback } from 'react';

// Base del WebSocket. Si VITE_API_URL está definida (backend en dominio
// aparte), se deriva de ella (http→ws). Si no, se construye desde el origin
// REAL del visitante — NUNCA localhost:3001: cada cliente intentaría su
// propio localhost y el WS quedaría muerto en producción (mismo bug que
// tenía la API antes de usar rutas relativas).
const WS_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws')
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

type WSEventCallback = (data: unknown) => void;

interface WSEvent {
  event: string;
  data: unknown;
}

const globalListeners: Map<string, Set<WSEventCallback>> = new Map();
let wsInstance: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isConnecting = false;

const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_INTERVAL = 30000;
let currentReconnectInterval = RECONNECT_INTERVAL;

const connect = (role?: string, locationId?: string) => {
  if (wsInstance?.readyState === WebSocket.OPEN || wsInstance?.readyState === WebSocket.CONNECTING) {
    return;
  }
  if (isConnecting) return;
  isConnecting = true;

  // La cookie HttpOnly viaja sola en el handshake del WS (mismo-site que la
  // API) -- el servidor la lee ahí (server/websocket.js), no hace falta (ni
  // se puede: el JWT ya no es legible del lado cliente) mandar un token acá.
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (locationId) params.set('locationId', locationId);

  try {
    const url = `${WS_BASE}/ws?${params.toString()}`;
    wsInstance = new WebSocket(url);

    wsInstance.onopen = () => {
      console.log('🔌 WebSocket connected');
      isConnecting = false;
      currentReconnectInterval = RECONNECT_INTERVAL;
    };

    wsInstance.onmessage = (event: MessageEvent) => {
      try {
        const parsed: WSEvent = JSON.parse(event.data as string);
        const listeners = globalListeners.get(parsed.event);
        if (listeners) {
          listeners.forEach((cb) => cb(parsed.data));
        }
        // Also trigger wildcard '*'
        const wildcardListeners = globalListeners.get('*');
        if (wildcardListeners) {
          wildcardListeners.forEach((cb) => cb(parsed));
        }
      } catch {
        console.warn('⚠️ WebSocket: failed to parse message');
      }
    };

    wsInstance.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      wsInstance = null;
      isConnecting = false;
      scheduleReconnect(role, locationId);
    };

    wsInstance.onerror = () => {
      wsInstance?.close();
    };
  } catch {
    isConnecting = false;
    scheduleReconnect(role, locationId);
  }
};

const scheduleReconnect = (role?: string, locationId?: string) => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    currentReconnectInterval = Math.min(currentReconnectInterval * 1.5, MAX_RECONNECT_INTERVAL);
    connect(role, locationId);
  }, currentReconnectInterval);
};

const disconnect = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (wsInstance) {
    wsInstance.close();
    wsInstance = null;
  }
  isConnecting = false;
  currentReconnectInterval = RECONNECT_INTERVAL;
};

/**
 * useWebSocket — React hook for subscribing to real-time events from the backend.
 *
 * Automatically connects on mount and disconnects on unmount.
 * Deduplicates listeners so multiple components can subscribe to the same event.
 *
 * @example
 * ```tsx
 * const { lastEvent } = useWebSocket('order:new', (data) => {
 *   console.log('New order:', data);
 * });
 * ```
 */
export function useWebSocket(event: string, callback?: WSEventCallback, deps?: { role?: string; locationId?: string }) {
  const callbackRef = useRef<WSEventCallback | undefined>(callback);
  callbackRef.current = callback;

  const stableCallback = useCallback((data: unknown) => {
    callbackRef.current?.(data);
  }, []);

  useEffect(() => {
    // Register listener
    if (!globalListeners.has(event)) {
      globalListeners.set(event, new Set());
    }
    const set = globalListeners.get(event)!;
    let exists = false;
    set.forEach((fn) => {
      if (fn === stableCallback) exists = true;
    });
    if (!exists) {
      set.add(stableCallback);
    }

    // Force reconnect if role/location changed (ensures WS uses new token/role)
    reconnectWS(deps?.role, deps?.locationId);

    return () => {
      const s = globalListeners.get(event);
      if (s) {
        s.delete(stableCallback);
        if (s.size === 0) {
          globalListeners.delete(event);
        }
      }
      // Disconnect only if no listeners remain across all events
      if (globalListeners.size === 0) {
        disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, deps?.role, deps?.locationId]);
}

/**
 * Subscribe to WebSocket events outside of React (e.g., in services or utils).
 * Returns an unsubscribe function.
 */
export function subscribeWS(event: string, callback: WSEventCallback): () => void {
  if (!globalListeners.has(event)) {
    globalListeners.set(event, new Set());
  }
  globalListeners.get(event)!.add(callback);

  // Ensure connection is active
  if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) {
    connect();
  }

  return () => {
    const s = globalListeners.get(event);
    if (s) {
      s.delete(callback);
      if (s.size === 0) globalListeners.delete(event);
    }
  };
}

/**
 * Force reconnection (useful after login/logout when token changes).
 */
export function reconnectWS(role?: string, locationId?: string) {
  disconnect();
  connect(role, locationId);
}

export default useWebSocket;
