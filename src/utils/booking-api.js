import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";

const API_BASE_URL = SERVER_BASE_URL;

export const createReservation = async (reservationData) => {
  try {
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
    return response.data;
  } catch (error) {
    // Status and server message only - the request carried the guest's
    // name, email and phone, which don't belong in a browser console.
    console.error("Booking request failed:", error.response?.status, error.response?.data?.message || error.message);
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

