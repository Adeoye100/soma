export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PasswordValidationState {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  specialChar: boolean;
}

export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email.trim()) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  if (email.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }
  
  return { isValid: true };
};

export const validatePassword = (password: string, isSignup: boolean = false): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (isSignup && password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }
  
  return { isValid: true };
};

export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  if (!username.trim()) {
    return { isValid: false, error: 'Username is required' };
  }
  
  if (username.trim().length < 2) {
    return { isValid: false, error: 'Username must be at least 2 characters' };
  }
  
  // Check for invalid characters
  const invalidChars = /[^a-zA-Z0-9_-]/;
  if (invalidChars.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  return { isValid: true };
};

export const validateGender = (gender: string): { isValid: boolean; error?: string } => {
  const validGenders = ['male', 'female', 'other'];
  if (!validGenders.includes(gender)) {
    return { isValid: false, error: 'Please select a valid gender' };
  }
  
  return { isValid: true };
};

export const calculatePasswordStrength = (password: string): PasswordValidationState => {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    specialChar: /[^A-Za-z0-9]/.test(password),
  };
};

export const validatePasswordStrength = (password: string): ValidationResult => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateForm = (
  isSignup: boolean,
  email: string,
  password: string,
  username?: string,
  gender?: string
): ValidationResult => {
  const errors: string[] = [];
  
  // Email validation
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.push(emailValidation.error!);
  }
  
  // Password validation
  const passwordValidation = validatePassword(password, isSignup);
  if (!passwordValidation.isValid) {
    errors.push(passwordValidation.error!);
  }
  
  // Additional signup validations
  if (isSignup) {
    if (username) {
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.isValid) {
        errors.push(usernameValidation.error!);
      }
    } else {
      errors.push('Username is required');
    }
    
    if (gender) {
      const genderValidation = validateGender(gender);
      if (!genderValidation.isValid) {
        errors.push(genderValidation.error!);
      }
    } else {
      errors.push('Gender selection is required');
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

export const formatAuthError = (error: any): string => {
  if (error.message?.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  } else if (error.message === 'Invalid login credentials') {
    return 'Invalid email or password. Please check your credentials and try again.';
  } else if (error.message?.includes('User already registered')) {
    return 'This email is already in use. Please try logging in instead.';
  } else if (error.message?.includes('Email not confirmed')) {
    return 'Please check your email and click the confirmation link before signing in.';
  } else if (error.message?.includes('Password should be at least')) {
    return 'Password must be at least 8 characters long.';
  } else if (error.message?.includes('Invalid email')) {
    return 'Please enter a valid email address.';
  } else if (error.message?.includes('signup disabled')) {
    return 'Sign up is currently disabled. Please try logging in instead.';
  } else if (error.message?.includes('Provider not enabled')) {
    return 'Google sign-in is not enabled. Please contact support.';
  } else {
    return error.message || 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Validates a redirect URL to prevent Open Redirect and XSS attacks.
 * Only allowed internal routes are permitted.
 * 
 * @param redirect The redirect path to validate
 * @param defaultRedirect The default path to use if the redirect is invalid
 * @returns A safe, validated redirect path
 */
export const validateRedirect = (redirect: string | null | undefined, defaultRedirect: string = '/app'): string => {
  if (!redirect) return defaultRedirect;

  // List of allowed internal routes
  const allowedRoutes = [
    '/app',
    '/dashboard',
    '/profile',
    '/settings',
    '/exams',
    '/history',
    '/login',
    '/signup'
  ];

  // Basic check: Must start with / and not be a protocol-relative URL (//)
  // This prevents redirecting to external domains
  if (!redirect.startsWith('/') || redirect.startsWith('//')) {
    console.warn(`Blocked potentially unsafe redirect to: ${redirect}`);
    return defaultRedirect;
  }

  // Optional: Check if the base path is in the allowed list
  // Extract the base path (e.g., /app/settings -> /app)
  const basePath = redirect.split('?')[0].split('#')[0];
  
  // If we want a strict check against allowedRoutes
  const isAllowed = allowedRoutes.some(route => 
    basePath === route || basePath.startsWith(`${route}/`)
  );

  if (isAllowed) {
    return redirect;
  }

  console.warn(`Blocked unauthorized redirect path: ${redirect}`);
  return defaultRedirect;
};