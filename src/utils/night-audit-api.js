import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

export const runNightAudit = async (audit_date) => {
  const response = await axios.post(
    `${baseUrl}/api/night-audit/run`,
    { audit_date },
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const fetchNightAuditHistory = async (params = {}) => {
  const response = await axios.get(`${baseUrl}/api/night-audit/history`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
};
