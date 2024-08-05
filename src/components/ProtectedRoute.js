import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/dashboard" />;
  }

  if (adminOnly && !user.isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default ProtectedRoute;
