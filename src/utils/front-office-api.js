import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

export const fetchCheckInList = async (date) => {
  const response = await axios.get(`${baseUrl}/api/front-office/check-in-list`, {
    headers: getAuthHeaders(),
    params: date ? { date } : {},
  });
  return response.data;
};

export const fetchCheckOutList = async (date) => {
  const response = await axios.get(`${baseUrl}/api/front-office/check-out-list`, {
    headers: getAuthHeaders(),
    params: date ? { date } : {},
  });
  return response.data;
};

export const fetchInHouse = async () => {
  const response = await axios.get(`${baseUrl}/api/front-office/in-house`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const fetchInHouseById = async (id) => {
  const response = await axios.get(`${baseUrl}/api/front-office/in-house/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
