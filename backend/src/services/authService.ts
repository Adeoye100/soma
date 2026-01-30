import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '@/config';
import { AuthenticationError, DatabaseError } from '@/shared/errors';
import winston from 'winston';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends AuthCredentials {
  username: string;
  fullName: string;
  gender: 'male' | 'female' | 'other';
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username?: string;
    full_name?: string;
    gender?: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    token_type: string;
  };
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Authentication Service using Supabase Auth
 * Handles login, signup, and session management
 */
export class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      config.supabaseUrl,
      config.supabaseServiceKey || config.supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            'X-Client-Info': 'smart-examination-backend'
          }
        }
      }
    );
  }

  /**
   * Authenticate user with email and password
   */
  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    try {
      winston.info(`Login attempt for email: ${credentials.email}`);

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email.toLowerCase().trim(),
        password: credentials.password
      });

      if (error) {
        winston.warn(`Login failed for ${credentials.email}: ${error.message}`);
        throw this.handleAuthError(error);
      }

      if (!data.user || !data.session) {
        throw new AuthenticationError('Invalid login response from authentication service');
      }

      const user = await this.getUserProfile(data.user.id);
      
      winston.info(`Login successful for user: ${data.user.id}`);

      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          username: user?.username,
          full_name: user?.full_name,
          gender: user?.gender
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token!,
          expires_at: data.session.expires_at!,
          token_type: data.session.token_type
        }
      };
    } catch (error) {
      winston.error('Login error:', error);
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Login failed', error);
    }
  }

  /**
   * Register new user
   */
  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    try {
      winston.info(`Signup attempt for email: ${credentials.email}`);

      const { data, error } = await this.supabase.auth.signUp({
        email: credentials.email.toLowerCase().trim(),
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.fullName.trim(),
            username: credentials.username.trim().toLowerCase().replace(/\s+/g, '_'),
            gender: credentials.gender
          }
        }
      });

      if (error) {
        winston.warn(`Signup failed for ${credentials.email}: ${error.message}`);
        throw this.handleAuthError(error);
      }

      // If user needs email confirmation
      if (data.user && !data.session) {
        return {
          user: {
            id: data.user.id,
            email: data.user.email!
          },
          session: null as any
        };
      }

      if (!data.user || !data.session) {
        throw new AuthenticationError('Invalid signup response from authentication service');
      }

      const user = await this.getUserProfile(data.user.id);
      
      winston.info(`Signup successful for user: ${data.user.id}`);

      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          username: user?.username,
          full_name: user?.full_name,
          gender: user?.gender
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token!,
          expires_at: data.session.expires_at!,
          token_type: data.session.token_type
        }
      };
    } catch (error) {
      winston.error('Signup error:', error);
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Signup failed', error);
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<{ access_token: string; expires_at: number }> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error) {
        throw this.handleAuthError(error);
      }

      if (!data.session) {
        throw new AuthenticationError('Invalid refresh response');
      }

      return {
        access_token: data.session.access_token,
        expires_at: data.session.expires_at!
      };
    } catch (error) {
      winston.error('Token refresh error:', error);
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Token refresh failed', error);
    }
  }

  /**
   * Sign out user
   */
  async logout(accessToken: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        throw this.handleAuthError(error);
      }

      winston.info('User logged out successfully');
    } catch (error) {
      winston.error('Logout error:', error);
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Logout failed', error);
    }
  }

  /**
   * Verify JWT token and get user info
   */
  async verifyToken(token: string): Promise<{ user: any; token: string }> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        throw new AuthenticationError('Invalid or expired token');
      }

      const profile = await this.getUserProfile(user.id);

      return {
        user: {
          id: user.id,
          email: user.email!,
          username: profile?.username,
          full_name: profile?.full_name,
          gender: profile?.gender
        },
        token
      };
    } catch (error) {
      winston.error('Token verification error:', error);
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Token verification failed', error);
    }
  }

  /**
   * Get user profile from custom users table
   */
  private async getUserProfile(userId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('username, full_name, gender')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new DatabaseError(`Error fetching user profile: ${error.message}`, { error });
      }

      return data;
    } catch (error) {
      winston.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Handle Supabase authentication errors
   */
  private handleAuthError(error: any): AuthenticationError {
    let code = 'AUTHENTICATION_ERROR';
    let message = 'Authentication failed';

    if (error.message?.includes('Invalid login credentials')) {
      code = 'INVALID_CREDENTIALS';
      message = 'Invalid email or password';
    } else if (error.message?.includes('Email not confirmed')) {
      code = 'EMAIL_NOT_CONFIRMED';
      message = 'Please check your email and click the confirmation link';
    } else if (error.message?.includes('User already registered')) {
      code = 'USER_ALREADY_EXISTS';
      message = 'This email is already in use';
    } else if (error.message?.includes('Password should be at least')) {
      code = 'WEAK_PASSWORD';
      message = 'Password must be at least 8 characters long';
    } else if (error.message?.includes('Invalid email')) {
      code = 'INVALID_EMAIL';
      message = 'Please enter a valid email address';
    } else if (error.message?.includes('rate limit')) {
      code = 'RATE_LIMITED';
      message = 'Too many requests. Please wait a moment and try again';
    } else if (error.message) {
      message = error.message;
    }

    return new AuthenticationError(message, { code, details: error });
  }

  /**
   * Generate JWT token for frontend
   */
  generateJWT(user: any): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        role: 'student' // Default role
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as SignOptions
    );
  }

  /**
   * Verify JWT token
   */
  verifyJWT(token: string): any {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (error) {
      throw new AuthenticationError('Invalid token');
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;