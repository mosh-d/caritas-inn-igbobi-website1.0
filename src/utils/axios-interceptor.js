import axios from "axios";
import { handleSessionExpired, refreshAccessToken } from "./auth";

// Registering this once here applies globally — every admin_pages/utils
// file does `import axios from "axios"` and gets the same underlying
// singleton instance, so there's no need to touch each call site
// individually. Side-effect-only module, imported once in main.jsx.
//
// On a 401 from an already-open admin page, this first tries a silent
// refresh (POST /api/users/refresh using the stored refresh token) and
// transparently retries the failed request — only falling back to a full
// "your session expired" redirect if that refresh itself fails (refresh
// token missing, expired, or already used). Without this, a merely-expired
// 30-minute access token would force a re-login every half hour even though
// the underlying session (backed by the 7-day refresh token) is still good.
let redirecting = false;
let refreshPromise = null;

const AUTH_ENDPOINTS = ["/api/users/login", "/api/users/refresh", "/api/users/logout"];

function isAuthEndpoint(url = "") {
  return AUTH_ENDPOINTS.some((path) => url.includes(path));
}

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isUnauthorized = error.response?.status === 401;
    const onProtectedAdminPage =
      window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin";

    if (!isUnauthorized || !onProtectedAdminPage || !originalRequest || isAuthEndpoint(originalRequest.url || "")) {
      return Promise.reject(error);
    }

    // Never attempt more than one silent refresh per original request, so a
    // request that still 401s right after a successful refresh (e.g. a
    // stale token cached elsewhere) falls through to the redirect instead of
    // looping.
    if (originalRequest._retriedAfterRefresh) {
      if (!redirecting) {
        redirecting = true;
        handleSessionExpired();
      }
      return Promise.reject(error);
    }
    originalRequest._retriedAfterRefresh = true;

    // Several requests can 401 around the same moment the access token
    // expires — share one in-flight refresh across all of them instead of
    // firing a separate /refresh call (and rotation) per request.
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;

    if (!newToken) {
      if (!redirecting) {
        redirecting = true;
        handleSessionExpired();
      }
      return Promise.reject(error);
    }

    originalRequest.headers = {
      ...originalRequest.headers,
      Authorization: `Bearer ${newToken}`,
    };
    return axios(originalRequest);
  },
);
