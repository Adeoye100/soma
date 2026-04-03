import { Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest } from './auth';
import { config } from '../config';
import winston from 'winston';

const supabaseAdmin = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader) {
      token = authHeader.replace('Bearer ', '');
    } else if (req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      res.status(401).json({ error: 'Unauthorized', message: 'Missing authorization token' });
      return;
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
      return;
    }

    // Check admin role in app_metadata
    const role = user.app_metadata?.role;
    if (role === 'admin') {
      // Attach user to request for downstream use
      req.user = user as any;
      next();
      return;
    }

    res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
  } catch (error: any) {
    winston.error('Admin auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Authorization check failed' });
  }
};

export default requireAdmin;
