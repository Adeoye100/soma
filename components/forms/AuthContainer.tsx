import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ShaderBackground from '../ShaderBackground';
import InspirationCard from '../InspirationCard';
import { BookOpenIcon } from '../icons';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordForm from '../ForgotPasswordForm';
import InfoModal from '../InfoModal';

type AuthMode = 'login' | 'signup' | 'forgot-password';

const AuthContainer: React.FC = () => {
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showTerms, setShowTerms] = useState(false);

  // Handle initial route state
  useEffect(() => {
    if (location.state?.showSignup) {
      setMode('signup');
    }
  }, [location.state]);

  const handleToggleForm = () => {
    setMode(prev => prev === 'login' ? 'signup' : 'login');
  };

  const handleForgotPassword = () => {
    setMode('forgot-password');
  };

  const handleBackToLogin = () => {
    setMode('login');
  };

  const renderAuthContent = () => {
    switch (mode) {
      case 'forgot-password':
        return (
          <ForgotPasswordForm onBackToLogin={handleBackToLogin} />
        );
      case 'signup':
        return (
          <SignupForm onToggleForm={handleToggleForm} />
        );
      case 'login':
      default:
        return (
          <LoginForm 
            onToggleForm={handleToggleForm}
            onForgotPassword={handleForgotPassword}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent px-3 sm:px-4 md:px-6">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">
        {/* Left side - Branding and Info */}
        <div className="hidden md:flex flex-col p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpenIcon className="h-8 sm:h-10 w-8 sm:w-10 text-primary-500 animated-book" />
            <h1 className="text-3xl sm:text-4xl font-bold animated-gradient-text">
              Soma
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg mb-6">
            Your personalized AI study partner. Generate exams from your course materials and master any subject.
          </p>
          <div className="hidden lg:block">
            <InspirationCard />
          </div>
        </div>

        {/* Right side - Auth Forms */}
        <div className="w-full">
          <ShaderBackground className="p-4 sm:p-6 md:p-8">
            {showTerms && <InfoModal onClose={() => setShowTerms(false)} />}
            {renderAuthContent()}
          </ShaderBackground>
        </div>
      </div>
    </div>
  );
};

export default AuthContainer;