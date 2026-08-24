import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

export const fetchFolios = async (params = {}) => {
  const response = await axios.get(`${baseUrl}/api/folios`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
};

export const fetchPendingFolios = async () => {
  const response = await axios.get(`${baseUrl}/api/folios/pending`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const fetchOverdueFolios = async () => {
  const response = await axios.get(`${baseUrl}/api/folios/overdue`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const fetchFolioById = async (id) => {
  const response = await axios.get(`${baseUrl}/api/folios/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const fetchFolioItems = async (id) => {
  const response = await axios.get(`${baseUrl}/api/folios/${id}/items`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const addFolioItem = async (id, payload) => {
  const response = await axios.post(`${baseUrl}/api/folios/${id}/items`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

// Posts a whole order (Guest Sales) as one atomic batch — payload is
// { items: [...], bill_no? } — instead of one addFolioItem call per line.
export const addFolioItemsBatch = async (id, payload) => {
  const response = await axios.post(`${baseUrl}/api/folios/${id}/items/batch`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const closeFolio = async (id) => {
  const response = await axios.put(
    `${baseUrl}/api/folios/${id}/close`,
    {},
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const createFolio = async (payload) => {
  const response = await axios.post(`${baseUrl}/api/folios`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const recordPayment = async (payload) => {
  const response = await axios.post(`${baseUrl}/api/payments`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const recordRefund = async (payload) => {
  const response = await axios.post(`${baseUrl}/api/payments/refund`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const fetchPayments = async (params = {}) => {
  const response = await axios.get(`${baseUrl}/api/payments`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
};

export const recordDeposit = async (payload) => {
  const response = await axios.post(`${baseUrl}/api/deposits`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const fetchDeposits = async (params = {}) => {
  const response = await axios.get(`${baseUrl}/api/deposits`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
};

export const applyDeposit = async (id, targetReservationId) => {
  const response = await axios.post(
    `${baseUrl}/api/deposits/${id}/apply`,
    targetReservationId ? { target_reservation_id: targetReservationId } : {},
    { headers: getAuthHeaders() },
  );
  return response.data;
};

// Pending deposits left over from any of this guest's *other* reservations —
// "credit from a previous stay" they can reclaim on this one.
export const fetchGuestCredit = async (guestId) => {
  const response = await axios.get(`${baseUrl}/api/deposits/guest-credit`, {
    headers: getAuthHeaders(),
    params: { guest_id: guestId },
  });
  return response.data;
};

export const refundDeposit = async (id) => {
  const response = await axios.post(`${baseUrl}/api/deposits/${id}/refund`, {}, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
