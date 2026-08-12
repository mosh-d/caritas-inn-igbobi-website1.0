import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

export const fetchWalkInFolios = async (params = {}) => {
  const response = await axios.get(`${baseUrl}/api/walk-in-folios`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
};

export const fetchWalkInFolioById = async (id) => {
  const response = await axios.get(`${baseUrl}/api/walk-in-folios/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const createWalkInFolio = async (payload) => {
  const response = await axios.post(`${baseUrl}/api/walk-in-folios`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const addWalkInFolioItem = async (id, payload) => {
  const response = await axios.post(`${baseUrl}/api/walk-in-folios/${id}/items`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

// Adds/changes a folio's guest_name/guest_phone at any point in its life —
// typically once it's clear the folio needs to be traced back to a real
// person (an unpaid balance, or a credit from an overpayment).
export const updateWalkInFolioGuestInfo = async (id, payload) => {
  const response = await axios.put(`${baseUrl}/api/walk-in-folios/${id}/guest-info`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const closeWalkInFolio = async (id) => {
  const response = await axios.put(
    `${baseUrl}/api/walk-in-folios/${id}/close`,
    {},
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const recordWalkInPayment = async (payload) => {
  const response = await axios.post(`${baseUrl}/api/walk-in-payments`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

// Bare call: all pending credit at the branch ("Unclaimed Credit"). With
// guestName: that guest's pending credit only — what the new-folio form's
// live lookup uses to show a "credit from a previous visit" banner.
export const fetchWalkInCredits = async (guestName) => {
  const response = await axios.get(`${baseUrl}/api/walk-in-credits`, {
    headers: getAuthHeaders(),
    params: guestName ? { guest_name: guestName } : {},
  });
  return response.data;
};

export const applyWalkInCredit = async (id, targetWalkInFolioId) => {
  const response = await axios.post(
    `${baseUrl}/api/walk-in-credits/${id}/apply`,
    { target_walk_in_folio_id: targetWalkInFolioId },
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const refundWalkInCredit = async (id) => {
  const response = await axios.post(`${baseUrl}/api/walk-in-credits/${id}/refund`, {}, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
