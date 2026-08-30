import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

// Active staff accounts for the current branch — id/username/role only.
// Feeds the Reports page's "Shift" dropdown. role is optional (omit for
// the original receptionist roster, or pass "waitron" for the Food/Drink
// Sales/Bar Stock tabs' own shift picker) — allowlisted server-side.
export const fetchStaffAccounts = async (role) => {
  const response = await axios.get(`${baseUrl}/api/staff-accounts`, {
    headers: getAuthHeaders(),
    params: role ? { role } : undefined,
  });
  return response.data;
};
