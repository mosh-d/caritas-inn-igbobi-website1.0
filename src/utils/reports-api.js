import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";
import { downloadFile } from "./download";

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

// Shared with every other export - see utils/download.js.
const downloadXlsx = downloadFile;

export const downloadReportsExport = (from, to) =>
  downloadXlsx("/api/reports/export", { from, to }, `report_${from}_to_${to}.xlsx`);

export const downloadManifestExport = (date) =>
  // Route key stays "manifest"; the file is named for what staff call this
  // report — the arrivals/departures sheet is the Accommodation report.
  downloadXlsx("/api/reports/manifest/export", { date }, `accommodation_report_${date}.xlsx`);

export const downloadAnalysisExport = (from, to) =>
  downloadXlsx("/api/reports/analysis/export", { from, to }, `analysis_${from}_to_${to}.xlsx`);

export const downloadPmsReportExport = (date, variant) =>
  downloadXlsx("/api/reports/pms/export", { date, variant }, `pms_report_${variant}_${date}.xlsx`);

export const downloadAccommodationReportExport = (date, shift) =>
  downloadXlsx("/api/reports/accommodation/export", { date, shift }, `manifest_${date}.xlsx`);

// Parked with the Email Report button (2026-09-17) — the backend endpoint
// is commented out alongside it in reports.controller.ts.
// export const emailReportsDashboard = async (from, to, email) => {
//   const response = await axios.post(
//     `${baseUrl}/api/reports/email`,
//     { from, to, email },
//     { headers: getAuthHeaders() },
//   );
//   return response.data;
// };

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
