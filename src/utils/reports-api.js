import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

export const fetchReportsDashboard = async (from, to) => {
  const response = await axios.get(`${baseUrl}/api/reports/dashboard`, {
    headers: getAuthHeaders(),
    params: { from, to },
  });
  return response.data;
};

// Downloads the formatted .xlsx directly via a Blob rather than a plain URL
// navigation — these endpoints are JWT-protected (financial data), so they
// need the auth header, which a bare <a href> navigation can't send.
const downloadXlsx = async (path, params, filename) => {
  try {
    const response = await axios.get(`${baseUrl}${path}`, {
      headers: getAuthHeaders(),
      params,
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    // A blob-typed error response's .data is a Blob, not parsed JSON, so
    // err.response.data.message is always undefined without this — a real
    // server-side failure (expired session, permission error, 500) always
    // fell through to each report tab's generic fallback message instead
    // of the actual reason.
    if (err.response?.data instanceof Blob && err.response.data.type?.includes("json")) {
      const text = await err.response.data.text();
      try {
        err.response.data = JSON.parse(text);
      } catch {
        // wasn't actually JSON — leave err.response.data as the raw Blob
      }
    }
    throw err;
  }
};

export const downloadReportsExport = (from, to) =>
  downloadXlsx("/api/reports/export", { from, to }, `report_${from}_to_${to}.xlsx`);

export const downloadManifestExport = (date) =>
  downloadXlsx("/api/reports/manifest/export", { date }, `manifest_${date}.xlsx`);

export const downloadAnalysisExport = (from, to) =>
  downloadXlsx("/api/reports/analysis/export", { from, to }, `analysis_${from}_to_${to}.xlsx`);

export const downloadPmsReportExport = (date, variant) =>
  downloadXlsx("/api/reports/pms/export", { date, variant }, `pms_report_${variant}_${date}.xlsx`);

export const downloadAccommodationReportExport = (date, shift) =>
  downloadXlsx("/api/reports/accommodation/export", { date, shift }, `accommodation_report_${date}.xlsx`);

export const emailReportsDashboard = async (from, to, email) => {
  const response = await axios.post(
    `${baseUrl}/api/reports/email`,
    { from, to, email },
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const fetchManifest = async (date) => {
  const response = await axios.get(`${baseUrl}/api/reports/manifest`, {
    headers: getAuthHeaders(),
    params: { date },
  });
  return response.data;
};

export const fetchPaymentsAnalysis = async (from, to) => {
  const response = await axios.get(`${baseUrl}/api/reports/analysis`, {
    headers: getAuthHeaders(),
    params: { from, to },
  });
  return response.data;
};

export const fetchPmsReport = async (date, variant) => {
  const response = await axios.get(`${baseUrl}/api/reports/pms`, {
    headers: getAuthHeaders(),
    params: { date, variant },
  });
  return response.data;
};

export const fetchAccommodationReport = async (date) => {
  const response = await axios.get(`${baseUrl}/api/reports/accommodation`, {
    headers: getAuthHeaders(),
    params: { date },
  });
  return response.data;
};

export const fetchFoodSalesReport = async (date) => {
  const response = await axios.get(`${baseUrl}/api/reports/food-sales`, {
    headers: getAuthHeaders(),
    params: { date },
  });
  return response.data;
};

export const downloadFoodSalesReportExport = (date, shift) =>
  downloadXlsx("/api/reports/food-sales/export", { date, shift }, `food_sales_report_${date}.xlsx`);

export const fetchDrinkSalesReport = async (date) => {
  const response = await axios.get(`${baseUrl}/api/reports/drink-sales`, {
    headers: getAuthHeaders(),
    params: { date },
  });
  return response.data;
};

export const downloadDrinkSalesReportExport = (date, shift) =>
  downloadXlsx("/api/reports/drink-sales/export", { date, shift }, `drink_sales_report_${date}.xlsx`);

export const fetchBarStockReport = async (date) => {
  const response = await axios.get(`${baseUrl}/api/reports/bar-stock`, {
    headers: getAuthHeaders(),
    params: { date },
  });
  return response.data;
};

export const downloadBarStockReportExport = (date, shift) =>
  downloadXlsx("/api/reports/bar-stock/export", { date, shift }, `bar_stock_report_${date}.xlsx`);
