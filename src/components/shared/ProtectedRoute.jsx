import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyToken } from '../../utils/auth';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const userData = await verifyToken();
      if (!userData) {
        navigate('/admin', { 
          replace: true,
          state: { from: location.pathname }
        });
      } else {
        setIsAuthenticated(true);
      }
      setLoading(false);
    };
    
    checkAuth();
  }, [navigate, location]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return isAuthenticated ? children : null;
};

export default ProtectedRoute;
