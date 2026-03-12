import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingScreen from './LoadingScreen';

const ProtectedRoute = ({ children, adminOnly = false, subscribedOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Subscription gate — admins always bypass
  if (subscribedOnly && !user.isAdmin && user.subscription !== 'active') {
    return <Navigate to="/purchase" replace />;
  }

  return children;
};

export default ProtectedRoute;
