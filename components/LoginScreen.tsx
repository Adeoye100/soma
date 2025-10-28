import React, { useState, useRef } from 'react';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, setPersistence, browserLocalPersistence, browserSessionPersistence, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { BookOpenIcon, SparklesIcon, GoogleIcon } from './icons';
import InspirationCard from './InspirationCard';
import ForgotPasswordForm from './ForgotPasswordForm';
import StyledButton from './StyledButton';
import PasswordStrengthIndicator, { PasswordValidationState } from './PasswordStrengthIndicator';

const LoginScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationState>({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });
  const cardRef = useRef<HTMLDivElement>(null);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cardRef.current.style.setProperty('--x', `${x}px`);
      cardRef.current.style.setProperty('--y', `${y}px`);
    }
  };

  const validatePassword = (pass: string) => {
    setPasswordValidation({
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      specialChar: /[^A-Za-z0-9]/.test(pass),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
        if (isLogin) {
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (userCredential.user) {
                await updateProfile(userCredential.user, {
                    displayName: username
                });
            }
        }
    } catch (err: any) {
        let friendlyMessage = "An unexpected error occurred. Please try again.";
        switch (err.code) {
            case 'auth/invalid-email':
                friendlyMessage = "Please enter a valid email address.";
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                friendlyMessage = "Incorrect email or password. Please try again.";
                break;
            case 'auth/email-already-in-use':
                friendlyMessage = "An account with this email address already exists. Please log in.";
                break;
            case 'auth/weak-password':
                friendlyMessage = "Your password is too weak. It must be at least 6 characters long.";
                break;
        }
        setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the rest
    } catch (err: any) {
      // Handle common errors like popup-closed-by-user
      if (err.code !== 'auth/popup-closed-by-user') {
        setError("Failed to sign in with Google. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 px-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
        <div className="hidden md:block p-8">
          <div className="flex items-center gap-3 mb-4">
              <BookOpenIcon className="h-10 w-10 text-primary-500 animated-book" />
              <h1 className="text-4xl font-bold animated-gradient-text">
                Soma
              </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-lg mb-6">Your personalized AI study partner. Generate exams from your course materials and master any subject.</p>
          <div className="hidden lg:block"><InspirationCard /></div>
        </div>
        <div className="interactive-card" ref={cardRef} onMouseMove={handleMouseMove}>
            <div className="interactive-card-bg"></div>
            <div className="interactive-card-content">
              {showForgotPassword ? (
                <ForgotPasswordForm onBackToLogin={() => setShowForgotPassword(false)} />
              ) : (
                <>
                <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">{isLogin ? 'Welcome Back!' : 'Create Your Account'}</h2>
                <p className="text-center text-slate-500 dark:text-slate-400 mb-6">{isLogin ? 'Log in to continue your learning journey.' : 'Sign up to get started.'}</p>

                {error && (
                    <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-sm text-center mb-4" role="alert">
                    {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLogin && (
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Username</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                            />
                        </div>
                    )}
                    <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Email address</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                    />
                    </div>
                    <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-600 dark:text-slate-400">Password</label>
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
                        className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                    />
                    </div>
                    {!isLogin && passwordFocused && <PasswordStrengthIndicator validation={passwordValidation} />}
                    {isLogin && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            id="remember-me"
                            name="remember-me"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700 dark:focus:ring-offset-slate-800"
                          />
                          <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                            Remember me
                          </label>
                        </div>
                        <div className="text-sm">
                          <button type="button" onClick={() => setShowForgotPassword(true)} className="font-semibold text-primary-600 hover:text-primary-500">Forgot password?</button>
                        </div>
                      </div>
                    )}
                    <div>
                    <StyledButton type="submit" disabled={loading || (!isLogin && !isPasswordValid)} loading={loading}>
                        <SparklesIcon className="h-5 w-5" />
                        <span>{isLogin ? 'Log In' : 'Sign Up'}</span>
                    </StyledButton>
                    </div>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-300 dark:border-slate-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white dark:bg-slate-800 px-2 text-slate-500 dark:text-slate-400">Or continue with</span>
                  </div>
                </div>

                <div>
                  <button onClick={handleGoogleSignIn} disabled={loading} className="w-full inline-flex justify-center items-center gap-3 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-slate-800 disabled:opacity-50">
                    <GoogleIcon className="h-5 w-5" />
                    <span>Sign in with Google</span>
                  </button>
                </div>

                <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-primary-600 hover:text-primary-500 ml-1">
                    {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                </p>
                </>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
