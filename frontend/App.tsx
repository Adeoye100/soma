import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthContainer from './components/forms/AuthContainer';
import MainApp from './components/MainApp';
import { supabase } from './services/supabase';
import Loader from './components/Loader';
import { Session, User } from '@supabase/supabase-js';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './components/LandingPage';
import ResetPasswordForm from './components/ResetPasswordForm';
import AuthCallback from './pages/auth/callback';
import { AuthProvider } from './context/AuthContext';
import { useSessionHeartbeat } from './src/hooks/useSessionHeartbeat';

// Admin routes and components
import AdminProtectedRoute from './src/views/admin/AdminProtectedRoute';
<<<<<<< HEAD
import { AdminDashboardApp } from './src/pages/AdminDashboardApp';
=======
import AdminDashboard from './src/views/admin/pages/AdminDashboard';
import SystemHealth from './src/views/admin/pages/SystemHealth';
import Monitoring from './src/views/admin/pages/Monitoring';
import Automation from './src/views/admin/pages/Automation';
import Queues from './src/views/admin/pages/Queues';
import Configuration from './src/views/admin/pages/Configuration';
import Alerts from './src/views/admin/pages/Alerts';
import SystemInfo from './src/views/admin/pages/SystemInfo';
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba

// Check if we're in development mode
const isDev = import.meta.env.DEV;
// Removed SignUpScreen import - now handled by LoginScreen component

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useSessionHeartbeat();

  // Initialize session with error handling
  const initializeSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        // Handle specific error types
        if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('CORS')) {
          console.warn('Network error during auth initialization, attempting to recover...');
          setAuthError('network');
        } else {
          console.error('Auth error:', error.message);
          setAuthError(error.message);
        }
      } else {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setAuthError(null);
      }
    } catch (err: any) {
      // Network or CORS errors will throw instead of returning error
      console.warn('Network error during auth initialization:', err.message);
      setAuthError('network');
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  useEffect(() => {
    // Initialize session
    initializeSession();

    // Set up auth state change listener with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle auth events even if there was a network error
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session);
        setUser(session?.user ?? null);
        setAuthError(null);
        setIsPasswordRecovery(false);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
      } else if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'USER_UPDATED') {
        setUser(session?.user ?? null);
      }
      
      // Always update loading state when we get any auth event
      setLoadingSession(false);
    });

    return () => subscription.unsubscribe();
  }, [initializeSession]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleAvatarUpdate = useCallback((newAvatarUrl: string) => {
    setUser(prevUser => (prevUser ? { ...prevUser, user_metadata: { ...prevUser.user_metadata, avatar_url: newAvatarUrl } } : prevUser));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  if (loadingSession) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <Loader text="Loading session..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans bg-slate-900 text-slate-50">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/login"
              element={!session ? <AuthContainer /> : isPasswordRecovery ? <ResetPasswordForm /> : <Navigate to="/dashboard" />}
            />
            <Route
              path="/signup"
              element={!session ? <Navigate to="/login" state={{ showSignup: true }} /> : <Navigate to="/dashboard" />}
            />
            <Route
              path="/reset-password"
              element={isPasswordRecovery ? <ResetPasswordForm /> : <Navigate to="/login" />}
            />
            <Route
              path="/auth/callback"
              element={<AuthCallback />}
            />
            <Route element={<ProtectedRoute />}>
              <Route
                path="/dashboard"
                element={
                  <MainApp
                    user={user!}
                    onLogout={handleLogout}
                    theme={theme}
                    toggleTheme={toggleTheme}
                    onAvatarUpdate={handleAvatarUpdate}
                  />
                }
              />
              <Route path="/app" element={<Navigate to="/dashboard" replace />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<AdminProtectedRoute />}>
<<<<<<< HEAD
              <Route path="/admin" element={<AdminDashboardApp />} />
              <Route path="/admin/*" element={<AdminDashboardApp />} />
=======
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/system-health" element={<SystemHealth />} />
              <Route path="/admin/monitoring" element={<Monitoring />} />
              <Route path="/admin/automation" element={<Automation />} />
              <Route path="/admin/queues" element={<Queues />} />
              <Route path="/admin/configuration" element={<Configuration />} />
              <Route path="/admin/alerts" element={<Alerts />} />
              <Route path="/admin/system-info" element={<SystemInfo />} />
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
};

export default App;
