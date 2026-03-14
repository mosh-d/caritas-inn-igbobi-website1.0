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
  const listenersRef = useRef(new Set());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initializeConnection = async () => {
      await initializeSocketUrl();
      console.log('🔌 [WebSocketProvider] Initializing single WebSocket connection to:', SOCKET_URL);
      console.log('📍 [WebSocketProvider] Branch ID:', BRANCH_ID);

      // Create single socket instance
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
      });

      socketRef.current.on('connect', () => {
        console.log('✅ [WebSocketProvider] WebSocket connected:', socketRef.current.id);
        setIsConnected(true);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ [WebSocketProvider] WebSocket disconnected:', reason);
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ [WebSocketProvider] Connection error:', error.message);
        setIsConnected(false);
      });

      // Listen for rooms_updated events
      socketRef.current.on('rooms_updated', (data) => {
        console.log('📢 [WebSocketProvider] Rooms updated event received:', data);
        
        if (data.branch_id === parseInt(BRANCH_ID)) {
          console.log(`✅ [WebSocketProvider] Update is for our branch (${BRANCH_ID}), notifying ${listenersRef.current.size} listeners...`);
          
          // Notify all registered listeners
          listenersRef.current.forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error('Error in WebSocket listener:', error);
            }
          });
        } else {
          console.log(`ℹ️ [WebSocketProvider] Update is for different branch (${data.branch_id}), ignoring...`);
        }
      });
    };

    initializeConnection();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        console.log('🔌 [WebSocketProvider] Disconnecting WebSocket');
        socketRef.current.disconnect();
      }
    };
  }, []);

  const subscribe = (callback) => {
    console.log('➕ [WebSocketProvider] Adding listener, total:', listenersRef.current.size + 1);
    listenersRef.current.add(callback);
    
    return () => {
      console.log('➖ [WebSocketProvider] Removing listener, total:', listenersRef.current.size - 1);
      listenersRef.current.delete(callback);
    };
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
