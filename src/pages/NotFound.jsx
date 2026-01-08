import { Link } from "react-router-dom";
import SEO from "../components/seo/SEO";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <SEO
        title="Page Not Found | Caritas Inn Igbobi"
        description="The page you're looking for doesn't exist or has been moved."
        type="website"
      />

      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-3xl font-semibold text-gray-800 mb-6">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Oops! The page you're looking for doesn't exist or has been moved.
          Let's get you back to the home page.
        </p>
        <Link
          to="/"
          className="inline-block bg-green-700 hover:bg-green-800 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
