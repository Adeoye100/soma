import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    iat: number;
    exp: number;
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

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    // Attach user information to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    };

    // Add request ID for tracking
    req.headers['x-user-id'] = decoded.id;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or malformed.',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication verification.',
      code: 'AUTH_ERROR'
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

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    };

    req.headers['x-user-id'] = decoded.id;
    next();
  } catch (error) {
    // If token is invalid, just continue without user info
    next();
  }
};

/**
 * Role-based Authorization Middleware
 * Requires user to have specific role(s)
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
        userRole: req.user.role
      });
      return;
    }

    next();
  };
};

/**
 * Admin-only Authorization Middleware
 */
export const requireAdmin = requireRole('admin', 'super_admin');

/**
 * Educator Authorization Middleware
 */
export const requireEducator = requireRole('educator', 'admin', 'super_admin');

/**
 * Self or Admin Authorization Middleware
 * Allows access if user is accessing their own resource or is an admin
 */
export const requireSelfOrAdmin = (userIdParam: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
      return;
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    const isSelf = req.user.id === resourceUserId;

    if (!isAdmin && !isSelf) {
      res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources or must be an admin'
      });
      return;
    }

    next();
  };
};

export default {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  requireAdmin,
  requireEducator,
  requireSelfOrAdmin
};