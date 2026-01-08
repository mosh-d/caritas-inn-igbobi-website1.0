import axios from "axios";

const PRODUCTION_URL = "https://five-clover-shared-backend.onrender.com";
const LOCAL_URL = "http://localhost:3000";
let API_BASE_URL = PRODUCTION_URL;

// Try to connect to local server first, fall back to production
const testLocalConnection = async () => {
  try {
    // Try to connect to the root endpoint
    const response = await axios.get(LOCAL_URL, {
      timeout: 1000,
      // Don't throw on non-2xx status codes
      validateStatus: () => true,
    });
    // If we get any response, the server is up
    if (response.status) {
      console.log("✅ Connected to local development server");
      return LOCAL_URL;
    }
  } catch (error) {
    console.log("⚠️ Local server not available, falling back to production");
  }
  return PRODUCTION_URL;
};

// Initialize the base URL
(async () => {
  API_BASE_URL = await testLocalConnection();
  console.log(`Using API base URL: ${API_BASE_URL}`);
})();

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
      }
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
