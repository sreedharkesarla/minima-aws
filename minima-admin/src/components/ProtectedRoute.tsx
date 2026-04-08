import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { state } = useAppContext();
  const location = useLocation();

  if (!state.user) {
    // Redirect to login page, but save the attempted url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
