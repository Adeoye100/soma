import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  session: Session | null;
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ session, children }) => {
  const location = useLocation();

  if (!session) {
    // Save the current path to redirect back after login
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return children;
};

export default ProtectedRoute;
