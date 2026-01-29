import axios from "axios";

const PRODUCTION_URL = "https://five-clover-shared-backend.onrender.com";
const LOCAL_URL = "http://localhost:3000";

// Determine API base URL based on environment
let API_BASE_URL = PRODUCTION_URL;

const initializeApiUrl = async () => {
  // Skip localhost test in production builds
  if (import.meta.env.PROD) {
    console.log("📦 Booking API: Production build - using production server");
    API_BASE_URL = PRODUCTION_URL;
    return;
  }

  // Only test localhost connection in development
  try {
    const response = await axios.get(LOCAL_URL, {
      timeout: 1000,
      validateStatus: () => true,
    });
    if (response.status) {
      console.log("✅ Connected to local development server");
      API_BASE_URL = LOCAL_URL;
      return;
    }
  } catch (error) {
    console.log("⚠️ Local server not available, using production");
  }
  API_BASE_URL = PRODUCTION_URL;
};

// Initialize the base URL
initializeApiUrl();

export const createReservation = async (reservationData) => {
  try {
    console.log("Sending reservation data to:", API_BASE_URL);
    console.log("Payload:", JSON.stringify(reservationData, null, 2));
    // Ensure API_BASE_URL doesn't end with a slash to prevent double slashes
    const baseUrl = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    const response = await axios.post(
      `${baseUrl}/api/reservations`,
      reservationData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      },
    );
    console.log("Reservation response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
    });
    throw error;
  }
};

export const getRoomTypeId = (roomTypeName) => {
  const roomTypeMap = {
    Standard: 6,
    Classic: 7,
    Deluxe: 8,
    Executive: 9,
  };
  return roomTypeMap[roomTypeName] || null;
};
