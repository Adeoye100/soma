import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AdminAuthService } from '@/services/admin/adminAuthService';
import Loader from './Loader';

const AdminProtectedRoute: React.FC = () => {
  const { session, user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }

      try {
        const adminStatus = await AdminAuthService.isAdmin(user);
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('[AdminProtectedRoute] Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setAdminLoading(false);
      }
    };

    if (!loading) {
      checkAdminAccess();
    }
  }, [user, loading]);

  if (loading || adminLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <Loader text="Verifying admin access..." />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-slate-400 mb-8">You do not have admin access. Please contact an administrator.</p>
          <a href="/dashboard" className="text-blue-400 hover:text-blue-300 underline">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
