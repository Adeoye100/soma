import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { authService, AuthCredentials, SignupCredentials } from '@/services/authService';
import { AuthenticationError } from '@/shared/errors';
import winston from 'winston';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user with email and password
 * @access  Public
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as AuthCredentials;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
      return;
    }

    if (!email.includes('@') || password.length < 6) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Please provide a valid email and password',
        code: 'INVALID_INPUT'
      });
      return;
    }

    const authResponse = await authService.login({ email, password });

    res.status(200).json({
      success: true,
      data: authResponse,
      message: 'Login successful'
    });

  } catch (error) {
    winston.error('Login route error:', error);

    if (error instanceof AuthenticationError) {
      const status = error.message.includes('Invalid email') ? 400 :
                    error.message.includes('Invalid credentials') ? 401 :
                    error.message.includes('Email not confirmed') ? 403 : 401;

      res.status(status).json({
        error: 'Authentication Failed',
        message: error.message,
        code: error.details?.code || 'AUTH_ERROR'
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during login',
      code: 'LOGIN_ERROR'
    });
  }
}));

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user
 * @access  Public
 */
router.post('/signup', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, password, username, fullName, gender } = req.body as SignupCredentials;

    // Validation
    if (!email || !password || !username || !fullName || !gender) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'All fields are required',
        code: 'MISSING_FIELDS'
      });
      return;
    }

    if (!email.includes('@')) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Please provide a valid email address',
        code: 'INVALID_EMAIL'
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 8 characters long',
        code: 'WEAK_PASSWORD'
      });
      return;
    }

    if (username.length < 2) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Username must be at least 2 characters long',
        code: 'INVALID_USERNAME'
      });
      return;
    }

    if (!['male', 'female', 'other'].includes(gender)) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Please select a valid gender',
        code: 'INVALID_GENDER'
      });
      return;
    }

    const authResponse = await authService.signup({
      email,
      password,
      username,
      fullName,
      gender
    });

    // Check if email confirmation is required
    if (!authResponse.session) {
      res.status(201).json({
        success: true,
        data: {
          user: authResponse.user,
          requiresConfirmation: true
        },
        message: 'Account created successfully. Please check your email for confirmation.'
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: authResponse,
      message: 'Account created successfully'
    });

  } catch (error) {
    winston.error('Signup route error:', error);

    if (error instanceof AuthenticationError) {
      const status = error.message.includes('already in use') ? 409 :
                    error.message.includes('Invalid email') ? 400 :
                    error.message.includes('Password') ? 400 : 400;

      res.status(status).json({
        error: 'Registration Failed',
        message: error.message,
        code: error.details?.code || 'SIGNUP_ERROR'
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during registration',
      code: 'SIGNUP_ERROR'
    });
  }
}));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh authentication token
 * @access  Public
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN'
      });
      return;
    }

    const { access_token, expires_at } = await authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      data: {
        access_token,
        expires_at,
        token_type: 'Bearer'
      },
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    winston.error('Token refresh route error:', error);

    if (error instanceof AuthenticationError) {
      res.status(401).json({
        error: 'Token Refresh Failed',
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during token refresh',
      code: 'REFRESH_ERROR'
    });
  }
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user info
 * @access  Private
 */
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication Required',
        message: 'No authorization token provided',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    const { user, token: verifiedToken } = await authService.verifyToken(token);

    res.status(200).json({
      success: true,
      data: {
        user,
        token: verifiedToken
      },
      message: 'User information retrieved successfully'
    });

  } catch (error) {
    winston.error('Get user route error:', error);

    if (error instanceof AuthenticationError) {
      res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      code: 'USER_INFO_ERROR'
    });
  }
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate session
 * @access  Private
 */
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      await authService.logout(token);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    winston.error('Logout route error:', error);

    // Even if logout fails, we should still return success
    // to prevent users from being locked out
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
}));

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Initiate password reset process
 * @access  Public
 */
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Please provide a valid email address',
        code: 'INVALID_EMAIL'
      });
      return;
    }

    // For now, return success to prevent email enumeration
    // In production, you would integrate with Supabase's password reset
    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link.'
    });

  } catch (error) {
    winston.error('Forgot password route error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      code: 'FORGOT_PASSWORD_ERROR'
    });
  }
}));

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Token and new password are required',
        code: 'MISSING_FIELDS'
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 8 characters long',
        code: 'WEAK_PASSWORD'
      });
      return;
    }

    // For now, return success placeholder
    // In production, you would verify the token and update the password
    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    winston.error('Reset password route error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      code: 'RESET_PASSWORD_ERROR'
    });
  }
}));

export default router;