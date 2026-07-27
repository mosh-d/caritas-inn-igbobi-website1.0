import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_SERVER_URL } from '../utils/server-config';
import { fetchAlerts } from '../utils/alerts-api';

const WebSocketContext = createContext(null);

const BRANCH_ID = import.meta.env.VITE_BRANCH_ID || '3';

// How long the socket has to stay disconnected before pages fall back to a
// plain HTTP refetch. The socket and the REST API are separate transports —
// a proxy/firewall that kills an idle websocket doesn't necessarily block
// HTTP, so this can genuinely recover data even while the socket itself
// hasn't reconnected. Keeps firing on this cadence for as long as the
// disconnect lasts; stops the instant 'connect' fires.
const DISCONNECTED_FALLBACK_MS = 30000;

function WebSocketProvider({ children }) {
  const socketRef = useRef(null);
  const roomListenersRef = useRef(new Set());
  const reservationListenersRef = useRef(new Set());
  const alertListenersRef = useRef(new Set());
  const disconnectedIntervalRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  // Increments every DISCONNECTED_FALLBACK_MS while genuinely disconnected;
  // never changes while connected. Pages that want the fallback refetch
  // depend on this value directly (no isConnected guard needed — by
  // construction it only ticks during an outage).
  const [disconnectedRefreshTick, setDisconnectedRefreshTick] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const prevAlertCountRef = useRef(null);

  // Single place that ever writes alertCount, whatever triggered the update
  // (a fresh fetch, the socket event, or a page that already has its own
  // up-to-date total) — keeps prevAlertCountRef consistent so the
  // increase-only notification below never fires off a stale comparison.
  const syncAlertCount = useCallback((newTotal) => {
    setAlertCount(newTotal);
    prevAlertCountRef.current = newTotal;
  }, []);

  // Fetch the real count from the DB. Exposed so the admin layout can
  // re-sync after login — the mount-time fetch fails silently on the
  // public site / login screen (no auth yet) and would leave the badge at 0.
  const refreshAlertCount = useCallback(() => {
    fetchAlerts()
      .then((data) => syncAlertCount(data.total ?? 0))
      .catch(() => {});
  }, [syncAlertCount]);

  useEffect(() => {
    refreshAlertCount();
  }, [refreshAlertCount]);

  useEffect(() => {
    const socketUrl = SOCKET_SERVER_URL;

    console.log('🔌 [WebSocketProvider] Connecting to:', socketUrl);

    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true });

    socketRef.current.on('connect', () => {
      console.log(`[WebSocket] ✅ Connected (id: ${socketRef.current.id})`);
      setIsConnected(true);
      if (disconnectedIntervalRef.current) {
        clearInterval(disconnectedIntervalRef.current);
        disconnectedIntervalRef.current = null;
      }
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log(`[WebSocket] ❌ Disconnected (reason: ${reason})`);
      setIsConnected(false);
      if (!disconnectedIntervalRef.current) {
        disconnectedIntervalRef.current = setInterval(() => {
          console.log(`[WebSocket] ⚠️ Still disconnected after ${DISCONNECTED_FALLBACK_MS / 1000}s — refreshing data over HTTP as a fallback`);
          setDisconnectedRefreshTick((t) => t + 1);
        }, DISCONNECTED_FALLBACK_MS);
      }
    });

    // Handle rooms_updated
    socketRef.current.on('rooms_updated', (data) => {
      console.log('📢 [WebSocketProvider] Rooms updated:', data);
      if (Number(data.branch_id) === Number(BRANCH_ID)) {
        roomListenersRef.current.forEach(callback => {
          try { callback(data); } catch (e) { console.error(e); }
        });
      }
    });

    // Handle new_reservation
    socketRef.current.on('new_reservation', (data) => {
      console.log('🔔 [WebSocketProvider] New reservation:', data);
      if (Number(data.branch_id) === Number(BRANCH_ID)) {
        reservationListenersRef.current.forEach(callback => {
          try { callback(data); } catch (e) { console.error(e); }
        });
      }
    });

    // Handle alerts_updated
    socketRef.current.on('alerts_updated', (data) => {
      console.log('🚨 [WebSocketProvider] Alerts updated:', data);
      if (Number(data.branch_id) === Number(BRANCH_ID)) {
        const newCount = data.alert_count ?? 0;
        const prev = prevAlertCountRef.current;
        // Update shared badge count
        syncAlertCount(newCount);
        // Browser notification only when count increases
        if (prev !== null && newCount > prev && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Hotel PMS — New Alert', {
            body: `${newCount} unresolved alert${newCount !== 1 ? 's' : ''} require${newCount === 1 ? 's' : ''} attention.`,
            icon: '/favicon.ico',
          });
        }
        // Notify page-level subscribers (e.g. AdminAlerts full reload)
        alertListenersRef.current.forEach(callback => {
          try { callback(data); } catch (e) { console.error(e); }
        });
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (disconnectedIntervalRef.current) clearInterval(disconnectedIntervalRef.current);
    };
  }, []);

  const subscribe = useCallback((callback, type = 'rooms') => {
    const targetSet =
      type === 'reservations' ? reservationListenersRef.current :
      type === 'alerts' ? alertListenersRef.current :
      roomListenersRef.current;
    targetSet.add(callback);
    return () => targetSet.delete(callback);
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe, alertCount, refreshAlertCount, syncAlertCount, disconnectedRefreshTick }}>
      {children}
    </WebSocketContext.Provider>
  );
}

function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}

export { WebSocketProvider, useWebSocketContext };
