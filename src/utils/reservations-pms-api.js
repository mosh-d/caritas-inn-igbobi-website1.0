import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

export const fetchReservations = async (params = {}) => {
  const response = await axios.get(`${baseUrl}/api/reservations`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
};

export const fetchReservationById = async (id) => {
  const response = await axios.get(`${baseUrl}/api/reservations/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const updateReservation = async (id, payload) => {
  const response = await axios.put(`${baseUrl}/api/reservations/${id}`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const fetchReservationNotes = async (id) => {
  const response = await axios.get(`${baseUrl}/api/reservations/${id}/notes`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const addReservationNote = async (id, note) => {
  const response = await axios.post(`${baseUrl}/api/reservations/${id}/notes`, { note }, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const deleteReservationNote = async (id, noteId) => {
  const response = await axios.delete(`${baseUrl}/api/reservations/${id}/notes/${noteId}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const cancelReservationById = async (id, reason) => {
  const response = await axios.post(
    `${baseUrl}/api/reservations/${id}/cancel`,
    { reason },
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const markNoShow = async (id) => {
  const response = await axios.post(
    `${baseUrl}/api/reservations/${id}/no-show`,
    {},
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const undoNoShow = async (id) => {
  const response = await axios.post(
    `${baseUrl}/api/reservations/${id}/undo-no-show`,
    {},
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const undoExpiredHold = async (id) => {
  const response = await axios.post(
    `${baseUrl}/api/reservations/${id}/undo-expired-hold`,
    {},
    { headers: getAuthHeaders() },
  );
  return response.data;
};

// Public — used by the guest-facing booking flow, which has no staff
// session. Kept for that caller; staff-initiated confirms use
// confirmReservationById below instead, so they get audit attribution.
export const confirmReservation = async (reservation_id) => {
  const response = await axios.post(
    `${baseUrl}/api/reservations/confirm`,
    { reservation_id },
    { headers: { "Content-Type": "application/json" } },
  );
  return response.data;
};

// Staff-initiated confirmation (Admin Bookings, Admin Reservations, walk-in
// check-in) — guarded, so the resulting audit_logs entry is attributed to
// the staff member who confirmed it.
export const confirmReservationById = async (id) => {
  const response = await axios.post(
    `${baseUrl}/api/reservations/${id}/confirm`,
    {},
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const emergencyCheckout = async (reservation_id) => {
  const response = await axios.post(
    `${baseUrl}/api/reservations/emergency-checkout`,
    { reservation_id },
    { headers: { "Content-Type": "application/json" } },
  );
  return response.data;
};

export const buildReservationsExportUrl = ({ branchId, statuses = [], startDate, endDate }) => {
  let queryParams = `branch_id=${branchId}`;
  if (statuses.length > 0) queryParams += `&status=${statuses.join(",")}`;
  if (startDate) queryParams += `&start_date=${startDate}`;
  if (endDate) queryParams += `&end_date=${endDate}`;
  return `${baseUrl}/api/bookings/export?${queryParams}`;
};

export const checkAvailability = async (branchId, startDate, endDate) => {
  const response = await axios.post(`${baseUrl}/api/reservations/availability`, {
    branch_id: branchId,
    start_date: startDate,
    end_date: endDate,
  });
  return response.data;
};

// Read-only tape-chart data — one row per numbered physical room, plus an
// "unassigned" bucket per room type for bookings without a specific room yet.
export const fetchRoomChart = async (startDate, endDate) => {
  const response = await axios.get(`${baseUrl}/api/rooms/chart`, {
    headers: getAuthHeaders(),
    params: { start_date: startDate, end_date: endDate },
  });
  return response.data;
};

export const fetchRoomStatusList = async () => {
  const response = await axios.get(`${baseUrl}/api/rooms/status`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const createAdminReservation = async (payload) => {
  const response = await axios.post(`${baseUrl}/api/reservations`, payload, {
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
  });
  return response.data;
};

// Phase 2: check-in/check-out operations
export const checkInReservation = async (id) => {
  const response = await axios.post(`${baseUrl}/api/reservations/${id}/check-in`, {}, { headers: getAuthHeaders() });
  return response.data;
};

export const assignRoom = async (id, roomNumbers) => {
  const response = await axios.post(
    `${baseUrl}/api/reservations/${id}/assign-room`,
    { room_numbers: roomNumbers },
    { headers: getAuthHeaders() },
  );
  return response.data;
};

// Real, numbered rooms of the reservation's own type that aren't occupied
// right now or promised to an overlapping stay — for the check-in room picker.
export const fetchAvailableRoomsForReservation = async (id) => {
  const response = await axios.get(`${baseUrl}/api/reservations/${id}/available-rooms`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

// Same, but before a reservation exists yet (walk-in flow) — pass the room
// type and stay dates directly.
export const fetchAvailableRoomNumbers = async ({ roomTypeId, checkIn, checkOut }) => {
  const response = await axios.get(`${baseUrl}/api/reservations/available-rooms`, {
    headers: getAuthHeaders(),
    params: { room_type_id: roomTypeId, check_in: checkIn, check_out: checkOut },
  });
  return response.data;
};

export const checkOutReservation = async (id) => {
  const response = await axios.post(`${baseUrl}/api/reservations/${id}/check-out`, {}, { headers: getAuthHeaders() });
  return response.data;
};

export const extendStay = async (id, newCheckOut) => {
  const response = await axios.post(
    `${baseUrl}/api/reservations/${id}/extend-stay`,
    { new_check_out: newCheckOut },
    { headers: getAuthHeaders() },
  );
  return response.data;
};
