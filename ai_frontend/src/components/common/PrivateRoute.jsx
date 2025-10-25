// ============================================
// FILE: src/components/common/PrivateRoute.jsx
// ============================================
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PrivateRoute = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect teachers to educator dashboard
  if (user?.role === 'teacher') {
    return <Navigate to="/educator-dashboard" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
