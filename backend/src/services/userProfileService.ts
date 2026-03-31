import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config';
import { cacheService } from '@/infrastructure/cache';
import { DatabaseError } from '@/middleware/errorHandler';
import winston from 'winston';

export interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  total_exams: number;
  average_score: number;
  best_score: number;
  current_streak: number;
  longest_streak: number;
  subjects_studied?: string[];
  badges?: string[];
  rank?: number;
}

export interface ProfileUpdate {
  display_name?: string;
  username?: string;
  country?: string;
  avatar_url?: string;
}

const createSupabaseAdmin = (): SupabaseClient => {
  return createClient(config.supabaseUrl, config.supabaseServiceKey || config.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'soma-profile-service' } }
  });
};

export class UserProfileService {
  static async getProfile(userId: string): Promise<UserProfile> {
    const cacheKey = `user:profile:${userId}`;
    return cacheService.cacheResponse(cacheKey, async () => {
      const supabase = createSupabaseAdmin();

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new DatabaseError(`Failed to fetch profile: ${error.message}`);
      }

      if (!profile) {
        return {
          id: userId,
          username: null,
          display_name: null,
          avatar_url: null,
          country: null,
          total_exams: 0,
          average_score: 0,
          best_score: 0,
          current_streak: 0,
          longest_streak: 0,
          subjects_studied: [],
          badges: [],
          rank: 0
        };
      }

      const { data: examResults } = await supabase
        .from('exam_results')
        .select('exam_id, exams!inner(title)')
        .eq('user_id', userId);

      const subjects = [...new Set((examResults || []).map((r: any) => r.exams?.title?.split(' - ')[0]).filter(Boolean))];

      const badges = this.calculateBadges(profile);

      const { data: allProfiles } = await supabase
        .from('user_profiles')
        .select('id, average_score')
        .order('average_score', { ascending: false });

      const rank = (allProfiles || []).findIndex((p: any) => p.id === userId) + 1;

      return {
        ...profile,
        subjects_studied: subjects,
        badges,
        rank: rank || 0
      };
    }, { ttl: 300 });
  }

  static async updateProfile(userId: string, updates: ProfileUpdate): Promise<UserProfile> {
    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new DatabaseError(`Failed to update profile: ${error.message}`);
    }

    await cacheService.invalidateKey(`user:profile:${userId}`);

    return data;
  }

  static async uploadAvatar(userId: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const supabase = createSupabaseAdmin();

    const ext = mimeType.split('/')[1] || 'jpg';
    const storagePath = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      throw new DatabaseError(`Failed to upload avatar: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(storagePath);

    const avatarUrl = urlData.publicUrl;

    await this.updateProfile(userId, { avatar_url: avatarUrl });

    return avatarUrl;
  }

  private static calculateBadges(profile: any): string[] {
    const badges: string[] = [];
    if (profile.total_exams >= 1) badges.push('First Exam');
    if (profile.total_exams >= 10) badges.push('Dedicated Learner');
    if (profile.total_exams >= 50) badges.push('Exam Master');
    if (profile.best_score >= 90) badges.push('Top Scorer');
    if (profile.best_score === 100) badges.push('Perfect Score');
    if (profile.longest_streak >= 7) badges.push('Week Warrior');
    if (profile.longest_streak >= 30) badges.push('Monthly Champion');
    if (profile.current_streak >= 5) badges.push('On Fire');
    return badges;
  }
}

export default UserProfileService;
