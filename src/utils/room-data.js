import axios from "axios";

const API_BASE_URL = "https://five-clover-shared-backend.onrender.com";
const BRANCH_ID = 3;

export const fetchRoomDetails = async () => {
  try {
    // Ensure API_BASE_URL doesn't end with a slash to prevent double slashes
    const baseUrl = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    const response = await axios.post(
      `${baseUrl}/api/rooms/details`,
      {
        branch_id: BRANCH_ID,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true, // Important for sending cookies if using sessions
      }
    );

    // Axios automatically parses JSON and puts it in response.data
    return response.data;
  } catch (error) {
    console.error("Error fetching room details:", error);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error:", error.message);
    }
    throw error;
  }
};
