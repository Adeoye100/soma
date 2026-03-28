import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { AdminAuthService } from '../../../services/admin/adminAuthService';
import Loader from '../../../components/Loader';

const AdminProtectedRoute: React.FC = () => {
  const { user, session, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        if (!user) {
          setIsAdmin(false);
          setChecking(false);
          return;
        }

        // Check if user is admin
        const adminStatus = await AdminAuthService.isAdmin(user);
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('[AdminProtectedRoute] Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  if (authLoading || checking) {
    return <Loader />;
  }

  if (!session || !user) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
