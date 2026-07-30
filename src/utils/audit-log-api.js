import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

export const fetchAuditLogHistory = async (params = {}) => {
  const response = await axios.get(`${baseUrl}/api/audit-logs/history`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
};

// Distinct staff who have at least one logged action for this branch —
// feeds the Audit Trail page's staff filter dropdown.
export const fetchAuditStaffOptions = async () => {
  const response = await axios.get(`${baseUrl}/api/audit-logs/staff`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
