import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  username: string;
  fullName: string;
  gender: 'male' | 'female' | 'other';
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    session?: any;
    requiresConfirmation?: boolean;
  };
  error?: {
    message: string;
    code?: string;
  };
}

const API_URL = '/api/auth';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: { message: data.message || 'Login failed', code: data.code } };
      }

      if (data.data?.session?.access_token && data.data?.session?.refresh_token) {
        // Manually set the session in Supabase client to trigger onAuthStateChange
        await supabase.auth.setSession({
          access_token: data.data.session.access_token,
          refresh_token: data.data.session.refresh_token,
        });
        localStorage.setItem('auth_token', data.data.session.access_token);
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      return { success: false, error: { message: error.message || 'Network error' } };
    }
  },

  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: { message: data.message || 'Signup failed', code: data.code } };
      }

      if (data.data?.session?.access_token && data.data?.session?.refresh_token) {
        // Manually set the session in Supabase client to trigger onAuthStateChange
        await supabase.auth.setSession({
          access_token: data.data.session.access_token,
          refresh_token: data.data.session.refresh_token,
        });
        localStorage.setItem('auth_token', data.data.session.access_token);
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      return { success: false, error: { message: error.message || 'Network error' } };
    }
  },

  async logout(): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${API_URL}/logout`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          },
        });
      }
    } finally {
      await supabase.auth.signOut();
      localStorage.removeItem('auth_token');
    }
  },

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    try {
      const response = await fetch(`${API_URL}/me`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.data.user;
      } else {
        // Token invalid
        localStorage.removeItem('auth_token');
        return null;
      }
    } catch (error) {
      return null;
    }
  },

  async forgotPassword(email: string, redirectTo?: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: { message: data.message || 'Reset request failed', code: data.code } };
      }
      
      return { success: true, data: data.data };
    } catch (error: any) {
      return { success: false, error: { message: error.message || 'Network error' } };
    }
  }
};
