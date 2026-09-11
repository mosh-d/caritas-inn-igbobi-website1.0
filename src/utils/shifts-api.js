import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

// Whose shift the current business day (6am to 6am) is, for one rota:
// "receptionist" (front desk) or "waitron" (F&B). staff_account_id comes back
// null until someone records it, which is what locks that rota's pages (see
// ShiftGate).
export const fetchCurrentShift = async (role) => {
  const response = await axios.get(`${baseUrl}/api/shifts/current`, {
    headers: getAuthHeaders(),
    params: { role },
  });
  return response.data;
};

// Records it. Whoever is on the floor may name a colleague — staff resume
// around 8am while the business day starts at 6am — and every selection is
// written to the audit trail server-side. A receptionist can only record the
// front desk and a waitron only F&B; the server enforces that.
export const selectCurrentShift = async (role, staffAccountId) => {
  const response = await axios.post(
    `${baseUrl}/api/shifts/current`,
    { role, staff_account_id: Number(staffAccountId) },
    { headers: getAuthHeaders() },
  );
  return response.data;
};
