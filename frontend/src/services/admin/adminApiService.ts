import { supabase } from '../supabase';

export class AdminApiService {
  private static baseUrl =
    import.meta.env.VITE_API_URL || 'http://localhost:3000';

  private static async getAuthHeader(): Promise<Record<string, string>> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error('Authentication required. Please sign in.');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  }

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string>),
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        errorBody.message || `Request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  // AdminDashboard
  static async getDashboard(): Promise<unknown> {
    return this.request('/api/admin/dashboard');
  }

  // SystemHealth
  static async getSystemHealth(): Promise<unknown> {
    return this.request('/api/admin/system/health');
  }

  // Monitoring
  static async getMonitoring(): Promise<unknown> {
    return this.request('/api/admin/monitoring');
  }

  // Automation
  static async getWorkflows(): Promise<unknown> {
    return this.request('/api/admin/automation/workflows');
  }

  // SystemInfo
  static async getSystemInfo(): Promise<unknown> {
    return this.request('/api/admin/system/info');
  }

  // Alerts
  static async getAlerts(): Promise<unknown> {
    return this.request('/api/admin/alerts');
  }

  static async acknowledgeAlert(alertId: string): Promise<unknown> {
    return this.request(`/api/admin/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    });
  }

  static async resolveAlert(alertId: string): Promise<unknown> {
    return this.request(`/api/admin/alerts/${alertId}/resolve`, {
      method: 'POST',
    });
  }

  // Configuration
  static async getConfiguration(): Promise<unknown> {
    return this.request('/api/admin/configuration');
  }

  static async updateConfiguration(key: string, value: string): Promise<unknown> {
    return this.request('/api/admin/configuration', {
      method: 'PUT',
      body: JSON.stringify({ key, value }),
    });
  }

  // Queues
  static async getQueues(): Promise<unknown> {
    return this.request('/api/admin/queues');
  }

  static async pauseQueue(queueId: string): Promise<unknown> {
    return this.request(`/api/admin/queues/${queueId}/pause`, {
      method: 'POST',
    });
  }

  static async resumeQueue(queueId: string): Promise<unknown> {
    return this.request(`/api/admin/queues/${queueId}/resume`, {
      method: 'POST',
    });
  }

  static async cleanQueue(queueId: string): Promise<unknown> {
    return this.request(`/api/admin/queues/${queueId}/clean`, {
      method: 'POST',
    });
  }
}
