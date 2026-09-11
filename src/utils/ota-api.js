import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

// Nights an OTA is paying for instead of the guest. They stay charged on the
// folio — so it reads owing until the money lands — but they are left out of
// what the desk asks the guest for (the folio's guest_due).
export const fetchOtaSettlements = async (status) => {
  const response = await axios.get(`${baseUrl}/api/ota-settlements`, {
    headers: getAuthHeaders(),
    params: status ? { status } : undefined,
  });
  return response.data;
};

// What those nights are worth before anyone edits the figure down to the
// OTA's net-of-commission remittance.
export const previewOtaAmount = async ({ reservationId, startDate, endDate, includesBreakfast }) => {
  const response = await axios.get(`${baseUrl}/api/ota-settlements/preview`, {
    headers: getAuthHeaders(),
    params: {
      reservation_id: reservationId,
      start_date: startDate,
      end_date: endDate,
      includes_breakfast: includesBreakfast ? "true" : "false",
    },
  });
  return response.data;
};

export const createOtaSettlement = async ({ reservationId, startDate, endDate, includesBreakfast, amount, reference }) => {
  const response = await axios.post(
    `${baseUrl}/api/ota-settlements`,
    {
      reservation_id: reservationId,
      start_date: startDate,
      end_date: endDate,
      includes_breakfast: Boolean(includesBreakfast),
      ...(amount ? { amount: Number(amount) } : {}),
      ...(reference ? { reference } : {}),
    },
    { headers: getAuthHeaders() },
  );
  return response.data;
};

// The OTA's money arrived. The payment lands on the folio with method "ota"
// automatically — nobody picks it — so it settles and reports like any other
// money taken.
export const markOtaSettlementPaid = async (id, reference) => {
  const response = await axios.post(
    `${baseUrl}/api/ota-settlements/${id}/paid`,
    reference ? { reference } : {},
    { headers: getAuthHeaders() },
  );
  return response.data;
};
