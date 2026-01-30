import React, { useState, useCallback } from 'react';
import { supabase } from '@/services/supabase';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { CaptchaService } from '@/services/captchaService';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState<boolean>(false);

  // hCaptcha verification callbacks
  const onCaptchaSuccess = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaVerified(true);
  }, []);

  const onCaptchaError = useCallback(() => {
    setIsError(true);
    setMessage('Captcha verification failed. Please try again.');
    setCaptchaVerified(false);
    setCaptchaToken(null);
  }, []);

  const onCaptchaExpired = useCallback(() => {
    setCaptchaVerified(false);
    setCaptchaToken(null);
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage('Please enter a valid email address.');
      setIsError(true);
      return;
    }

    // Check captcha verification
    const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;
    if (!siteKey) {
      setIsError(true);
      setMessage('Captcha not configured. Please contact support.');
      return;
    }

    if (!captchaVerified || !captchaToken) {
      setIsError(true);
      setMessage('Please complete the captcha verification to continue.');
      return;
    }

    setLoading(true);
    setMessage(''); // Clear previous messages
    setIsError(false);

    try {
      // Verify captcha before proceeding
      const isCaptchaValid = await CaptchaService.verifyToken(captchaToken);
      if (!isCaptchaValid) {
        setIsError(true);
        setMessage('Captcha verification failed. Please try again.');
        setCaptchaVerified(false);
        setCaptchaToken(null);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/app`,
      });
      if (error) throw error;
      setMessage('Password reset email sent! Please check your inbox.');
      setEmail('');
      // Reset captcha state
      setCaptchaVerified(false);
      setCaptchaToken(null);
    } catch (error: any) {
      setIsError(true);
      setMessage(error.message || 'An unknown error occurred during password reset.');
      console.error('Password reset error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">Forgot Password?</h2>
      <p className="text-center text-slate-500 dark:text-slate-400 mb-6">
        Enter your email to receive a reset link.
      </p>

      {message && (
        <div className={`px-4 py-2 rounded-lg text-sm text-center mb-4 ${isError ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}`} role="alert">
          {message}
        </div>
      )}

      <form onSubmit={handlePasswordReset} className="space-y-6">
        <div>
          <label htmlFor="reset-email" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Email address</label>
          <input
            id="reset-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="mt-1 block h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
          />
        </div>
        {/* hCaptcha Component */}
        {import.meta.env.VITE_HCAPTCHA_SITE_KEY && (
          <div className="flex justify-center">
            <HCaptcha
              sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
              onVerify={onCaptchaSuccess}
              onError={onCaptchaError}
              onExpire={onCaptchaExpired}
            />
          </div>
        )}

        <div>
          <button type="submit" disabled={loading || !captchaVerified} className="w-full flex justify-center items-center h-10 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400 dark:disabled:bg-slate-600">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <button onClick={onBackToLogin} className="font-semibold text-sm text-primary-600 hover:text-primary-500">
          &larr; Back to Login
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
