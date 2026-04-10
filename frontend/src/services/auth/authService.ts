import { apiClient } from '../api/ApiClient';
import { CONFIG } from '../../config/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
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

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthResponse['user'] | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Authentication Service for Frontend
 * Handles all authentication-related operations through the backend API
 */
export class AuthService {
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: false,
    error: null
  };

  private listeners: ((state: AuthState) => void)[] = [];

  constructor() {
    this.initializeAuth();
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately call with current state
    listener(this.authState);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current auth state
   */
  getState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Update auth state and notify listeners
   */
  private updateState(updates: Partial<AuthState>): void {
    this.authState = { ...this.authState, ...updates };
    this.listeners.forEach(listener => listener(this.authState));
  }

  /**
   * Initialize authentication state from storage
   */
  private initializeAuth(): void {
    try {
      const token = this.getStoredToken();
      const user = this.getStoredUser();

      if (token && user) {
        this.updateState({
          isAuthenticated: true,
          user,
          token,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Failed to initialize auth state:', error);
      this.clearAuthData();
    }
  }

  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<{ success: boolean; data?: AuthResponse; error?: AuthError }> {
    this.updateState({ isLoading: true, error: null });

    try {
      const result = await apiClient.post<AuthResponse>(CONFIG.API.endpoints.auth.login, credentials);

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Login failed');
      }

      const authResponse = result.data;

      // Store authentication data
      this.storeAuthData(authResponse);

      this.updateState({
        isAuthenticated: true,
        user: authResponse.user,
        token: authResponse.session.access_token,
        isLoading: false,
        error: null
      });

      return { success: true, data: authResponse };

    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'LOGIN_ERROR',
        message: error.message || 'Login failed',
        details: error
      };

      this.updateState({
        isLoading: false,
        error: authError.message
      });

      return { success: false, error: authError };
    }
  }

  /**
   * Register new user
   */
  async signup(credentials: SignupCredentials): Promise<{ 
    success: boolean; 
    data?: AuthResponse & { requiresConfirmation?: boolean }; 
    error?: AuthError 
  }> {
    this.updateState({ isLoading: true, error: null });

    try {
      const result = await apiClient.post<AuthResponse & { requiresConfirmation?: boolean }>(
        CONFIG.API.endpoints.auth.signup, 
        credentials
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Signup failed');
      }

      // If email confirmation is required
      if (result.data?.requiresConfirmation) {
        this.updateState({
          isLoading: false,
          error: null
        });

        return { 
          success: true, 
          data: result.data 
        };
      }

      // If auto-login after signup
      if (result.data?.session) {
        this.storeAuthData(result.data);

        this.updateState({
          isAuthenticated: true,
          user: result.data.user,
          token: result.data.session.access_token,
          isLoading: false,
          error: null
        });
      }

      return { success: true, data: result.data };

    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'SIGNUP_ERROR',
        message: error.message || 'Signup failed',
        details: error
      };

      this.updateState({
        isLoading: false,
        error: authError.message
      });

      return { success: false, error: authError };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    this.updateState({ isLoading: true, error: null });

    try {
      // Call logout endpoint
      await apiClient.post(CONFIG.API.endpoints.auth.logout, {});
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearAuthData();
      
      this.updateState({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: null
      });
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<{ success: boolean; data?: AuthResponse['user']; error?: AuthError }> {
    if (!this.authState.token) {
      return { success: false, error: { code: 'NO_TOKEN', message: 'No authentication token' } };
    }

    try {
      const result = await apiClient.get<{ user: AuthResponse['user'] }>(
        CONFIG.API.endpoints.auth.profile,
        {
          headers: {
            Authorization: `Bearer ${this.authState.token}`
          }
        }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Failed to get user info');
      }

      // Update user data in state
      this.updateState({ user: result.data.user });
      this.storeUser(result.data.user);

      return { success: true, data: result.data.user };

    } catch (error: any) {
      // If token is invalid, logout user
      if (error.code === 'INVALID_TOKEN' || error.code === 'TOKEN_EXPIRED') {
        await this.logout();
      }

      return { 
        success: false, 
        error: {
          code: error.code || 'USER_INFO_ERROR',
          message: error.message || 'Failed to get user information',
          details: error
        }
      };
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<{ success: boolean; token?: string; error?: AuthError }> {
    try {
      const result = await apiClient.post<{ access_token: string; expires_at: number }>(
        CONFIG.API.endpoints.auth.refresh
      );

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Token refresh failed');
      }

      // Update token in storage and state
      this.storeToken(result.data.access_token);

      this.updateState({ 
        token: result.data.access_token 
      });

      return { success: true, token: result.data.access_token };

    } catch (error: any) {
      // If refresh fails, logout user
      await this.logout();

      return { 
        success: false, 
        error: {
          code: error.code || 'REFRESH_ERROR',
          message: error.message || 'Token refresh failed',
          details: error
        }
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && !!this.authState.token;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.authState.token;
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    try {
      localStorage.removeItem(CONFIG.AUTH.tokenKey);
      localStorage.removeItem(CONFIG.AUTH.refreshTokenKey);
      localStorage.removeItem('user');
      
      sessionStorage.removeItem(CONFIG.AUTH.tokenKey);
      sessionStorage.removeItem(CONFIG.AUTH.refreshTokenKey);
      sessionStorage.removeItem('user');
    } catch (error) {
      console.warn('Failed to clear auth data from storage:', error);
    }
  }

  /**
   * Store authentication data
   */
  private storeAuthData(authResponse: AuthResponse): void {
    try {
      this.storeToken(authResponse.session.access_token);
      this.storeUser(authResponse.user);
    } catch (error) {
      console.error('Failed to store auth data:', error);
    }
  }

  /**
   * Store access token
   */
  private storeToken(token: string): void {
    try {
      if (CONFIG.AUTH.tokenStorage === 'localStorage') {
        localStorage.setItem(CONFIG.AUTH.tokenKey, token);
      } else if (CONFIG.AUTH.tokenStorage === 'sessionStorage') {
        sessionStorage.setItem(CONFIG.AUTH.tokenKey, token);
      }
    } catch (error) {
      console.warn('Failed to store token:', error);
    }
  }

  /**
   * Store refresh token
   */
  private storeRefreshToken(refreshToken: string): void {
    try {
      if (CONFIG.AUTH.tokenStorage === 'localStorage') {
        localStorage.setItem(CONFIG.AUTH.refreshTokenKey, refreshToken);
      } else if (CONFIG.AUTH.tokenStorage === 'sessionStorage') {
        sessionStorage.setItem(CONFIG.AUTH.refreshTokenKey, refreshToken);
      }
    } catch (error) {
      console.warn('Failed to store refresh token:', error);
    }
  }

  /**
   * Store user data
   */
  private storeUser(user: AuthResponse['user']): void {
    try {
      if (CONFIG.AUTH.tokenStorage === 'localStorage') {
        localStorage.setItem('user', JSON.stringify(user));
      } else if (CONFIG.AUTH.tokenStorage === 'sessionStorage') {
        sessionStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error) {
      console.warn('Failed to store user data:', error);
    }
  }

  /**
   * Get stored token
   */
  private getStoredToken(): string | null {
    try {
      if (CONFIG.AUTH.tokenStorage === 'localStorage') {
        return localStorage.getItem(CONFIG.AUTH.tokenKey);
      } else if (CONFIG.AUTH.tokenStorage === 'sessionStorage') {
        return sessionStorage.getItem(CONFIG.AUTH.tokenKey);
      }
      return null;
    } catch (error) {
      console.warn('Failed to get stored token:', error);
      return null;
    }
  }

  /**
   * Get stored refresh token
   */
  private getStoredRefreshToken(): string | null {
    try {
      if (CONFIG.AUTH.tokenStorage === 'localStorage') {
        return localStorage.getItem(CONFIG.AUTH.refreshTokenKey);
      } else if (CONFIG.AUTH.tokenStorage === 'sessionStorage') {
        return sessionStorage.getItem(CONFIG.AUTH.refreshTokenKey);
      }
      return null;
    } catch (error) {
      console.warn('Failed to get stored refresh token:', error);
      return null;
    }
  }

  /**
   * Get stored user
   */
  private getStoredUser(): AuthResponse['user'] | null {
    try {
      const userData = CONFIG.AUTH.tokenStorage === 'localStorage' 
        ? localStorage.getItem('user')
        : sessionStorage.getItem('user');
      
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.warn('Failed to get stored user:', error);
      return null;
    }
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.updateState({ isLoading: loading });
  }

  /**
   * Set error
   */
  setError(error: string | null): void {
    this.updateState({ error });
  }

  /**
   * Clear error
   */
  clearError(): void {
    this.updateState({ error: null });
  }

  /**
   * Initiate password reset process
   */
  async forgotPassword(email: string, redirectTo?: string): Promise<{ success: boolean; message?: string; error?: AuthError }> {
    try {
      const result = await apiClient.post<{ message: string }>(CONFIG.API.endpoints.auth.forgotPassword, { email, redirectTo });

      if (!result.success) {
        throw new Error(result.error?.message || 'Password reset request failed');
      }

      return { success: true, message: result.data?.message };
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'FORGOT_PASSWORD_ERROR',
        message: error.message || 'Password reset request failed',
        details: error
      };
      return { success: false, error: authError };
    }
  }

  /**
   * Reset password with new password
   */
  async resetPassword(password: string): Promise<{ success: boolean; message?: string; error?: AuthError }> {
    try {
      const result = await apiClient.post<{ message: string }>(CONFIG.API.endpoints.auth.resetPassword, { password });

      if (!result.success) {
        throw new Error(result.error?.message || 'Password reset failed');
      }

      return { success: true, message: result.data?.message };
    } catch (error: any) {
      const authError: AuthError = {
        code: error.code || 'RESET_PASSWORD_ERROR',
        message: error.message || 'Password reset failed',
        details: error
      };
      return { success: false, error: authError };
    }
  }
}

// Create and export singleton instance
export const authService = new AuthService();
export default authService;