import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

// Active staff accounts for the current branch — id/username/role only.
// Feeds the Accommodation Report's "Shift" dropdown.
export const fetchStaffAccounts = async () => {
  const response = await axios.get(`${baseUrl}/api/staff-accounts`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
