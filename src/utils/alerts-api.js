import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

export const fetchAlerts = async () => {
  const response = await axios.get(`${baseUrl}/api/alerts`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
