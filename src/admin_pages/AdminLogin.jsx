import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login } from "../utils/auth";
import Button from "../components/shared/Button";
import CustomInput from "../components/shared/CustomInput";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(password);
      // Redirect to the intended page or dashboard
      const from = location.state?.from?.pathname || "/admin/overview";
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Invalid password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">
            Caritas Inn Igbobi
          </h1>
          <h2 className="mt-2 text-3xl font-medium text-gray-600">
            Admin Panel
          </h2>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
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
                placeholder="Enter admin password"
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
