import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ProtectedRoute: React.FC = () => {
  const { session, loading } = useAuth();

  console.log('[ProtectedRoute] loading:', loading, 'session:', !!session);

  if (loading) {
    return <div role="status" aria-live="polite">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
