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
};

export const downloadReportsExport = (from, to) =>
  downloadXlsx("/api/reports/export", { from, to }, `report_${from}_to_${to}.xlsx`);

export const downloadManifestExport = (from, to) =>
  downloadXlsx("/api/reports/manifest/export", { from, to }, `manifest_${from}_to_${to}.xlsx`);

export const downloadAnalysisExport = (from, to) =>
  downloadXlsx("/api/reports/analysis/export", { from, to }, `analysis_${from}_to_${to}.xlsx`);

export const downloadPmsReportExport = (date, variant) =>
  downloadXlsx("/api/reports/pms/export", { date, variant }, `pms_report_${variant}_${date}.xlsx`);

export const emailReportsDashboard = async (from, to, email) => {
  const response = await axios.post(
    `${baseUrl}/api/reports/email`,
    { from, to, email },
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const fetchManifest = async (from, to) => {
  const response = await axios.get(`${baseUrl}/api/reports/manifest`, {
    headers: getAuthHeaders(),
    params: { from, to },
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
