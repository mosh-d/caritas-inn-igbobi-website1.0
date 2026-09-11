import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

// Whose shift the current business day (6am to 6am) is. staff_account_id
// comes back null until the front desk records it, which is what locks the
// receptionist views (see ShiftGate).
export const fetchCurrentShift = async () => {
  const response = await axios.get(`${baseUrl}/api/shifts/current`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

// Records it. A receptionist may name a colleague — the desk resumes around
// 8am while the business day starts at 6am — and every selection is written
// to the audit trail server-side.
export const selectCurrentShift = async (staffAccountId) => {
  const response = await axios.post(
    `${baseUrl}/api/shifts/current`,
    { staff_account_id: Number(staffAccountId) },
    { headers: getAuthHeaders() },
  );
  return response.data;
};
