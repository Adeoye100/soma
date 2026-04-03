import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../middleware/adminAuth';
import { config } from '../config';

const router = Router();
const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceKey);

// Helper for health snapshot
async function getHealthSnapshot() {
  const start = Date.now();
  const { error: dbError } = await supabaseAdmin.from('exams').select('id').limit(1);
  const responseTime = Date.now() - start;

  const redisMode = process.env.REDIS_ENABLED === 'true' ? 'redis' : 'memory';
  const geminiConfigured = !!process.env.GEMINI_API_KEY;

  const mem = process.memoryUsage();
  const memPercent = (mem.heapUsed / mem.heapTotal) * 100;

  let status = 'healthy';
  if (redisMode === 'memory' || (memPercent >= 75 && memPercent < 90)) {
    status = 'degraded';
  }
  if (dbError || memPercent >= 90) {
    status = 'critical';
  }

  return {
    status,
    services: {
      database: { status: dbError ? 'down' : 'up', responseTime },
      redis: { status: 'up', mode: redisMode },
      gemini: { status: geminiConfigured ? 'up' : 'missing' },
      backend: { status: 'up', uptime: process.uptime() }
    },
    memory: {
      used: mem.heapUsed,
      total: mem.heapTotal,
      percent: memPercent
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      env: process.env.NODE_ENV || 'development'
    },
    timestamp: new Date().toISOString()
  };
}

// GET /api/admin/stream (SSE)
router.get('/stream', requireAdmin, (req: any, res: any) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendUpdate = async () => {
    try {
      const data = await getHealthSnapshot();
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error('SSE Update error:', err);
    }
  };

  sendUpdate();
  const interval = setInterval(sendUpdate, 30000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

// GET /api/admin/kpi
router.get('/kpi', requireAdmin, async (req, res) => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalExams },
      { count: totalUsers },
      { count: totalQuestions },
      { count: totalSessions },
      { count: recentExams },
      { count: lastWeekExams },
      { data: sessionsForAvg },
      { data: completionData }
    ] = await Promise.all([
      supabaseAdmin.from('exams').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('questions').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('exam_sessions').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('exams').select('*', { count: 'exact', head: true }).gte('created_at', lastWeek),
      supabaseAdmin.from('exams').select('*', { count: 'exact', head: true })
        .gte('created_at', twoWeeksAgo)
        .lt('created_at', lastWeek),
      supabaseAdmin.from('exam_sessions').select('score_percent').eq('status', 'graded'),
      supabaseAdmin.from('exams').select('status')
    ]);

    const avgScore = sessionsForAvg && sessionsForAvg.length > 0
      ? sessionsForAvg.reduce((acc, s) => acc + (s.score_percent || 0), 0) / sessionsForAvg.length
      : 0;

    const completed = completionData?.filter(e => e.status === 'completed').length || 0;
    const total = completionData?.length || 1;
    const completionRate = (completed / total) * 100;

    const growth = lastWeekExams && lastWeekExams > 0 ? (((recentExams || 0) - lastWeekExams) / lastWeekExams) * 100 : 0;

    res.json({
      kpis: [
        { id: 'total_exams', label: 'Total Exams', value: totalExams || 0, change: Math.round(growth), trend: growth >= 0 ? 'up' : 'down', icon: 'FileText', color: 'indigo' },
        { id: 'total_users', label: 'Total Users', value: totalUsers || 0, icon: 'Users', color: 'blue' },
        { id: 'avg_score', label: 'Avg Score', value: avgScore.toFixed(1), icon: 'Award', color: 'success' },
        { id: 'completion_rate', label: 'Completion Rate', value: completionRate.toFixed(1), icon: 'CheckCircle', color: 'success' },
        { id: 'total_questions', label: 'Questions Generated', value: totalQuestions || 0, icon: 'HelpCircle', color: 'indigo' },
        { id: 'active_sessions', label: 'Exam Sessions', value: totalSessions || 0, icon: 'Activity', color: 'info' }
      ]
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/dashboard
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [
      { data: examsLast30Days },
      { data: statusBreakdown },
      { data: recentActivity },
      { data: users },
      { data: allSessions }
    ] = await Promise.all([
      supabaseAdmin.from('exams').select('created_at, status').gte('created_at', thirtyDaysAgo),
      supabaseAdmin.from('exams').select('status'),
      supabaseAdmin.from('exams').select('id, title, status, type, created_at, user_id').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('users').select('id, email, full_name'),
      supabaseAdmin.from('exam_sessions').select('exam_id, score_percent, status')
    ]);

    // Daily stats
    const dailyStats: any = {};
    (examsLast30Days || []).forEach(e => {
      const d = new Date(e.created_at).toISOString().split('T')[0];
      if (!d) return;
      if (!dailyStats[d]) dailyStats[d] = { date: d, total: 0, completed: 0, failed: 0 };
      dailyStats[d].total++;
      if (e.status === 'completed') dailyStats[d].completed++;
      if (e.status === 'failed') dailyStats[d].failed++;
    });

    // Status breakdown
    const statusCounts = (statusBreakdown || []).reduce((acc: any, curr: any) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});

    // Recent activity with emails
    const recentWithEmail = (recentActivity || []).map(a => {
      const user = (users || []).find(u => u.id === a.user_id);
      return { ...a, user_email: user?.email };
    });

    // Leaderboard preview
    const leaderboardPreview = (users || []).map(u => {
        return { email: u.email, full_name: u.full_name, exams: 0, avg_score: 0 };
    }).slice(0, 5);

    res.json({
      timeSeries: Object.values(dailyStats).sort((a: any, b: any) => a.date.localeCompare(b.date)),
      statusBreakdown: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      recentActivity: recentWithEmail,
      leaderboard: leaderboardPreview
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/system/health
router.get('/system/health', requireAdmin, async (req, res) => {
  try {
    const health = await getHealthSnapshot();
    res.json(health);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/monitoring
router.get('/monitoring', requireAdmin, async (req, res) => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [
      { data: metrics },
      { data: questions }
    ] = await Promise.all([
      supabaseAdmin.from('exams').select('status, created_at, updated_at').gte('created_at', yesterday),
      supabaseAdmin.from('questions').select('question_type, difficulty')
    ]);

    const completed = metrics?.filter(m => m.status === 'completed') || [];
    const failed = metrics?.filter(m => m.status === 'failed').length || 0;
    const processing = metrics?.filter(m => m.status === 'processing').length || 0;
    
    const avgTime = completed.length > 0 
      ? completed.reduce((acc, m) => acc + (new Date(m.updated_at).getTime() - new Date(m.created_at).getTime()), 0) / completed.length / 1000
      : 0;

    // Hourly
    const hourly: any = {};
    (metrics || []).forEach(m => {
        const h = new Date(m.created_at).getHours();
        if (h === undefined) return;
        if (!hourly[h]) hourly[h] = { hour: h, count: 0, completed: 0 };
        hourly[h].count++;
        if (m.status === 'completed') hourly[h].completed++;
    });

    res.json({
      quickMetrics: {
        successRate: metrics && metrics.length > 0 ? (completed.length / metrics.length) * 100 : 0,
        failed24h: failed,
        processingNow: processing,
        avgGenTime: avgTime
      },
      hourly: Object.values(hourly),
      distributions: {
        types: (questions || []).map(q => q.question_type),
        difficulties: (questions || []).map(q => q.difficulty)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/alerts
router.get('/alerts', requireAdmin, async (req, res) => {
  try {
    const alerts: any[] = [];
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: recentExams } = await supabaseAdmin.from('exams').select('status').gte('created_at', hourAgo);
    if (recentExams && recentExams.length > 0) {
      const failed = recentExams.filter(e => e.status === 'failed').length;
      if (failed / recentExams.length > 0.2) {
        alerts.push({ severity: 'critical', title: 'High Failure Rate', message: `${Math.round((failed / recentExams.length) * 100)}% of exams failing`, timestamp: new Date() });
      }
    }

    const { data: stuckExams } = await supabaseAdmin.from('exams').select('title').eq('status', 'processing').lt('created_at', tenMinsAgo);
    (stuckExams || []).forEach(e => {
      alerts.push({ severity: 'warning', title: 'Exam Stuck', message: `Exam "${e.title}" stuck in processing`, timestamp: new Date() });
    });

    if (process.env.REDIS_ENABLED !== 'true') {
      alerts.push({ severity: 'warning', title: 'Memory Store Active', message: 'Redis unavailable', timestamp: new Date() });
    }

    const { count: openFeedback } = await supabaseAdmin.from('feedback').select('*', { count: 'exact', head: true }).eq('status', 'open').in('severity', ['high', 'critical']);
    if (openFeedback && openFeedback > 5) {
      alerts.push({ severity: 'warning', title: 'Unresolved Feedback', message: `${openFeedback} critical feedback items`, timestamp: new Date() });
    }

    res.json({ alerts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/queues
router.get('/queues', requireAdmin, async (req, res) => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [
      { count: processing },
      { count: pending },
      { count: failed24h },
      { count: completed24h },
      { data: oldestStuck }
    ] = await Promise.all([
      supabaseAdmin.from('exams').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
      supabaseAdmin.from('exams').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      supabaseAdmin.from('exams').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('updated_at', yesterday),
      supabaseAdmin.from('exams').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('updated_at', yesterday),
      supabaseAdmin.from('exams').select('id, title, created_at').eq('status', 'processing').order('created_at', { ascending: true }).limit(1)
    ]);

    res.json({
      processing: processing || 0,
      pending: pending || 0,
      failed24h: failed24h || 0,
      completed24h: completed24h || 0,
      oldestStuck: oldestStuck?.[0] || null,
      redisMode: process.env.REDIS_ENABLED === 'true' ? 'Redis' : 'Memory Store'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/users
router.get('/users', requireAdmin, async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  try {
    const { data, count, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    res.json({ users: data, total: count, page: Math.floor(offset / limit) + 1 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/leaderboard
router.get('/leaderboard', requireAdmin, async (req, res) => {
    try {
      // Simplified for now, real implementation would join users and sessions
      const { data: users } = await supabaseAdmin.from('users').select('id, email, full_name').limit(20);
      res.json({ leaderboard: (users || []).map((u, i) => ({ rank: i+1, ...u, total_exams: 0, completed_exams: 0, avg_score: 0 })) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/feedback
router.get('/feedback', requireAdmin, async (req, res) => {
  const { status } = req.query;
  try {
    let query = supabaseAdmin
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (status) query = query.eq('status', status);

    const { data, error } = await query.limit(50);
    if (error) throw error;

    res.json({ feedback: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/admin/feedback/:id
router.patch('/feedback/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;
  try {
    const updates: any = { status, admin_notes, updated_at: new Date() };
    if (status === 'resolved') updates.resolved_at = new Date();

    const { data, error } = await supabaseAdmin
      .from('feedback')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, feedback: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
