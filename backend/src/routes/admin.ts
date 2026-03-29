import { Router, Request, Response } from 'express';
import { query, param, body } from 'express-validator';
import { asyncHandler } from '@/middleware/errorHandler';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';
import { checkValidationResult } from '@/middleware/requestValidator';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cacheService } from '@/infrastructure/cache';
import { DatabaseError } from '@/middleware/errorHandler';
import { config } from '@/config';
import winston from 'winston';

const router = Router();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@soma.app').split(',').map(e => e.trim().toLowerCase());

const createSupabaseAdmin = (): SupabaseClient => {
  return createClient(config.supabaseUrl, config.supabaseServiceKey || config.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'soma-admin' } }
  });
};

const requireAdminEmail = (req: AuthenticatedRequest, res: Response, next: Function) => {
  const userEmail = req.user?.email?.toLowerCase();
  if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
    res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
    return;
  }
  next();
};

// All admin routes require JWT + admin email check
router.use(authMiddleware);
router.use(requireAdminEmail);

/**
 * @route   GET /api/admin/stats
 * @desc    Platform-wide KPIs
 */
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const supabase = createSupabaseAdmin();

  try {
    const [{ count: totalUsers }, { count: totalExams }, { count: totalResults }, { count: totalDocs }] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('exams').select('*', { count: 'exact', head: true }),
      supabase.from('exam_results').select('*', { count: 'exact', head: true }),
      supabase.from('documents').select('*', { count: 'exact', head: true })
    ]);

    const { data: avgScoreData } = await supabase
      .from('exam_results')
      .select('percentage')
      .not('percentage', 'is', null);

    const avgScore = avgScoreData && avgScoreData.length > 0
      ? Math.round(avgScoreData.reduce((sum, r) => sum + (r.percentage || 0), 0) / avgScoreData.length)
      : 0;

    const { count: passCount } = await supabase
      .from('exam_results')
      .select('*', { count: 'exact', head: true })
      .eq('passed', true);

    const passRate = totalResults && totalResults > 0
      ? Math.round(((passCount || 0) / totalResults) * 100)
      : 0;

    res.json({
      message: 'Platform stats retrieved',
      stats: {
        totalUsers: totalUsers || 0,
        totalExams: totalExams || 0,
        totalSubmissions: totalResults || 0,
        totalDocuments: totalDocs || 0,
        averageScore: avgScore,
        passRate
      }
    });
  } catch (error: any) {
    winston.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve stats', message: error.message });
  }
}));

/**
 * @route   GET /api/admin/users
 * @desc    Paginated user list
 */
router.get('/users',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  checkValidationResult,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const supabase = createSupabaseAdmin();

    try {
      const offset = (page - 1) * limit;
      let query = supabase.from('users').select('*', { count: 'exact' });

      if (search) {
        query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw new DatabaseError(`Failed to fetch users: ${error.message}`);

      res.json({
        message: 'Users retrieved',
        users: (data || []).map(u => ({
          id: u.id, email: u.email, fullName: u.full_name,
          username: u.username, role: u.role, createdAt: u.created_at
        })),
        pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) }
      });
    } catch (error: any) {
      winston.error('Admin users error:', error);
      res.status(500).json({ error: 'Failed to retrieve users', message: error.message });
    }
  })
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Individual user detail
 */
router.get('/users/:id',
  param('id').isUUID().withMessage('Valid user ID required'),
  checkValidationResult,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const supabase = createSupabaseAdmin();

    try {
      const { data: user, error } = await supabase.from('users').select('*').eq('id', id).single();
      if (error || !user) { res.status(404).json({ error: 'User not found' }); return; }

      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', id).single();
      const { count: examCount } = await supabase.from('exam_results').select('*', { count: 'exact', head: true }).eq('user_id', id);

      res.json({
        message: 'User detail retrieved',
        user: {
          id: user.id, email: user.email, fullName: user.full_name,
          username: user.username, role: user.role, createdAt: user.created_at,
          profile: profile || null,
          stats: { totalSubmissions: examCount || 0 }
        }
      });
    } catch (error: any) {
      winston.error('Admin user detail error:', error);
      res.status(500).json({ error: 'Failed to retrieve user', message: error.message });
    }
  })
);

/**
 * @route   POST /api/admin/users/:id/suspend
 * @desc    Suspend a user
 */
router.post('/users/:id/suspend',
  param('id').isUUID().withMessage('Valid user ID required'),
  body('reason').optional().isString(),
  checkValidationResult,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const supabase = createSupabaseAdmin();

    try {
      const { error } = await supabase.from('users').update({
        role: 'suspended',
        updated_at: new Date().toISOString()
      }).eq('id', id);

      if (error) throw new DatabaseError(`Failed to suspend user: ${error.message}`);

      winston.info(`User ${id} suspended by admin ${req.user?.email}`);
      res.json({ message: 'User suspended successfully' });
    } catch (error: any) {
      winston.error('Admin suspend error:', error);
      res.status(500).json({ error: 'Failed to suspend user', message: error.message });
    }
  })
);

/**
 * @route   GET /api/admin/exams
 * @desc    All exams across platform
 */
router.get('/exams',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  checkValidationResult,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const supabase = createSupabaseAdmin();

    try {
      const offset = (page - 1) * limit;
      const { data, error, count } = await supabase
        .from('exams')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw new DatabaseError(`Failed to fetch exams: ${error.message}`);

      res.json({
        message: 'Exams retrieved',
        exams: (data || []).map(e => ({
          id: e.id, title: e.title, type: e.type, difficulty: e.difficulty,
          numQuestions: e.num_questions, userId: e.user_id, status: e.status,
          createdAt: e.created_at
        })),
        pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) }
      });
    } catch (error: any) {
      winston.error('Admin exams error:', error);
      res.status(500).json({ error: 'Failed to retrieve exams', message: error.message });
    }
  })
);

/**
 * @route   GET /api/admin/leaderboard
 * @desc    Full unfiltered leaderboard
 */
router.get('/leaderboard',
  query('limit').optional().isInt({ min: 1, max: 500 }),
  checkValidationResult,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const supabase = createSupabaseAdmin();

    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('average_score', { ascending: false })
        .limit(limit);

      if (error) throw new DatabaseError(`Failed to fetch leaderboard: ${error.message}`);

      res.json({
        message: 'Full leaderboard retrieved',
        leaderboard: (profiles || []).map((p, i) => ({
          rank: i + 1,
          userId: p.id,
          username: p.display_name || p.username || 'Anonymous',
          country: p.country,
          totalExams: p.total_exams,
          averageScore: p.average_score,
          bestScore: p.best_score,
          currentStreak: p.current_streak,
          longestStreak: p.longest_streak
        }))
      });
    } catch (error: any) {
      winston.error('Admin leaderboard error:', error);
      res.status(500).json({ error: 'Failed to retrieve leaderboard', message: error.message });
    }
  })
);

/**
 * @route   GET /api/admin/activity
 * @desc    Recent activity feed
 */
router.get('/activity',
  query('limit').optional().isInt({ min: 1, max: 100 }),
  checkValidationResult,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const supabase = createSupabaseAdmin();

    try {
      const [recentExams, recentResults] = await Promise.all([
        supabase.from('exams').select('id, title, user_id, created_at').order('created_at', { ascending: false }).limit(limit),
        supabase.from('exam_results').select('id, exam_id, user_id, percentage, passed, created_at').order('created_at', { ascending: false }).limit(limit)
      ]);

      const activities = [
        ...(recentExams.data || []).map(e => ({
          type: 'exam_created',
          id: e.id,
          userId: e.user_id,
          description: `New exam created: ${e.title}`,
          timestamp: e.created_at
        })),
        ...(recentResults.data || []).map(r => ({
          type: 'exam_submitted',
          id: r.id,
          userId: r.user_id,
          description: `Exam ${r.passed ? 'passed' : 'failed'} with ${r.percentage}%`,
          timestamp: r.created_at
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);

      res.json({ message: 'Activity feed retrieved', activities });
    } catch (error: any) {
      winston.error('Admin activity error:', error);
      res.status(500).json({ error: 'Failed to retrieve activity', message: error.message });
    }
  })
);

export default router;
