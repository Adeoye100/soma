import { Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';
import { config } from '@/config';
import winston from 'winston';

const supabaseAdmin = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey || config.supabaseAnonKey,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'soma-admin-auth' } }
  }
);

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@soma.app')
  .split(',')
  .map(e => e.trim().toLowerCase());

export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Step 1: Run standard JWT auth first
    await new Promise<void>((resolve, reject) => {
      authMiddleware(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    // Step 2: Check admin via email list
    const userEmail = req.user.email?.toLowerCase();
    if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
      next();
      return;
    }

    // Step 3: Check admin via Supabase app_metadata (service role)
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(
        req.headers.authorization?.replace('Bearer ', '') || ''
      );

      if (!error && user) {
        const role = user.app_metadata?.role;
        if (role === 'admin' || role === 'super_admin') {
          next();
          return;
        }

        // Step 4: Check public.user_roles table
        const { data: roleData } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (roleData) {
          next();
          return;
        }
      }
    } catch (roleCheckErr) {
      winston.warn('Admin role check via Supabase failed, falling back to email-only', roleCheckErr);
    }

    res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
  } catch (error: any) {
    winston.error('Admin auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Authorization check failed' });
  }
};

export default requireAdmin;
