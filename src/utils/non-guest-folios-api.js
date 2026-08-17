import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

export const fetchNonGuestFolios = async (params = {}) => {
  const response = await axios.get(`${baseUrl}/api/non-guest-folios`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
};

export const fetchNonGuestFolioById = async (id) => {
  const response = await axios.get(`${baseUrl}/api/non-guest-folios/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const createNonGuestFolio = async (payload) => {
  const response = await axios.post(`${baseUrl}/api/non-guest-folios`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const addNonGuestFolioItem = async (id, payload) => {
  const response = await axios.post(`${baseUrl}/api/non-guest-folios/${id}/items`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

// Adds/changes a folio's guest_name/guest_phone at any point in its life —
// typically once it's clear the folio needs to be traced back to a real
// person (an unpaid balance, or a credit from an overpayment).
export const updateNonGuestFolioGuestInfo = async (id, payload) => {
  const response = await axios.put(`${baseUrl}/api/non-guest-folios/${id}/guest-info`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const closeNonGuestFolio = async (id) => {
  const response = await axios.put(
    `${baseUrl}/api/non-guest-folios/${id}/close`,
    {},
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const recordNonGuestPayment = async (payload) => {
  const response = await axios.post(`${baseUrl}/api/non-guest-payments`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

// Bare call: all pending credit at the branch ("Unclaimed Credit"). With
// guestName: that guest's pending credit only — what the new-folio form's
// live lookup uses to show a "credit from a previous visit" banner.
export const fetchNonGuestCredits = async (guestName) => {
  const response = await axios.get(`${baseUrl}/api/non-guest-credits`, {
    headers: getAuthHeaders(),
    params: guestName ? { guest_name: guestName } : {},
  });
  return response.data;
};

export const applyNonGuestCredit = async (id, targetNonGuestFolioId) => {
  const response = await axios.post(
    `${baseUrl}/api/non-guest-credits/${id}/apply`,
    { target_non_guest_folio_id: targetNonGuestFolioId },
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const refundNonGuestCredit = async (id) => {
  const response = await axios.post(`${baseUrl}/api/non-guest-credits/${id}/refund`, {}, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
