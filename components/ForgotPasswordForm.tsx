import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { FirebaseError } from 'firebase/app';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage('Please enter a valid email address.');
      setIsError(true);
      return;
    }

    setLoading(true);
    setMessage(''); // Clear previous messages
    setIsError(false);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Please check your inbox.');
      setEmail('');
    } catch (error: any) {
      setIsError(true);
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/user-not-found':
            setMessage('No user found with this email address. Please check the email.');
            break;
          case 'auth/invalid-email':
            setMessage('The email address is not valid.');
            break;
          default:
            setMessage(`An unexpected error occurred: ${error.message}`);
            break;
        }
      } else {
        setMessage('An unknown error occurred during password reset.');
      }
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
          className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
        />
        </div>
        <div>
          <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400 dark:disabled:bg-slate-600">
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
