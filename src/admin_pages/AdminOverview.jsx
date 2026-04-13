import { useState, useEffect, useCallback, useRef } from "react";
import { fetchRoomDetails, fetchMaintenanceMode } from "../utils/room-data";
import { useWebSocketContext } from "../context/WebSocketContext";
import { IoClose } from "react-icons/io5";
import axios from "axios";
import Button from "../components/shared/Button";

const PRODUCTION_URL = "https://five-clover-shared-backend.onrender.com";
const LOCAL_URL = "http://localhost:3000";

const ROOM_TYPE_MAP = {
  "Classic Suite": 7,
  "Deluxe Suite": 8,
  "Executive Suite": 9,
  // "Royal Suite": 6,
  // "Executive Suite": 5
};

export default function AdminOverviewPage() {
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_BACKEND_URL || PRODUCTION_URL);
  const [roomType, setRoomType] = useState("Classic Suite");
  const [roomDetails, setRoomDetails] = useState({
    maxCapacity: 0,
    totalAvailableRooms: 0,
    activeBookings: 0,
    expiredBookings: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);
  const [tempRoomCount, setTempRoomCount] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const isEditingRef = useRef(isEditing);
  useEffect(() => { isEditingRef.current = isEditing; }, [isEditing]);

  const loadRoomData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const roomTypeId = ROOM_TYPE_MAP[roomType];
      const data = await fetchRoomDetails();
      const roomTypeData = data.room_types?.find((rt) => rt.room_type_id === roomTypeId) || {};
      setRoomDetails({
        maxCapacity: roomTypeData.max_capacity || 0,
        totalAvailableRooms: roomTypeData.available_rooms || 0,
        activeBookings: 0,
        expiredBookings: 0 });
      setTempRoomCount(roomTypeData.available_rooms?.toString() || "0");
    } catch (error) {
      console.error("Error loading room data:", error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [roomType]);

  const loadRoomDataRef = useRef(loadRoomData);
  useEffect(() => { loadRoomDataRef.current = loadRoomData; }, [loadRoomData]);

  const checkMaintenanceMode = useCallback(async () => {
    try {
      const data = await fetchMaintenanceMode();
      if (data.maintenance_mode !== undefined) {
        setMaintenanceMode(data.maintenance_mode === 1);
      }
    } catch (error) {
      console.error("Error checking maintenance mode:", error);
    }
  }, []);

  const handleRoomsUpdated = useCallback((data) => {
    console.log('📡 [AdminOverview] WebSocket update received:', data);
    if (!isEditingRef.current) loadRoomDataRef.current(false);
  }, []);

  const { subscribe } = useWebSocketContext();

  useEffect(() => {
    const detectUrl = async () => {
      if (!import.meta.env.PROD && !import.meta.env.VITE_BACKEND_URL) {
        try {
          const resp = await axios.get(LOCAL_URL, { timeout: 1000, validateStatus: () => true });
          if (resp.status) setApiUrl(LOCAL_URL);
        } catch (e) { }
      }
    };
    detectUrl();
  }, []);

  useEffect(() => {
    if (apiUrl) {
      loadRoomData(true);
      checkMaintenanceMode();
      const unsubscribe = subscribe(handleRoomsUpdated, 'rooms');
      const roomsInterval = setInterval(() => loadRoomData(false), 5000);
      const maintenanceInterval = setInterval(() => checkMaintenanceMode(), 5000);
      return () => {
        if (unsubscribe) unsubscribe();
        clearInterval(roomsInterval);
        clearInterval(maintenanceInterval);
      };
    }
  }, [apiUrl, loadRoomData, checkMaintenanceMode, handleRoomsUpdated, subscribe]);

  const handleUpdateRoomCount = async () => {
    setIsProcessingUpdate(true);
    setUpdateMessage("");
    setErrorMessage("");

    try {
      const roomTypeId = ROOM_TYPE_MAP[roomType];
      const newCount = parseInt(tempRoomCount, 10);
      const baseUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
      
      const response = await axios.post(
        `${baseUrl}/api/rooms/manual-update`,
        { room_type_id: roomTypeId, new_room_count: newCount },
        { headers: { "Content-Type": "application/json" } }
      );

      setRoomDetails(prev => ({ ...prev, totalAvailableRooms: response.data.new_available || newCount }));
      setUpdateMessage(response.data.message);
      
      // Safety Fetches
      setTimeout(() => loadRoomData(false), 2000);
      setTimeout(() => loadRoomData(false), 6000);
      
      // FINAL SAFETY + UNBLOCK (10 SECONDS)
      setTimeout(() => {
        loadRoomData(false);
        setIsProcessingUpdate(false);
        setIsEditing(false);
      }, 10000);

      setTimeout(() => setUpdateMessage(""), 10000);
    } catch (error) {
      console.error("Error updating room count:", error);
      setUpdateMessage(error.response?.data?.message || "Failed to update room count");
      setIsProcessingUpdate(false);
      setTimeout(() => setUpdateMessage(""), 5000);
    }
  };

  return (
    <>
      <div
        data-component="AdminOverview"
        className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[4rem]"
      >
        <div className="w-full flex justify-between items-center max-sm:flex-col max-sm:items-start max-sm:gap-4">
          <h1 className="text-6xl font-secondary font-bold text-[color:var(--black)]">
            Overview
          </h1>
        </div>

        <div className="w-full">
          <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-6 w-full ">
            <div className="flex justify-between items-center pb-4 border-b border-gray-300">
              <h2 className="text-4xl font-secondary font-bold text-gray-800">
                Room Inventory
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 bg-gray-50 rounded-xl">
                <p className="text-2xl font-semibold text-gray-500 mb-1">Room Category</p>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  disabled={isEditing}
                  className="w-full text-3xl font-bold bg-transparent border-none focus:ring-0 cursor-pointer"
                >
                  {Object.keys(ROOM_TYPE_MAP).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-6 bg-gray-50 rounded-xl relative group">
                <p className="text-2xl font-semibold text-gray-500 mb-1">Available Rooms</p>
                {isEditing ? (
                  <div className="flex items-center gap-4">
                    <select
                      value={tempRoomCount}
                      onChange={(e) => setTempRoomCount(e.target.value)}
                      disabled={isProcessingUpdate}
                      className="border border-[color:var(--text-color)]/30 rounded-md px-4 py-2 text-3xl focus:outline-none focus:border-[color:var(--emphasis)] w-32 bg-[color:var(--background-color)]"
                    >
                      {[...Array(roomDetails.maxCapacity + 1).keys()].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                    {isProcessingUpdate ? (
                      <div className="flex items-center justify-center px-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--emphasis)]"></div>
                      </div>
                    ) : (
                      <Button
                        onClick={handleUpdateRoomCount}
                        className="!bg-[color:var(--emphasis)] !border-[color:var(--emphasis)] hover:!bg-[color:var(--emphasis)]/80 text-white !text-2xl"
                      >
                        Update
                      </Button>
                    )}
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={isProcessingUpdate}
                      className="p-2 text-[color:var(--text-color)] hover:text-red-600 transition-colors"
                      title="Cancel"
                    >
                      <IoClose size={24} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-5xl font-bold text-gray-800">
                      {roomDetails.totalAvailableRooms}
                    </p>
                    <button
                      onClick={() => {
                        setTempRoomCount(roomDetails.totalAvailableRooms.toString());
                        setIsEditing(true);
                      }}
                      className="text-2xl text-[color:var(--emphasis)] hover:underline hover:cursor-pointer font-bold"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 rounded-xl">
                <p className="text-2xl font-semibold text-gray-500 mb-1">Max Capacity</p>
                <p className="text-5xl font-bold text-gray-800">
                  {roomDetails.maxCapacity}
                </p>
              </div>
            </div>

            <p className="text-2xl text-red-500">Only use manual update for emergencies!</p>

            {updateMessage && (
              <div className={`p-4 rounded-lg text-xl mb-4 ${updateMessage.includes("Failed") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                {updateMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {maintenanceMode && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999 }}
        >
          <div
            style={{
              padding: "4rem",
              borderRadius: "1rem",
              maxWidth: "50rem",
              textAlign: "center",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}
          >
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔧</div>
            <h2
              style={{
                fontSize: "2.4rem",
                fontWeight: "bold",
                marginBottom: "1rem" }}
            >
              Maintenance In Progress
            </h2>
            <p style={{ fontSize: "1.6rem", color: "#666" }}>
              Our system is currently undergoing scheduled maintenance. Please check back later.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
