import axios from "axios";
import { SERVER_BASE_URL } from "./server-config";
import { getAuthHeaders } from "./auth";

const baseUrl = SERVER_BASE_URL.endsWith("/") ? SERVER_BASE_URL.slice(0, -1) : SERVER_BASE_URL;

// Downloads a file from a signed-in endpoint (2026-09-27 audit: moved here
// from reports-api's downloadXlsx so every export shares it).
//
// Through axios rather than a link or window.location: these endpoints are
// JWT-protected, and a browser navigation can't send the Authorization
// header - which is exactly why the Reservations page's Export CSV could
// never work (it navigated to the URL and was refused as unauthenticated).
// Going through axios also means an expired session is renewed by the
// interceptor and the request retried, like every other call.
export const downloadFile = async (path, params, filename) => {
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
    // err.response.data.message would always be undefined without this - a
    // real server-side failure (expired session, permission error, 500)
    // would fall through to the caller's generic fallback message instead
    // of the actual reason.
    if (err.response?.data instanceof Blob && err.response.data.type?.includes("json")) {
      const text = await err.response.data.text();
      try {
        err.response.data = JSON.parse(text);
      } catch {
        // wasn't actually JSON - leave err.response.data as the raw Blob
      }
    }
    throw err;
  }
};
