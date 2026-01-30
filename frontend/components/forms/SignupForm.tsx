import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import EmailField from './EmailField';
import PasswordField from './PasswordField';
import { Avatar, AvatarImage, AvatarFallback } from '../Avatar';
import PasswordStrengthIndicator, { PasswordValidationState } from '../PasswordStrengthIndicator';
import { validateEmail, validatePassword, validateUsername, validateGender, calculatePasswordStrength, formatAuthError } from '../../utils/authValidation';
import { SparklesIcon } from '../icons';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { CaptchaService } from '../../services/captchaService';

interface SignupFormProps {
  onToggleForm: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onToggleForm }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: 'male' as 'male' | 'female' | 'other'
  });
  const [errors, setErrors] = useState<{ 
    username?: string; 
    email?: string; 
    password?: string; 
    confirmPassword?: string; 
    gender?: string; 
    general?: string 
  }>({});
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const passwordValidation = useMemo<PasswordValidationState>(() => {
    return calculatePasswordStrength(formData.password);
  }, [formData.password]);

  const isPasswordValid = useMemo(() => {
    return Object.values(passwordValidation).every(Boolean);
  }, [passwordValidation]);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear field-specific error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleInputBlur = (field: string) => () => {
    let error = '';
    
    if (field === 'username') {
      const validation = validateUsername(formData.username);
      error = validation.isValid ? '' : validation.error!;
    } else if (field === 'email') {
      const validation = validateEmail(formData.email);
      error = validation.isValid ? '' : validation.error!;
    } else if (field === 'password') {
      const validation = validatePassword(formData.password, true);
      error = validation.isValid ? '' : validation.error!;
    } else if (field === 'confirmPassword') {
      if (!formData.confirmPassword) {
        error = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        error = 'Passwords do not match';
      }
    } else if (field === 'gender') {
      const validation = validateGender(formData.gender);
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
    
    const usernameValidation = validateUsername(formData.username);
    if (!usernameValidation.isValid) {
      newErrors.username = usernameValidation.error;
    }
    
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }
    
    const passwordValidation = validatePassword(formData.password, true);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    const genderValidation = validateGender(formData.gender);
    if (!genderValidation.isValid) {
      newErrors.gender = genderValidation.error;
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

      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.username.trim(),
            gender: formData.gender,
            username: formData.username.trim().toLowerCase().replace(/\s+/g, '_')
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.user && !data.session) {
        // Email confirmation required
        setSignupSuccess(true);
      } else if (data?.session) {
        // Auto-login after signup
        navigate('/app');
      }
    } catch (err: any) {
      setErrors({ general: formatAuthError(err) });
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl = `https://api.dicebear.com/8.x/${formData.gender === 'other' ? 'micah' : formData.gender}/svg?seed=${formData.username || 'default'}`;

  if (signupSuccess) {
    return (
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Check your inbox!
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          We've sent a confirmation link to <strong>{formData.email}</strong>. Please click the link to complete your registration.
        </p>
      </div>
    );
  }

  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Create Your Account
        </h2>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
          Sign up to get started.
        </p>
      </div>

      <div className="flex justify-center mb-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatarUrl} alt="Avatar Preview" />
          <AvatarFallback>{formData.username.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </div>

      {errors.general && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-sm text-center mb-4" role="alert">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div>
          <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={formData.username}
            onChange={handleInputChange('username')}
            onBlur={handleInputBlur('username')}
            disabled={loading}
            className={`mt-1 block h-9 sm:h-10 w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed ${
              errors.username ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="Enter your username"
          />
          {errors.username && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.username}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="gender" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
            Gender <span className="text-red-500">*</span>
          </label>
          <select
            id="gender"
            name="gender"
            required
            value={formData.gender}
            onChange={handleInputChange('gender')}
            onBlur={handleInputBlur('gender')}
            disabled={loading}
            className={`mt-1 block h-9 sm:h-10 w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed ${
              errors.gender ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' : ''
            }`}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.gender && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.gender}
            </p>
          )}
        </div>

        <EmailField
          id="signup-email"
          name="email"
          value={formData.email}
          onChange={handleInputChange('email')}
          onBlur={handleInputBlur('email')}
          disabled={loading}
          error={errors.email}
          autoComplete="email"
        />

        <PasswordField
          id="signup-password"
          name="password"
          value={formData.password}
          onChange={handleInputChange('password')}
          onFocus={() => {}}
          onBlur={handleInputBlur('password')}
          disabled={loading}
          error={errors.password}
          autoComplete="new-password"
          minLength={8}
        />

        {formData.password && (
          <PasswordStrengthIndicator validation={passwordValidation} />
        )}

        <div>
          <label htmlFor="confirm-password" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            onBlur={handleInputBlur('confirmPassword')}
            disabled={loading}
            className={`mt-1 block h-9 sm:h-10 w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed ${
              errors.confirmPassword ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.confirmPassword}
            </p>
          )}
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
          disabled={loading || !captchaVerified || !isPasswordValid}
          className="w-full flex items-center justify-center gap-2 h-9 sm:h-10 rounded-md bg-primary-600 px-4 text-sm sm:text-base font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:bg-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-600 transition-colors"
        >
          {loading ? (
            'Processing...'
          ) : (
            <>
              <SparklesIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Sign Up</span>
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <button 
          onClick={onToggleForm}
          className="font-semibold text-primary-600 hover:text-primary-500 disabled:opacity-50 transition-colors"
          disabled={loading}
        >
          Log in
        </button>
      </p>

      <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
        By signing up, you agree to our{' '}
        <button className="font-semibold text-primary-600 hover:text-primary-500">
          Terms & Support
        </button>
      </div>
    </div>
  );
};

export default SignupForm;