import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceKey);

// POST /api/feedback (PUBLIC - Authenticated user)
router.post('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, title, description, severity, page_url } = req.body;

    if (!type || !title || !description || !severity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = req.user;
    const browser_info = req.headers['user-agent'];

    const { data, error } = await supabaseAdmin
      .from('feedback')
      .insert({
        user_id: user?.id,
        user_email: user?.email,
        type,
        title,
        description,
        severity,
        page_url,
        browser_info,
        status: 'open',
        metadata: {}
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, feedbackId: data.id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}));

export default router;
