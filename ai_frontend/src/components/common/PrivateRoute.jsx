// ============================================
// FILE: src/components/common/PrivateRoute.jsx
// ============================================
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PrivateRoute = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect teachers to educator dashboard only if they're not already there
  if (user?.role === 'teacher' && location.pathname !== '/educator-dashboard') {
    return <Navigate to="/educator-dashboard" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
