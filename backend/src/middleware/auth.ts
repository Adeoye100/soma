import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { authService } from '@/services/authService';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
  };
}

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * JWT Authentication Middleware
 * Validates JWT tokens and attaches user information to the request object
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // DEBUG: Remove after confirming fix
    console.log('[Auth] headers received:', Object.keys(req.headers));
    console.log('[Auth] authorization:', req.headers.authorization ? 'present' : 'MISSING');

    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        error: 'Access denied',
        message: 'No authorization token provided'
      });
      return;
    }

    // Check if token starts with 'Bearer '
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7, authHeader.length)
      : authHeader;

    if (!token) {
      res.status(401).json({
        error: 'Access denied',
        message: 'Invalid authorization format. Expected: Bearer <token>'
      });
      return;
    }

    // Verify token using Supabase service
    const { user } = await authService.verifyToken(token);

    // Attach user information to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role || 'student'
    };

    // Add request ID for tracking
    req.headers['x-user-id'] = user.id;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError' || error.message?.includes('expired')) {
      res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }

    res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is invalid or malformed.',
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user info if token is present, but doesn't require it
 */
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7, authHeader.length)
      : authHeader;

    if (!token) {
      return next();
    }

    const { user } = await authService.verifyToken(token);

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role || 'student'
    };

    req.headers['x-user-id'] = user.id;
    next();
  } catch (error) {
    // If token is invalid, just continue without user info
    next();
  }
};

export default {
  authMiddleware,
  optionalAuthMiddleware
};