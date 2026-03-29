import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config';
import { DatabaseError, AuthenticationError } from '@/middleware/errorHandler';
import { cacheService } from '@/infrastructure/cache';
import winston from 'winston';

// Database types (simplified)
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'educator' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  type: 'OBJECTIVE' | 'SHORT_ANSWER' | 'ESSAY';
  difficulty: 'easy' | 'medium' | 'hard';
  num_questions: number;
  time_limit?: number;
  user_id: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  exam_id: string;
  user_id: string;
  question?: string;
  question_text: string;
  question_type: 'OBJECTIVE' | 'SHORT_ANSWER' | 'ESSAY' | 'TRUE_FALSE';
  options?: string[];
  correct_answer: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
  subject?: string;
  order_index?: number;
  points?: number;
  created_at: string;
}

export interface Material {
  id: string;
  title: string;
  description?: string;
  content: string;
  mime_type: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ExamResult {
  id: string;
  exam_id: string;
  user_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  percentage?: number;
  passed?: boolean;
  time_taken?: number;
  answers: any[];
  feedback?: string;
  created_at: string;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  user_id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  completed_at?: string;
  time_taken?: number;
  current_question_index: number;
}

// Create Supabase client
const createSupabaseClient = (serviceKey?: string): SupabaseClient => {
  const supabaseUrl = config.supabaseUrl;
  const supabaseKey = serviceKey || config.supabaseServiceKey || config.supabaseAnonKey;
  
  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  if (!supabaseUrl || !supabaseKey || !isValidUrl(supabaseUrl)) {
    winston.warn('Supabase is not configured or URL is invalid. Using restricted mode.');
    
    // Return a proxy that throws an error only when accessed
    return new Proxy({} as SupabaseClient, {
      get: (_, prop) => {
        if (prop === 'then') return undefined; // For async checks
        return () => {
          throw new Error(`Supabase client is not configured or URL is invalid. Cannot access property "${String(prop)}".`);
        };
      }
    });
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'X-Client-Info': 'smart-examination-backend'
      }
    }
  });
};

// Service role client for server operations
const supabaseAdmin = createSupabaseClient(config.supabaseServiceKey);

// User service
export class UserService {
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new DatabaseError(`Error finding user: ${error.message}`, { error });
      }

      return data;
    } catch (error) {
      winston.error('Error in findByEmail:', error);
      throw error;
    }
  }

  static async findById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new DatabaseError(`Error finding user: ${error.message}`, { error });
      }

      return data;
    } catch (error) {
      winston.error('Error in findById:', error);
      throw error;
    }
  }

  static async create(userData: Partial<User>): Promise<User> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Error creating user: ${error.message}`, { error });
      }

      return data;
    } catch (error) {
      winston.error('Error in create:', error);
      throw error;
    }
  }

  static async update(id: string, updates: Partial<User>): Promise<User> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Error updating user: ${error.message}`, { error });
      }

      return data;
    } catch (error) {
      winston.error('Error in update:', error);
      throw error;
    }
  }
}

// Exam service
export class ExamService {
  static async create(examData: Partial<Exam>): Promise<Exam> {
    try {
      const { data, error } = await supabaseAdmin
        .from('exams')
        .insert([examData])
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Error creating exam: ${error.message}`, { error });
      }

      // Invalidate user exam list cache
      if (data.user_id) {
        await cacheService.invalidateUserCache(data.user_id);
      }

      return data;
    } catch (error) {
      winston.error('Error in create:', error);
      throw error;
    }
  }

  static async findById(id: string): Promise<Exam | null> {
    return cacheService.cacheExamData(
      id,
      'details',
      async () => {
        const { data, error } = await supabaseAdmin
          .from('exams')
          .select('*')
          .eq('id', id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw new DatabaseError(`Error finding exam: ${error.message}`, { error });
        }

        return data;
      },
      { ttl: 1800 } // 30 minutes for exam data
    );
  }

  static async findByUserId(userId: string, page = 1, limit = 10): Promise<{ data: Exam[]; total: number }> {
    const cacheKey = `user_exams:${userId}:page_${page}:limit_${limit}`;

    return cacheService.cacheUserData(
      userId,
      cacheKey,
      async () => {
        const offset = (page - 1) * limit;

        const { data, error, count } = await supabaseAdmin
          .from('exams')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          throw new DatabaseError(`Error finding user exams: ${error.message}`, { error });
        }

        return { data: data || [], total: count || 0 };
      },
      { ttl: 900 } // 15 minutes for user exam lists
    );
  }

  static async update(id: string, updates: Partial<Exam>): Promise<Exam> {
    try {
      const { data, error } = await supabaseAdmin
        .from('exams')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Error updating exam: ${error.message}`, { error });
      }

      // Invalidate exam cache
      await cacheService.invalidateExamCache(id);

      return data;
    } catch (error) {
      winston.error('Error in update:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      // Delete questions first (foreign key constraint)
      await supabaseAdmin
        .from('questions')
        .delete()
        .eq('exam_id', id);

      // Delete exam results
      await supabaseAdmin
        .from('exam_results')
        .delete()
        .eq('exam_id', id);

      // Delete exam attempts
      await supabaseAdmin
        .from('exam_attempts')
        .delete()
        .eq('exam_id', id);

      // Delete exam
      const { error } = await supabaseAdmin
        .from('exams')
        .delete()
        .eq('id', id);

      if (error) {
        throw new DatabaseError(`Error deleting exam: ${error.message}`, { error });
      }

      // Invalidate exam cache
      await cacheService.invalidateExamCache(id);
    } catch (error) {
      winston.error('Error in delete:', error);
      throw error;
    }
  }
}

// Question service
export class QuestionService {
  static async createBulk(questions: Partial<Question>[]): Promise<Question[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('questions')
        .insert(questions)
        .select();

      if (error) {
        throw new DatabaseError(`Error creating questions: ${error.message}`, { error });
      }

      return data || [];
    } catch (error) {
      winston.error('Error in createBulk:', error);
      throw error;
    }
  }

  static async findByExamId(examId: string): Promise<Question[]> {
    return cacheService.cacheExamData(
      examId,
      'questions',
      async () => {
        const { data, error } = await supabaseAdmin
          .from('questions')
          .select('*')
          .eq('exam_id', examId)
          .order('created_at', { ascending: true });

        if (error) {
          throw new DatabaseError(`Error finding questions: ${error.message}`, { error });
        }

        return data || [];
      },
      { ttl: 3600 } // 1 hour for questions (they don't change often)
    );
  }

  static async update(id: string, updates: Partial<Question>): Promise<Question> {
    try {
      const { data, error } = await supabaseAdmin
        .from('questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Error updating question: ${error.message}`, { error });
      }

      return data;
    } catch (error) {
      winston.error('Error in update:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) {
        throw new DatabaseError(`Error deleting question: ${error.message}`, { error });
      }
    } catch (error) {
      winston.error('Error in delete:', error);
      throw error;
    }
  }
}

// Material service
export class MaterialService {
  static async create(materialData: Partial<Material>): Promise<Material> {
    try {
      const { data, error } = await supabaseAdmin
        .from('materials')
        .insert([materialData])
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Error creating material: ${error.message}`, { error });
      }

      return data;
    } catch (error) {
      winston.error('Error in create:', error);
      throw error;
    }
  }

  static async findByUserId(userId: string, page = 1, limit = 10): Promise<{ data: Material[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabaseAdmin
        .from('materials')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new DatabaseError(`Error finding user materials: ${error.message}`, { error });
      }

      return { data: data || [], total: count || 0 };
    } catch (error) {
      winston.error('Error in findByUserId:', error);
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('materials')
        .delete()
        .eq('id', id);

      if (error) {
        throw new DatabaseError(`Error deleting material: ${error.message}`, { error });
      }
    } catch (error) {
      winston.error('Error in delete:', error);
      throw error;
    }
  }
}

// Exam Result service
export class ExamResultService {
  static async create(resultData: Partial<ExamResult>): Promise<ExamResult> {
    try {
      const { data, error } = await supabaseAdmin
        .from('exam_results')
        .insert([resultData])
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Error creating exam result: ${error.message}`, { error });
      }

      return data;
    } catch (error) {
      winston.error('Error in create:', error);
      throw error;
    }
  }

  static async findByExamId(examId: string, page = 1, limit = 10): Promise<{ data: ExamResult[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabaseAdmin
        .from('exam_results')
        .select('*', { count: 'exact' })
        .eq('exam_id', examId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new DatabaseError(`Error finding exam results: ${error.message}`, { error });
      }

      return { data: data || [], total: count || 0 };
    } catch (error) {
      winston.error('Error in findByExamId:', error);
      throw error;
    }
  }

  static async findByUserId(userId: string, page = 1, limit = 10): Promise<{ data: ExamResult[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabaseAdmin
        .from('exam_results')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new DatabaseError(`Error finding user results: ${error.message}`, { error });
      }

      return { data: data || [], total: count || 0 };
    } catch (error) {
      winston.error('Error in findByUserId:', error);
      throw error;
    }
  }

  static async findById(id: string): Promise<ExamResult | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('exam_results')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new DatabaseError(`Error finding exam result: ${error.message}`, { error });
      }

      return data;
    } catch (error) {
      winston.error('Error in findById:', error);
      throw error;
    }
  }
}

// Exam Attempt service
export class ExamAttemptService {
  static async create(attemptData: Partial<ExamAttempt>): Promise<ExamAttempt> {
    try {
      const { data, error } = await supabaseAdmin
        .from('exam_attempts')
        .insert([attemptData])
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Error creating exam attempt: ${error.message}`, { error });
      }

      return data;
    } catch (error) {
      winston.error('Error in create:', error);
      throw error;
    }
  }

  static async findActiveAttempt(examId: string, userId: string): Promise<ExamAttempt | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new DatabaseError(`Error finding active attempt: ${error.message}`, { error });
      }

      return data;
    } catch (error) {
      winston.error('Error in findActiveAttempt:', error);
      throw error;
    }
  }

  static async update(id: string, updates: Partial<ExamAttempt>): Promise<ExamAttempt> {
    try {
      const { data, error } = await supabaseAdmin
        .from('exam_attempts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Error updating exam attempt: ${error.message}`, { error });
      }

      return data;
    } catch (error) {
      winston.error('Error in update:', error);
      throw error;
    }
  }

  static async findById(id: string): Promise<ExamAttempt | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('exam_attempts')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new DatabaseError(`Error finding exam attempt: ${error.message}`, { error });
      }

      return data;
    } catch (error) {
      winston.error('Error in findById:', error);
      throw error;
    }
  }
}

// Authentication service
export class AuthService {
  static async verifyUser(email: string): Promise<User> {
    const user = await UserService.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('User not found');
    }
    return user;
  }

  static async getUserById(id: string): Promise<User> {
    const user = await UserService.findById(id);
    if (!user) {
      throw new AuthenticationError('User not found');
    }
    return user;
  }
}

export const supabase = supabaseAdmin;

export default {
  UserService,
  ExamService,
  QuestionService,
  MaterialService,
  ExamResultService,
  ExamAttemptService,
  AuthService,
  supabase: supabaseAdmin
};