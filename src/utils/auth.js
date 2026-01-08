// Using environment variables with fallbacks
const API_BASE_URL = "https://five-clover-shared-backend.onrender.com";
const API_URL = `${API_BASE_URL}/api/users`; // Added /api to match backend routes
const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY || "auth_token";
const BRANCH_ID = 3; // Caritas Inn Igbobi branch ID

// Login and get token
export const login = async (password) => {
  try {
    console.log("Making request to:", `${API_URL}/login`); // Debug log
    const loginData = {
      branch_id: BRANCH_ID,
      password: password,
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
    // data.token contains your JWT
    // data.branch contains branch info
    localStorage.setItem(TOKEN_KEY, data.token);
    if (data.branch) {
      localStorage.setItem("branch_info", JSON.stringify(data.branch));
    }
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

// Verify token
export const verifyToken = async () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  try {
    const response = await fetch(`${API_URL}/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      logout();
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Token verification failed:", error);
    logout();
    return null;
  }
};

// Logout
export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = "/admin";
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
