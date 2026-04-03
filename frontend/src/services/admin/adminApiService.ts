import { supabase } from '../supabase';

export interface KPI {
  id: string;
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
}

export interface DashboardData {
  timeSeries: any[];
  statusBreakdown: any[];
  recentActivity: any[];
  leaderboard: any[];
}

export interface Feedback {
  id: string;
  user_id: string;
  user_email: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  page_url?: string;
  browser_info?: string;
  created_at: string;
  admin_notes?: string;
  resolved_at?: string;
  submitter_email?: string;
}

export class AdminApiService {
  private static baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  private static async getAuthHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No active session');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
  }

  private static async request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers = await this.getAuthHeader();
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...headers, ...options?.headers }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  static async getKpis() {
    return this.request<{ kpis: KPI[] }>('/api/admin/kpi');
  }

  static async getDashboard() {
    return this.request<DashboardData>('/api/admin/dashboard');
  }

  static async getTimeSeries(period = '30d') {
    return this.request<any[]>(`/api/admin/time-series?period=${period}`);
  }

  static async getSystemHealth() {
    return this.request<any>('/api/admin/system/health');
  }

  static async getMonitoring() {
    return this.request<any>('/api/admin/monitoring');
  }

  static async getAutomation() {
    return this.request<any>('/api/admin/automation');
  }

  static async getSystemInfo() {
    return this.request<any>('/api/admin/system/info');
  }

  static async getAlerts() {
    return this.request<{ alerts: any[] }>('/api/admin/alerts');
  }

  static async getConfiguration() {
    return this.request<any>('/api/admin/configuration');
  }

  static async getQueues() {
    return this.request<any>('/api/admin/queues');
  }

  static async getUsers(limit = 50, offset = 0) {
    return this.request<{ users: any[], total: number, page: number }>(
      `/api/admin/users?limit=${limit}&offset=${offset}`
    );
  }

  static async getLeaderboard() {
    return this.request<{ leaderboard: any[] }>('/api/admin/leaderboard');
  }

  static async getFeedback(status?: string) {
    const q = status ? `?status=${status}` : '';
    return this.request<{ feedback: Feedback[] }>(`/api/admin/feedback${q}`);
  }

  static async updateFeedback(id: string, updates: { status: string; admin_notes?: string }) {
    return this.request<any>(`/api/admin/feedback/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }
}

// Public feedback submission (no admin required)
export async function submitFeedback(data: {
  type: string;
  title: string;
  description: string;
  severity: string;
  page_url?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${AdminApiService['baseUrl']}/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Submission failed');
  return res.json();
}
