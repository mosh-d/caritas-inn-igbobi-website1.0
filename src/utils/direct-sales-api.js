import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

// Legacy non-guest itemized sales — no guest, no reservation, no folio.
export const fetchDirectSales = async (date) => {
  const response = await axios.get(`${baseUrl}/api/direct-sales`, {
    headers: getAuthHeaders(),
    params: date ? { date } : undefined,
  });
  return response.data;
};

export const createDirectSale = async (payload) => {
  const response = await axios.post(`${baseUrl}/api/direct-sales`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
