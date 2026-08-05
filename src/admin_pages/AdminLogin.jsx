import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { loginStaff, getDefaultAdminRoute } from "../utils/auth";
import Button from "../components/shared/Button";
import CustomInput from "../components/shared/CustomInput";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Set by the global axios interceptor (utils/axios-interceptor.js) when a
  // request from an already-open admin page comes back 401 — tells staff
  // clearly why they landed back here instead of leaving them to wonder why
  // the page just silently stopped working.
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessionExpired, setSessionExpired] = useState(false);
  useEffect(() => {
    if (searchParams.get("sessionExpired") === "true") {
      setSessionExpired(true);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }

    setLoading(true);

    try {
      await loginStaff(username.trim(), password);
      // Redirect to the intended page, or this role's default landing page
      const from = location.state?.from?.pathname || getDefaultAdminRoute();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Invalid password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">
            Caritas Inn Igbobi
          </h1>
          <h2 className="mt-2 text-3xl font-medium text-gray-600">
            Admin Panel
          </h2>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          {sessionExpired && (
            <div className="mb-4 p-3 bg-orange-50 text-orange-700 text-sm rounded-md border border-orange-200">
              Your session has expired. Please log in again.
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="staff-username"
                className="block text-2xl font-medium text-gray-700 mb-1"
              >
                Username
              </label>
              <CustomInput
                id="staff-username"
                name="staff-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-2xl font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <CustomInput
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                className="w-full flex justify-center py-2 px-4 border border-transparent shadow-sm text-2xl font-medium text-white bg-[color:var(--emphasis)] hover:bg-[color:var(--emphasis)]/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--emphasis)] disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
