import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { verifyToken } from '../utils/auth';
import AdminNavBar from '../components/shared/AdminNavBar';
import AdminTopBar from '../components/shared/AdminTopBar';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function AdminRootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const isLoginPage = location.pathname === '/admin';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await verifyToken();
        setIsAuthenticated(!!userData);
        
        // Redirect to login if not authenticated and not on login page
        if (!userData && !isLoginPage) {
          window.location.href = '/admin';
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
        if (!isLoginPage) {
          window.location.href = '/admin';
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [isLoginPage]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If on login page and already authenticated, redirect to overview
  if (isLoginPage && isAuthenticated) {
    return <Navigate to="/admin/overview" replace />;
  }

  // Don't show layout for login page
  if (isLoginPage) {
    return <Outlet />;
  }

  // Show protected layout for authenticated users
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <AdminTopBar />
      </header>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <AdminNavBar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
