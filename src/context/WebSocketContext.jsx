import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_SERVER_URL } from '../utils/server-config';
import { fetchAlerts } from '../utils/alerts-api';
import { canAccessNavItem } from '../components/shared/adminNavItems';

const WebSocketContext = createContext(null);

const BRANCH_ID = import.meta.env.VITE_BRANCH_ID || '3';

// How long the socket has to stay disconnected before pages fall back to a
// plain HTTP refetch. The socket and the REST API are separate transports —
// a proxy/firewall that kills an idle websocket doesn't necessarily block
// HTTP, so this can genuinely recover data even while the socket itself
// hasn't reconnected. Keeps firing on this cadence for as long as the
// disconnect lasts; stops the instant 'connect' fires.
const DISCONNECTED_FALLBACK_MS = 30000;

// A single walk-in changes a reservation four times within seconds (created,
// room assigned, confirmed, checked in). Refreshes are coalesced over this
// window so each page refetches once rather than four times.
const RESERVATION_REFRESH_DEBOUNCE_MS = 250;

function WebSocketProvider({ children }) {
  const socketRef = useRef(null);
  const roomListenersRef = useRef(new Set());
  const reservationListenersRef = useRef(new Set());
  // Kept apart from the refresh listeners above: this is the front desk
  // popup, which only a booking from the guest-facing site may raise.
  const newReservationListenersRef = useRef(new Set());
  const reservationRefreshTimerRef = useRef(null);
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
      reconnection: true,
      // Lets the server join this connection to a branch-scoped Socket.IO
      // room (see RoomsGateway.handleConnection) instead of broadcasting
      // every event to every connected client regardless of branch. Not an
      // auth boundary — the client-side branch_id filter below still runs
      // as a harmless defense-in-depth layer, and this is the same
      // unauthenticated BRANCH_ID the public site already uses, so it works
      // for the logged-out booking flow too, not just the admin panel.
      query: { branchId: BRANCH_ID },
    });

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

    const notifyReservationListeners = (data) => {
      if (reservationRefreshTimerRef.current) clearTimeout(reservationRefreshTimerRef.current);
      reservationRefreshTimerRef.current = setTimeout(() => {
        reservationRefreshTimerRef.current = null;
        reservationListenersRef.current.forEach(callback => {
          try { callback(data); } catch (e) { console.error(e); }
        });
      }, RESERVATION_REFRESH_DEBOUNCE_MS);
    };

    // Any reservation changing state — what keeps a displayed status honest.
    socketRef.current.on('reservations_updated', (data) => {
      if (Number(data.branch_id) === Number(BRANCH_ID)) notifyReservationListeners(data);
    });

    // A booking from the guest-facing site: refreshes the lists like any
    // other change, and separately raises the front desk popup.
    socketRef.current.on('new_reservation', (data) => {
      console.log('🔔 [WebSocketProvider] New online booking:', data);
      if (Number(data.branch_id) === Number(BRANCH_ID)) {
        notifyReservationListeners(data);
        newReservationListenersRef.current.forEach(callback => {
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
        // Browser notification only when count increases, and only for an
        // account that can open Alerts: the notification exists to send them
        // there, so a role without that page never gets one (2026-09-14).
        if (prev !== null && newCount > prev && canAccessNavItem('/admin/alerts')
          && 'Notification' in window && Notification.permission === 'granted') {
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
      if (reservationRefreshTimerRef.current) clearTimeout(reservationRefreshTimerRef.current);
    };
  }, []);

  const subscribe = useCallback((callback, type = 'rooms') => {
    const targetSet =
      type === 'reservations' ? reservationListenersRef.current :
      // The popup only — never a walk-in the receptionist is typing.
      type === 'new_reservation' ? newReservationListenersRef.current :
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

// A context module exports its provider and its hook together by design;
// the fast-refresh rule only wants component-only files. Pre-existing
// lint failure, surfaced when this file was next touched (2026-09-14).
// eslint-disable-next-line react-refresh/only-export-components
export { WebSocketProvider, useWebSocketContext };
