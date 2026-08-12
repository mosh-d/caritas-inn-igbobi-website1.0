import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

// Food and drink menus — two separate endpoints/tables, identical shape
// (name, price, is_active). Read access is open to any authenticated staff
// (a waiter/waitress needs to browse it to post a charge); create/update
// are manager-only, enforced server-side regardless of what the frontend
// shows.
export const fetchFoodItems = async (includeInactive = false) => {
  const response = await axios.get(`${baseUrl}/api/menu/food`, {
    headers: getAuthHeaders(),
    params: includeInactive ? { include_inactive: "true" } : undefined,
  });
  return response.data;
};

export const createFoodItem = async (payload) => {
  const response = await axios.post(`${baseUrl}/api/menu/food`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const updateFoodItem = async (id, payload) => {
  const response = await axios.patch(`${baseUrl}/api/menu/food/${id}`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const fetchDrinkItems = async (includeInactive = false) => {
  const response = await axios.get(`${baseUrl}/api/menu/drinks`, {
    headers: getAuthHeaders(),
    params: includeInactive ? { include_inactive: "true" } : undefined,
  });
  return response.data;
};

export const createDrinkItem = async (payload) => {
  const response = await axios.post(`${baseUrl}/api/menu/drinks`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const updateDrinkItem = async (id, payload) => {
  const response = await axios.patch(`${baseUrl}/api/menu/drinks/${id}`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

// Records a restock ('added') or a loss ('damaged': breakage/spillage/
// expiry) against a drink item's stock ledger — feeds the Bar Stock report
// (Reports → Bar Stock). Food isn't tracked this way.
export const recordDrinkStockMovement = async (id, payload) => {
  const response = await axios.post(`${baseUrl}/api/menu/drinks/${id}/stock`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
