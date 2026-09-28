// Using environment variables with fallbacks
import { SERVER_BASE_URL } from "./server-config";
import { notifySessionExpired } from "./sessionExpiry";
import { BRANCH_ID } from "./branch";

const API_BASE_URL = SERVER_BASE_URL;
const API_URL = `${API_BASE_URL}/api/users`; // Added /api to match backend routes
const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY || "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const USER_KEY = "admin_user";
const BRANCH_INFO_KEY = "branch_info";

const persistSession = (data) => {
  localStorage.setItem(TOKEN_KEY, data.token);

  if (data.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  }

  if (data.branch) {
    localStorage.setItem(BRANCH_INFO_KEY, JSON.stringify(data.branch));
  }

  if (data.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
};

// Whether the person is still here, as opposed to a session that merely
// still exists. The access token lapses every 30 minutes by design; what
// must not happen is treating an actively-used session as finished because
// of it (owner, 2026-09-27: "I was only logged in for about 30 minutes so
// why did my tokens expire?").
//
// Stamped from real interaction only - a pointer or key event on the admin
// (see AdminRoot) - never from a network response, because the app refetches
// on its own (websocket reconnects, alert counts) and that would keep an
// abandoned front-desk terminal signed in indefinitely, which is the thing
// the short token was protecting against.
const LAST_ACTIVITY_KEY = "auth_last_activity";
export const IDLE_LIMIT_MS = 30 * 60 * 1000;

export const markSessionActivity = () => {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {
    // Private mode / storage disabled: fall through to "assume active", the
    // same assumption an untouched stamp already makes below.
  }
};

// No stamp at all means the session predates this tracking (or storage is
// unavailable) - treated as active, so an upgrade never signs anyone out.
export const hasBeenIdleTooLong = () => {
  const stamp = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
  if (!stamp) return false;
  return Date.now() - stamp > IDLE_LIMIT_MS;
};

export const clearStoredSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(BRANCH_INFO_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
};

export const getStoredRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

// Login and get token
export const login = async (staffRole, password) => {
  const resolvedRole = password === undefined ? null : staffRole;
  const resolvedPassword = password === undefined ? staffRole : password;

  try {
    console.log("Making request to:", `${API_URL}/login`); // Debug log
    const loginData = {
      branch_id: BRANCH_ID,
      password: resolvedPassword,
      ...(resolvedRole ? { role: resolvedRole } : {}),
    };

    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    const data = await response.json();
    persistSession(data);
    return data;
  } catch (error) {
    console.error("Login error details:", {
      message: error.message,
      url: `${API_URL}/login`,
      error: error,
    });
    throw error;
  }
};

// Individual-account login, additive alongside the shared branch/role login()
// above — see docs/STAFF-ACCOUNTS-PLAN.md and docs/TERMINAL-SCRIPTS.md in the
// backend repo. branch_id is this site's BRANCH_ID (utils/branch.js), same
// as every other login call — it's also how a "developer" account's
// session gets scoped to this branch, since developer accounts have no
// branch of their own.
export const loginStaff = async (username, password) => {
  try {
    const response = await fetch(`${API_URL}/staff-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, branch_id: BRANCH_ID }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    persistSession(data);
    return data;
  } catch (error) {
    console.error("Staff login error details:", {
      message: error.message,
      url: `${API_URL}/staff-login`,
      error: error,
    });
    throw error;
  }
};

// Silently exchanges the stored refresh token for a new access token (and a
// rotated refresh token). Used by the global axios interceptor so an expired
// access token doesn't have to mean an interrupted admin session — only a
// missing/expired/already-used refresh token falls through to a real logout.
// Returns the new access token on success, or null on failure (and clears
// the stored session in that case, since a failed refresh means the session
// really is over).
// Shared across every caller, because the server ROTATES: /refresh revokes
// the token it was handed and issues a new one (AuthService.refresh). Two
// refreshes firing with the same token therefore means the second is told
// the session is over — and the session really is dropped, for a user who
// did nothing wrong. That is easy to provoke: a page mount fires several
// requests that all 401 together, and the route gate verifies alongside
// them. One in-flight call, shared, removes the race. (The axios
// interceptor keeps its own promise too; it is harmless, and this is the
// one that covers callers outside it.)
let inFlightRefresh = null;

export const refreshAccessToken = async () => {
  if (inFlightRefresh) return inFlightRefresh;
  inFlightRefresh = performTokenRefresh().finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
};

const performTokenRefresh = async () => {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearStoredSession();
      return null;
    }

    const data = await response.json();
    persistSession(data);
    return data.token;
  } catch (error) {
    console.error("Silent token refresh failed:", error);
    return null;
  }
};

// Verify token
export const verifyToken = async () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  try {
    const verifyWith = (bearer) =>
      fetch(`${API_URL}/verify`, { headers: { Authorization: `Bearer ${bearer}` } });

    let response = await verifyWith(token);

    // A 401 here means the ACCESS token lapsed, which says nothing about
    // whether the session did - the refresh token behind it lasts seven
    // days. This used to clear the session outright, so half an hour of
    // work ended at the next page change. It now renews, exactly as the
    // axios interceptor does for every other request (this one is a bare
    // fetch, so the interceptor never sees it).
    //
    // Only for someone still working: an untouched session still lapses on
    // the same 30-minute clock, which is what the no-refresh-at-the-gate
    // rule was protecting.
    if (response.status === 401 && !hasBeenIdleTooLong()) {
      const renewed = await refreshAccessToken();
      if (renewed) response = await verifyWith(renewed);
    }

    if (!response.ok) {
      clearStoredSession();
      return null;
    }

    const data = await response.json();

    if (data?.branch) {
      localStorage.setItem(BRANCH_INFO_KEY, JSON.stringify(data.branch));
    }

    if (data?.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }

    return data?.user || null;
  } catch (error) {
    console.error("Token verification failed:", error);
    clearStoredSession();
    return null;
  }
};

// Change a branch-tier password. `target_role` is optional — omit it to
// change your own password; managers may pass target_role: "receptionist"
// to reset the receptionist's password using their own current password.
export const changePassword = async ({ current_password, new_password, target_role }) => {
  const response = await fetch(`${API_URL}/change-password`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      current_password,
      new_password,
      ...(target_role ? { target_role } : {}),
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to change password");
  }
  return data;
};

// Logout. Best-effort revokes the refresh token server-side so it can't be
// silently reused later — but never blocks the actual sign-out on that call
// succeeding, since the user's own device state is cleared regardless.
export const logout = async () => {
  const refreshToken = getStoredRefreshToken();
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (error) {
      console.error("Logout revocation call failed (session is still cleared locally):", error);
    }
  }
  clearStoredSession();
  setDevRoleOverride(null); // so a later login in the same tab starts clean
  window.location.href = "/admin";
};

// Called by the global axios interceptor (see utils/axios-interceptor.js)
// when a silent refreshAccessToken() attempt also fails — distinct from the
// user-initiated logout() above so the login page can show a clear "your
// session expired" message instead of silently landing back on a blank
// login form with no explanation, which is what happened before.
export const handleSessionExpired = () => {
  // No redirect here any more: bouncing straight to the login screen gave no
  // explanation, and the raw server wording ("Authentication failed") was
  // left sitting in whatever dialog was open. The modal this raises says
  // what happened and offers the one action that helps; it clears the
  // session itself when the user acts on it.
  notifySessionExpired();
};

// Get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
};

// Check if user is authenticated
export const isAuthenticated = async () => {
  const user = await verifyToken();
  return !!user;
};

export const getStoredAdminUser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    console.error("Failed to parse stored admin user:", error);
    return null;
  }
};

// The role actually on this account's session — unaffected by the developer
// role-simulator below. Use this (not getStoredStaffRole) specifically to
// check "is this really a developer account", e.g. to decide whether to
// show the role-simulator dropdown at all.
export const getRealStoredStaffRole = () =>
  getStoredAdminUser()?.staff_role || null;

const DEV_ROLE_OVERRIDE_KEY = "dev_role_override";

// A developer can pick a role to "view as" (AdminTopBar's dropdown) so they
// can confirm what each role's UI looks like without a separate login per
// role — sessionStorage, not localStorage, so it resets on its own the
// moment the tab closes instead of silently following into a later,
// unrelated session. Only ever has an effect while the real account is a
// developer (see getStoredStaffRole below) — setting it while logged in as
// anything else does nothing, since nothing else's role gating reads it.
export const getDevRoleOverride = () =>
  typeof window === "undefined" ? null : sessionStorage.getItem(DEV_ROLE_OVERRIDE_KEY);

export const setDevRoleOverride = (role) => {
  if (typeof window === "undefined") return;
  if (role) sessionStorage.setItem(DEV_ROLE_OVERRIDE_KEY, role);
  else sessionStorage.removeItem(DEV_ROLE_OVERRIDE_KEY);
};

// The role every gating check in the app reads (isManager, isAccountant,
// isWaitstaff, isReceptionist, visibleAdminNavItems,
// every page-level "you don't have permission" check, ...) — deliberately
// the one function all of them already called before the role-simulator
// existed, so simulating a role needed no changes anywhere else. Only a
// real developer session's own effective role is ever overridden; every
// other account always sees its own real role here.
export const getStoredStaffRole = () => {
  const realRole = getRealStoredStaffRole();
  if (realRole === "developer") {
    const override = getDevRoleOverride();
    if (override) return override;
  }
  return realRole;
};

// Only set for an individual staff_accounts login (loginStaff above) — null
// for the shared branch/role login.
export const getStoredStaffAccountId = () =>
  getStoredAdminUser()?.staff_account_id || null;

// Only set for an individual staff_accounts login — null for the shared
// branch/role login, since there's no per-person name to show there.
// Named around username, not "display name" — this is an operational
// tool, not a social platform, and there's no separate friendly-name
// concept for a staff account to have.
export const getStoredStaffUsername = () =>
  getStoredAdminUser()?.username || null;

export const getStoredBranch = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawBranch = localStorage.getItem(BRANCH_INFO_KEY);
  if (!rawBranch) {
    return null;
  }

  try {
    return JSON.parse(rawBranch);
  } catch (error) {
    console.error("Failed to parse stored branch info:", error);
    return null;
  }
};

// A developer account should pass every manager-gated UI check too — the
// backend's RolesGuard already grants it everything; without this, a
// developer login would be silently blocked from manager-only screens on
// the frontend even though the API would accept the request.
export const isManager = () => {
  const role = getStoredStaffRole();
  return role === "manager" || role === "developer";
};

// Room types, their capacity and prices - manager-only on the Rooms page and
// on the server (2026-09-28; prices were already).
export const canManageRooms = () => isManager();

// Same "developer passes every gated check too" reasoning as isManager()
// above — the backend's RolesGuard already grants developer accounts
// everything, so the frontend shouldn't block them from accountant-only
// screens either.
export const isAccountant = () => {
  const role = getStoredStaffRole();
  return role === "accountant" || role === "developer";
};

// Same developer-bypass reasoning as isManager()/isAccountant().
export const isWaitstaff = () => {
  const role = getStoredStaffRole();
  return role === "waitron" || role === "developer";
};

// The store keeper: owns menu pricing and drink stock levels for a branch.
// NO developer bypass, unlike isManager()/isAccountant()/isWaitstaff() — a
// developer already passes canEditMenu() below through isManager(), so
// adding one here would buy nothing, and it would wrongly narrow a
// developer's Reports tabs down to the store keeper's F&B set (see
// AdminReports.jsx's visibleTabs). Same reasoning as isReceptionist()/
// isWaitron() below, which gate a role DOWN rather than up.
export const isStorekeeper = () => getStoredStaffRole() === "storekeeper";

// Who may change menu ITEMS — prices, adding, deleting (2026-09-07).
// A waitron is deliberately not here: they reach the Menu page for stock
// adjustment only. They count what is on the shelf; they do not set what it
// sells for. Mirrors menu.controller.ts's @Roles on every mutating item
// route, and follows canManageRoomPrices()'s shape above.
export const canEditMenu = () => isManager() || isAccountant() || isStorekeeper();

// No developer bypass here, unlike isManager()/isAccountant()/isWaitstaff()
// above — this gates OUT a role (hiding Food/Drink Sales reports, which are
// F&B-only), so a developer session correctly stays included rather than
// excluded, matching the backend RolesGuard's own developer-sees-everything
// bypass.
export const isReceptionist = () => getStoredStaffRole() === "receptionist";

// Who may hand money BACK — folio credit refunds, deposit refunds and
// non-guest credit refunds (2026-09-10). Receptionists and managers, by the
// owner's call. Developer is included to mirror RolesGuard's developer
// bypass, so a developer session sees exactly the controls the API will
// accept. Mirrors @Roles('receptionist', 'manager') on all three refund
// endpoints.
export const canRefund = () => {
  const role = getStoredStaffRole();
  return role === "receptionist" || role === "manager" || role === "developer";
};

// No developer bypass here, unlike isManager()/isAccountant()/isWaitstaff()
// above — this gates a role DOWN to a narrower tab set (Reports), so a
// developer session correctly stays unrestricted, matching isReceptionist()'s
// same reasoning above.
export const isWaitron = () => getStoredStaffRole() === "waitron";

// Where a session lands after signing in now comes from the role's own
// sidebar - see defaultAdminPath() in components/shared/adminNavItems.js.
// The list that used to live here had to be kept in step with the sidebar by
// hand, and had fallen out of step: a storekeeper was sent to Overview, a
// page that role cannot open (2026-09-24).

