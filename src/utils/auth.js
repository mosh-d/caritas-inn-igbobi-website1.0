// Using environment variables with fallbacks
import { SERVER_BASE_URL } from "./server-config";

const API_BASE_URL = SERVER_BASE_URL;
const API_URL = `${API_BASE_URL}/api/users`; // Added /api to match backend routes
const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY || "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const USER_KEY = "admin_user";
const BRANCH_INFO_KEY = "branch_info";
const BRANCH_ID = 3; // Caritas Inn Igbobi branch ID

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

const clearStoredSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(BRANCH_INFO_KEY);
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
// backend repo. branch_id is still the hardcoded BRANCH_ID for this site,
// same as every other login call — it's also how a "developer" account's
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
export const refreshAccessToken = async () => {
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
    const response = await fetch(`${API_URL}/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });

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
  clearStoredSession();
  window.location.href = "/admin?sessionExpired=true";
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
// isWaitstaff, isReceptionist, visibleAdminNavItems, getDefaultAdminRoute,
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
export const getStoredDisplayName = () =>
  getStoredAdminUser()?.display_name || null;

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

export const canManageRoomPrices = () => isManager();

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

// No developer bypass here, unlike isManager()/isAccountant()/isWaitstaff()
// above — this gates OUT a role (hiding Food/Drink Sales reports, which are
// F&B-only), so a developer session correctly stays included rather than
// excluded, matching the backend RolesGuard's own developer-sees-everything
// bypass.
export const isReceptionist = () => getStoredStaffRole() === "receptionist";

// Where a session should land right after login, or when visiting the bare
// /admin URL while already authenticated. An accountant's nav (see
// visibleAdminNavItems()) has no link back to Overview at all, so landing
// there by default is a dead end — send them straight to their own report
// list instead; same reasoning for waitron, whose primary page is Guest
// Sales (posting food/drink to a guest folio — see adminNavItems.js).
// Checked against the raw stored role, not isAccountant()/isWaitstaff()
// above: a developer session should still default to the normal Overview,
// not a role-specific landing page, since developer sees everything.
export const getDefaultAdminRoute = () => {
  const role = getStoredStaffRole();
  if (role === "accountant") return "/admin/accountant-reports";
  if (role === "waitron") return "/admin/guest-sales";
  return "/admin/overview";
};

