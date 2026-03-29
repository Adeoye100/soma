import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config';
import { cacheService } from '@/infrastructure/cache';
import { DatabaseError } from '@/middleware/errorHandler';
import winston from 'winston';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  totalScore: number;
  passRate: number;
  examsCompleted: number;
  streak: number;
}

const createSupabaseAdmin = (): SupabaseClient => {
  return createClient(config.supabaseUrl, config.supabaseServiceKey || config.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'soma-leaderboard' } }
  });
};

export class LeaderboardService {
  static async getLeaderboard(subject?: string, period: string = 'alltime', limit: number = 10): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard:${subject || 'all'}:${period}:${limit}`;
    return cacheService.cacheResponse(cacheKey, async () => {
      const supabase = createSupabaseAdmin();

      let dateFilter = '';
      if (period === 'weekly') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = weekAgo.toISOString();
      } else if (period === 'monthly') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = monthAgo.toISOString();
      }

      let query = supabase
        .from('exam_results')
        .select('user_id, score, passed, percentage, created_at', { count: 'exact' });

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: results, error } = await query;

      if (error) {
        throw new DatabaseError(`Failed to fetch leaderboard data: ${error.message}`);
      }

      const userStats = new Map<string, { totalScore: number; passed: number; total: number }>();
      for (const r of results || []) {
        const existing = userStats.get(r.user_id) || { totalScore: 0, passed: 0, total: 0 };
        existing.totalScore += r.percentage || 0;
        if (r.passed) existing.passed++;
        existing.total++;
        userStats.set(r.user_id, existing);
      }

      const sortedUsers = Array.from(userStats.entries())
        .map(([userId, stats]) => ({
          userId,
          totalScore: stats.totalScore,
          passRate: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0,
          examsCompleted: stats.total
        }))
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, limit);

      if (sortedUsers.length === 0) return [];

      const userIds = sortedUsers.map(u => u.userId);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, username, display_name, avatar_url, country, current_streak')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return sortedUsers.map((user, index) => {
        const profile = profileMap.get(user.userId);
        return {
          rank: index + 1,
          userId: user.userId,
          username: profile?.display_name || profile?.username || 'Anonymous',
          avatarUrl: profile?.avatar_url || null,
          country: profile?.country || null,
          totalScore: user.totalScore,
          passRate: user.passRate,
          examsCompleted: user.examsCompleted,
          streak: profile?.current_streak || 0
        };
      });
    }, { ttl: 120 });
  }

  static async invalidateLeaderboardCache(): Promise<void> {
    await cacheService.invalidate('leaderboard:');
  }
}

export default LeaderboardService;
