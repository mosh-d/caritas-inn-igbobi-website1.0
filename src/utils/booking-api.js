import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";

const API_BASE_URL = SERVER_BASE_URL;

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

export const fetchBlockedDates = async (roomTypeId, from, to) => {
  const baseUrl = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const response = await axios.get(`${baseUrl}/api/reservations/blocked-dates`, {
    params: { room_type_id: roomTypeId, from, to },
  });
  return response.data; // string[] of "YYYY-MM-DD"
};

