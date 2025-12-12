import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { BookOpenIcon, SparklesIcon, GoogleIcon } from './icons';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import InspirationCard from './InspirationCard';
import SupportCard from './SupportCard';
import ForgotPasswordForm from './ForgotPasswordForm';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Avatar, AvatarImage, AvatarFallback } from './Avatar';
import PasswordStrengthIndicator, { PasswordValidationState } from './PasswordStrengthIndicator';
import ShaderBackground from './ShaderBackground';
import InfoModal from './InfoModal';
import { CaptchaService } from '../services/captchaService';

const LoginScreen: React.FC = () => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('male');
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const [passwordFocused, setPasswordFocused] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationState>({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const validatePassword = (pass: string) => {
    setPasswordValidation({
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      specialChar: /[^A-Za-z0-9]/.test(pass),
    });
  };

  const validateEmail = (email: string): boolean => {
    // More robust email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  };

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Email validation
    if (!email.trim()) {
      errors.push('Email is required');
    } else if (!validateEmail(email)) {
      errors.push('Please enter a valid email address');
    }

    // Password validation
    if (!password) {
      errors.push('Password is required');
    } else if (!isLogin && password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    // Additional signup validations
    if (!isLogin) {
      if (!username.trim()) {
        errors.push('Username is required');
      } else if (username.trim().length < 2) {
        errors.push('Username must be at least 2 characters');
      }

      if (!gender) {
        errors.push('Gender selection is required');
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  useEffect(() => {
    if (location.state?.showSignup) {
      setIsLogin(false);
    }
  }, [location.state]);

  // hCaptcha verification callback
  const onCaptchaSuccess = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaVerified(true);
  }, []);

  const onCaptchaError = useCallback(() => {
    setError('Captcha verification failed. Please try again.');
    setCaptchaVerified(false);
    setCaptchaToken(null);
  }, []);

  const onCaptchaExpired = useCallback(() => {
    setCaptchaVerified(false);
    setCaptchaToken(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate form before proceeding
    const validation = validateForm();
    if (!validation.isValid) {
      setError(validation.errors[0]); // Show first error
      setLoading(false);
      return;
    }

    // Check captcha verification for both login and signup
    const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;
    if (!siteKey) {
      setError('Captcha not configured. Please contact support.');
      setLoading(false);
      return;
    }

    if (!captchaVerified || !captchaToken) {
      setError('Please complete the captcha verification to continue.');
      setLoading(false);
      return;
    }

    submitCredentials();
  };

  const submitCredentials = async () => {
    const handleAuthError = (error: any) => {
      console.error('Auth error:', error);

      if (error.message?.includes('rate limit')) {
        setError('Too many requests. Please wait a moment and try again.');
      } else if (isLogin && error.message === 'Invalid login credentials') {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (!isLogin && error.message?.includes('User already registered')) {
        setError('This email is already in use. Please try logging in instead.');
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Please check your email and click the confirmation link before signing in.');
      } else if (error.message?.includes('Password should be at least')) {
        setError('Password must be at least 8 characters long.');
      } else if (error.message?.includes('Invalid email')) {
        setError('Please enter a valid email address.');
      } else if (error.message?.includes('signup disabled')) {
        setError('Sign up is currently disabled. Please try logging in instead.');
      } else {
        setError(error.message || 'An unexpected error occurred. Please try again.');
      }
    };

    try {
      // Verify captcha before proceeding
      if (captchaToken) {
        const isCaptchaValid = await CaptchaService.verifyToken(captchaToken);
        if (!isCaptchaValid) {
          setError('Captcha verification failed. Please try again.');
          setCaptchaVerified(false);
          setCaptchaToken(null);
          setLoading(false);
          return;
        }
      }

      let response;
      if (isLogin) {
        response = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        });
      } else {
        response = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: username.trim(),
              gender,
              username: username.trim().toLowerCase().replace(/\s+/g, '_')
            },
          },
        });
      }

      if (response.error) {
        throw response.error;
      }

      if (isLogin) {
        // Successful login - navigate to app
        navigate('/app');
      } else {
        // Successful signup
        if (response.data?.user && !response.data.session) {
          // Email confirmation required
          setSignupSuccess(true);
        } else if (response.data?.session) {
          // Auto-login after signup
          navigate('/app');
        }
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) {
        // Provide a more helpful error if the Google provider is not enabled.
        if (error.message.includes('Provider not enabled')) {
          throw new Error('Google sign-in is not enabled. Please contact support.');
        }
        throw error;
      }
      // After initiating OAuth, Supabase redirects to the provider and then back to your app.
      // The redirectTo option ensures the user comes back to the auth callback for proper session handling.
    } catch (err: any) {
      setError(
        err.error_description || err.message || 'Failed to sign in with Google. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl = !isLogin
    ? `https://api.dicebear.com/8.x/${gender === 'other' ? 'micah' : gender}/svg?seed=${username || 'default'}`
    : '';


  return (

    <div className="min-h-screen flex items-center justify-center bg-transparent px-3 sm:px-4 md:px-6">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">
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
          <div className="hidden lg:block"><InspirationCard /></div>
        </div>
        <div className="w-full">
          <ShaderBackground className="p-4 sm:p-6 md:p-8">
            {showTerms && <InfoModal onClose={() => setShowTerms(false)} />}
            {showForgotPassword ? (
              <ForgotPasswordForm onBackToLogin={() => setShowForgotPassword(false)} />
            ) : (
              signupSuccess ? (
                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Check your inbox!</h2>
                  <p className="text-slate-500 dark:text-slate-400">
                    We've sent a confirmation link to <strong>{email}</strong>. Please click the link to complete your registration.
                  </p>
                </div>
              ) :

              <>
                {!isLogin && (
                  <div className="flex justify-center mb-4">
                    <Avatar>
                      <AvatarImage src={avatarUrl} alt="Avatar" />
                      <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <h2 className="text-xl sm:text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">{isLogin ? 'Welcome Back!' : 'Create Your Account'}</h2>
                <p className="text-center text-sm sm:text-base text-slate-500 dark:text-slate-400 mb-6">{isLogin ? 'Log in to continue your learning journey.' : 'Sign up to get started.'}</p>

                {error && (
                    <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-sm text-center mb-4" role="alert">
                    {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    {!isLogin && (
                        <>
                            <div>
                            <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Username</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="mt-1 block h-9 sm:h-10 w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                                placeholder="Enter your username"
                            />
                            </div>
                        <div>
                            <label htmlFor="gender" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Gender</label>
                            <select
                                id="gender"
                                name="gender"
                                required
                                value={gender}
                                onChange={e => setGender(e.target.value)}
                                className="mt-1 block h-9 sm:h-10 w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                        </>
                     )}
                    <div>
                    <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Email address</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="mt-1 block h-9 sm:h-10 w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                    />
                    </div>
                    <div>
                    <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        minLength={!isLogin ? 8 : undefined}
                        required
                        value={password}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        onChange={e => {
                          setPassword(e.target.value);
                          if (!isLogin) {
                            validatePassword(e.target.value);
                          }
                        }}
                        className="mt-1 block h-9 sm:h-10 w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                    />
                    </div>
                    {!isLogin && passwordFocused && <PasswordStrengthIndicator validation={passwordValidation} />}
                    {isLogin && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center">
                          <input
                            id="remember-me"
                            name="remember-me"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700 dark:focus:ring-offset-slate-800"
                          />
                          <label htmlFor="remember-me" className="ml-2 block text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                            Remember me pal 👋!
                          </label>
                        </div>
                        <div className="text-xs sm:text-sm">
                          <button type="button" onClick={() => setShowForgotPassword(true)} className="font-semibold text-primary-600 hover:text-primary-500">Forgot password?</button>
                        </div>
                      </div>
                    )}

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
                      <button type="submit" disabled={loading || !captchaVerified} className="w-full flex items-center justify-center gap-2 h-9 sm:h-10 rounded-md bg-primary-600 px-4 text-sm sm:text-base font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:bg-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-600">
                        {loading ? 'Processing...' : (
                          <><SparklesIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span>{isLogin ? 'Log In' : 'Sign Up'}</span></>
                        )}
                      </button>
                    </div>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-300 dark:border-slate-600" />
                  </div>
                  <div className="relative flex justify-center text-xs sm:text-sm">
                    <span className="bg-white dark:bg-slate-800 px-2 text-slate-500 dark:text-slate-400">Or continue with</span>
                  </div>
                </div>

                <div>
                  <button onClick={handleGoogleSignIn} disabled={loading} className="w-full inline-flex justify-center items-center gap-2 sm:gap-3 h-9 sm:h-10 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-slate-800 disabled:opacity-50">
                    <GoogleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Sign in with Google</span>
                  </button>
                </div>
                <p className="mt-6 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-primary-600 hover:text-primary-500 ml-1">
                    {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                </p>
                <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  By signing up, you agree to our
                  <button onClick={() => setShowTerms(true)} className="font-semibold text-primary-600 hover:text-primary-500 ml-1">
                    Terms & Support
                  </button>
                </div>
                </>
              )}
          </ShaderBackground>
        </div>
      </div>
    </div>

  );
};

export default LoginScreen;
