import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import EmailField from './EmailField';
import PasswordField from './PasswordField';
import { validateEmail, validatePassword, formatAuthError } from '../../utils/authValidation';
import { SparklesIcon, GoogleIcon } from '../icons';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { CaptchaService } from '../../services/captchaService';

interface LoginFormProps {
  onToggleForm: () => void;
  onForgotPassword: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onToggleForm, onForgotPassword }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear field-specific error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleInputBlur = (field: string) => () => {
    let error = '';
    
    if (field === 'email') {
      const validation = validateEmail(formData.email);
      error = validation.isValid ? '' : validation.error!;
    } else if (field === 'password') {
      const validation = validatePassword(formData.password, false);
      error = validation.isValid ? '' : validation.error!;
    }
    
    setErrors(prev => ({ ...prev, [field]: error || undefined }));
  };

  // hCaptcha verification callbacks
  const onCaptchaSuccess = (token: string) => {
    setCaptchaToken(token);
    setCaptchaVerified(true);
    // Clear general error if it was captcha-related
    if (errors.general?.includes('captcha')) {
      setErrors(prev => ({ ...prev, general: undefined }));
    }
  };

  const onCaptchaError = () => {
    setErrors(prev => ({ ...prev, general: 'Captcha verification failed. Please try again.' }));
    setCaptchaVerified(false);
    setCaptchaToken(null);
  };

  const onCaptchaExpired = () => {
    setCaptchaVerified(false);
    setCaptchaToken(null);
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }
    
    const passwordValidation = validatePassword(formData.password, false);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }
    
    const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;
    if (!siteKey) {
      newErrors.general = 'Captcha not configured. Please contact support.';
    } else if (!captchaVerified || !captchaToken) {
      newErrors.general = 'Please complete the captcha verification to continue.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Verify captcha before proceeding
      if (captchaToken) {
        const isCaptchaValid = await CaptchaService.verifyToken(captchaToken);
        if (!isCaptchaValid) {
          setErrors(prev => ({ ...prev, general: 'Captcha verification failed. Please try again.' }));
          setCaptchaVerified(false);
          setCaptchaToken(null);
          return;
        }
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      if (error) {
        throw error;
      }

      // Successful login - navigate to app
      navigate('/app');
    } catch (err: any) {
      setErrors({ general: formatAuthError(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrors({});
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        throw error;
      }
    } catch (err: any) {
      setErrors({ general: formatAuthError(err) });
    } finally {
      setLoading(false);
    }
  };

  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Welcome Back!
        </h2>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
          Log in to continue your learning journey.
        </p>
      </div>

      {errors.general && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-sm text-center mb-4" role="alert">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <EmailField
          id="login-email"
          name="email"
          value={formData.email}
          onChange={handleInputChange('email')}
          onBlur={handleInputBlur('email')}
          disabled={loading}
          error={errors.email}
          autoComplete="email"
        />

        <PasswordField
          id="login-password"
          name="password"
          value={formData.password}
          onChange={handleInputChange('password')}
          onBlur={handleInputBlur('password')}
          disabled={loading}
          error={errors.password}
          autoComplete="current-password"
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
              disabled={loading}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700 dark:focus:ring-offset-slate-800 disabled:opacity-50"
            />
            <label htmlFor="remember-me" className="ml-2 block text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              Remember me! 👋
            </label>
          </div>
          <button 
            type="button" 
            onClick={onForgotPassword}
            className="text-xs sm:text-sm font-semibold text-primary-600 hover:text-primary-500 disabled:opacity-50"
            disabled={loading}
          >
            Forgot password?
          </button>
        </div>

        {/* hCaptcha Component */}
        {siteKey && (
          <div className="flex justify-center">
            <HCaptcha
              sitekey={siteKey}
              onVerify={onCaptchaSuccess}
              onError={onCaptchaError}
              onExpire={onCaptchaExpired}
            />
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || !captchaVerified}
          className="w-full flex items-center justify-center gap-2 h-9 sm:h-10 rounded-md bg-primary-600 px-4 text-sm sm:text-base font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:bg-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-600 transition-colors"
        >
          {loading ? (
            'Processing...'
          ) : (
            <>
              <SparklesIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Log In</span>
            </>
          )}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-300 dark:border-slate-600" />
        </div>
        <div className="relative flex justify-center text-xs sm:text-sm">
          <span className="bg-white dark:bg-slate-800 px-2 text-slate-500 dark:text-slate-400">Or continue with</span>
        </div>
      </div>

      <button 
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full inline-flex justify-center items-center gap-2 sm:gap-3 h-9 sm:h-10 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-slate-800 disabled:opacity-50 transition-colors"
      >
        <GoogleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        <span>Sign in with Google</span>
      </button>

      <p className="mt-6 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        Don't have an account?{' '}
        <button 
          onClick={onToggleForm}
          className="font-semibold text-primary-600 hover:text-primary-500 disabled:opacity-50 transition-colors"
          disabled={loading}
        >
          Sign up
        </button>
      </p>
    </div>
  );
};

export default LoginForm;