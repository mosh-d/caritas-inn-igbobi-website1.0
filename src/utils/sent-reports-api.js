import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/")
  ? SERVER_BASE_URL.slice(0, -1)
  : SERVER_BASE_URL;

// Snapshots a report tab's current live data and sends it to the
// accountant. report_type matches the Reports page's tab keys
// (dashboard/manifest/analysis/pms/accommodation); label is whatever date
// or date-range is shown on the tab; shift is the report-page-level shift
// selector's current value; snapshot_data is the tab's already-loaded data
// object, unmodified.
export const sendReportToAccountant = async ({ report_type, label, shift, snapshot_data }) => {
  const response = await axios.post(
    `${baseUrl}/api/sent-reports`,
    { report_type, label, shift, snapshot_data },
    { headers: getAuthHeaders() },
  );
  return response.data;
};

// Accountant-only — grouped by the calendar day each report was sent on.
export const fetchSentReportsGrouped = async () => {
  const response = await axios.get(`${baseUrl}/api/sent-reports`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const fetchSentReport = async (id) => {
  const response = await axios.get(`${baseUrl}/api/sent-reports/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

const downloadXlsx = async (path, filename) => {
  const response = await axios.get(`${baseUrl}${path}`, {
    headers: getAuthHeaders(),
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

export const downloadSentReportExport = (id, reportType, label) =>
  downloadXlsx(`/api/sent-reports/${id}/export`, `${reportType}_${label.replace(/[^a-z0-9]/gi, "_")}.xlsx`);
