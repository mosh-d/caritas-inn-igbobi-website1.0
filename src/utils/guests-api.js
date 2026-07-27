import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

export const checkGuestBlacklist = async (email) => {
  const response = await axios.get(`${baseUrl}/api/guests/blacklist-check`, {
    headers: getAuthHeaders(),
    params: { email },
  });
  return response.data;
};

export const fetchGuests = async (params = {}) => {
  const response = await axios.get(`${baseUrl}/api/guests`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
};

export const fetchGuestById = async (id) => {
  const response = await axios.get(`${baseUrl}/api/guests/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const fetchGuestReservations = async (id) => {
  const response = await axios.get(`${baseUrl}/api/guests/${id}/reservations`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const createGuest = async (payload) => {
  const response = await axios.post(`${baseUrl}/api/guests`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const updateGuest = async (id, payload) => {
  const response = await axios.put(`${baseUrl}/api/guests/${id}`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const fetchGuestNotes = async (id) => {
  const response = await axios.get(`${baseUrl}/api/guests/${id}/notes`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const addGuestNote = async (id, note) => {
  const response = await axios.post(`${baseUrl}/api/guests/${id}/notes`, { note }, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const deleteGuestNote = async (id, noteId) => {
  const response = await axios.delete(`${baseUrl}/api/guests/${id}/notes/${noteId}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
