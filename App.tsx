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
import AuthCallback from './components/AuthCallback';
// Removed SignUpScreen import - now handled by LoginScreen component

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return savedTheme || (prefersDark ? 'dark' : 'light');
  });
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoadingSession(false);

      // Handle authentication events and redirect to dashboard
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // User has successfully signed in (including OAuth), redirect to app
        // The navigation will be handled by the component re-render with the new session
        setIsPasswordRecovery(false);
      } else if (event === 'PASSWORD_RECOVERY') {
        // When user clicks password reset link, show reset password form
        setIsPasswordRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleAvatarUpdate = useCallback((newAvatarUrl: string) => {
    setUser(prevUser => (prevUser ? { ...prevUser, user_metadata: { ...prevUser.user_metadata, avatar_url: newAvatarUrl } } : prevUser));
  }, []);

  if (loadingSession) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
        <Loader text="Loading session..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-50">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/login"
            element={!session ? <AuthContainer /> : isPasswordRecovery ? <ResetPasswordForm /> : <Navigate to="/app" />}
          />
          <Route
            path="/signup"
            element={!session ? <Navigate to="/login" state={{ showSignup: true }} /> : <Navigate to="/app" />}
          />
          <Route
            path="/reset-password"
            element={isPasswordRecovery ? <ResetPasswordForm /> : <Navigate to="/login" />}
          />
          <Route
            path="/auth/callback"
            element={<AuthCallback />}
          />
          <Route
            path="/app"
            element={
              <ProtectedRoute session={session}>
                <MainApp user={user!} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} onAvatarUpdate={handleAvatarUpdate} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;

