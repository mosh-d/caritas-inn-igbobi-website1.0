import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const WebSocketContext = createContext(null);

const PRODUCTION_URL = "https://five-clover-shared-backend.onrender.com";
const LOCAL_URL = "http://localhost:3000";
const BRANCH_ID = import.meta.env.VITE_BRANCH_ID || '3';

// Determine WebSocket URL based on environment with same logic as API calls
let SOCKET_URL = PRODUCTION_URL;

const initializeSocketUrl = async () => {
  // Skip localhost test in production builds
  if (import.meta.env.PROD) {
    console.log("📦 WebSocket: Production build - using production server");
    SOCKET_URL = PRODUCTION_URL;
    return;
  }

  // Only test localhost connection in development
  try {
    const response = await axios.get(LOCAL_URL, {
      timeout: 1000,
      validateStatus: () => true,
    });
    if (response.status) {
      console.log("✅ WebSocket: Connected to local development server");
      SOCKET_URL = LOCAL_URL;
      return;
    }
  } catch (error) {
    console.log("⚠️ WebSocket: Local server not available, using production");
  }
  SOCKET_URL = PRODUCTION_URL;
};

// Initialize the socket URL
initializeSocketUrl();

function WebSocketProvider({ children }) {
  const socketRef = useRef(null);
  const roomListenersRef = useRef(new Set());
  const reservationListenersRef = useRef(new Set());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initializeConnection = async () => {
      await initializeSocketUrl();
      console.log('🔌 [WebSocketProvider] Initializing WebSocket connection to:', SOCKET_URL);

      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
      });

      socketRef.current.on('connect', () => {
        console.log('✅ [WebSocketProvider] WebSocket connected:', socketRef.current.id);
        setIsConnected(true);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ [WebSocketProvider] WebSocket disconnected:', reason);
        setIsConnected(false);
      });

      // Handle rooms_updated
      socketRef.current.on('rooms_updated', (data) => {
        if (data.branch_id === parseInt(BRANCH_ID)) {
          roomListenersRef.current.forEach(callback => {
            try { callback(data); } catch (e) { console.error(e); }
          });
        }
      });

      // Handle new_reservation
      socketRef.current.on('new_reservation', (data) => {
        console.log('🔔 [WebSocketProvider] New reservation event received:', data);
        if (data.branch_id === parseInt(BRANCH_ID)) {
          reservationListenersRef.current.forEach(callback => {
            try { callback(data); } catch (e) { console.error(e); }
          });
        }
      });
    };

    initializeConnection();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const subscribe = (callback, type = 'rooms') => {
    const targetRef = type === 'reservations' ? reservationListenersRef : roomListenersRef;
    targetRef.current.add(callback);
    return () => targetRef.current.delete(callback);
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe }}>
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

// eslint-disable-next-line react-refresh/only-export-components
export { WebSocketProvider, useWebSocketContext };
