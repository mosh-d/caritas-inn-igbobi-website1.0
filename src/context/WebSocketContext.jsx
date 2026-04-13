import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const WebSocketContext = createContext(null);

const PRODUCTION_URL = import.meta.env.VITE_BACKEND_URL || "https://five-clover-shared-backend.onrender.com";
const LOCAL_URL = "http://localhost:3000";
const BRANCH_ID = import.meta.env.VITE_BRANCH_ID || '3';

function WebSocketProvider({ children }) {
  const socketRef = useRef(null);
  const roomListenersRef = useRef(new Set());
  const reservationListenersRef = useRef(new Set());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initializeConnection = async () => {
      // Determine URL: priority to local in dev, else production
      let socketUrl = PRODUCTION_URL;
      
      if (!import.meta.env.PROD) {
        try {
          const response = await axios.get(LOCAL_URL, { timeout: 800, validateStatus: () => true });
          if (response.status) socketUrl = LOCAL_URL;
        } catch (e) {
          console.log("WebSocket: Local server not available, using production");
        }
      }

      console.log('🔌 [WebSocketProvider] Connecting to:', socketUrl);

      socketRef.current = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true });

      socketRef.current.on('connect', () => {
        console.log('✅ [WebSocketProvider] Connected:', socketRef.current.id);
        setIsConnected(true);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ [WebSocketProvider] Disconnected:', reason);
        setIsConnected(false);
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
