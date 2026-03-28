import { supabase } from '@/services/supabase';

const API_BASE = '/api';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export class AdminApiService {
  /**
   * Health and Monitoring
   */
  static async getSystemHealth() {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/health`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch health');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async getMonitoringStatus() {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/monitoring/status`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch monitoring status');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async queryMetrics(params: {
    name?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }) {
    try {
      const token = await getAuthToken();
      const searchParams = new URLSearchParams();
      if (params.name) searchParams.append('name', params.name);
      if (params.startTime) searchParams.append('startTime', params.startTime.toISOString());
      if (params.endTime) searchParams.append('endTime', params.endTime.toISOString());
      if (params.limit) searchParams.append('limit', params.limit.toString());

      const response = await fetch(`${API_BASE}/admin/monitoring/metrics?${searchParams}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to query metrics');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async queryTraces(params: {
    name?: string;
    status?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }) {
    try {
      const token = await getAuthToken();
      const searchParams = new URLSearchParams();
      if (params.name) searchParams.append('name', params.name);
      if (params.status) searchParams.append('status', params.status);
      if (params.startTime) searchParams.append('startTime', params.startTime.toISOString());
      if (params.endTime) searchParams.append('endTime', params.endTime.toISOString());
      if (params.limit) searchParams.append('limit', params.limit.toString());

      const response = await fetch(`${API_BASE}/admin/monitoring/traces?${searchParams}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to query traces');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async getSLAMetrics() {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/sla/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch SLA metrics');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  /**
   * Automation Management
   */
  static async getAutomationOverview() {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/automation/overview`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch automation overview');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async getWorkflows() {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/automation/workflows`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch workflows');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async getWorkflow(id: string) {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/automation/workflows/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch workflow');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async executeWorkflow(id: string, payload: any) {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/automation/workflows/${id}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to execute workflow');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async getExecutions(params: {
    status?: string;
    workflowId?: string;
    limit?: number;
  }) {
    try {
      const token = await getAuthToken();
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.append('status', params.status);
      if (params.workflowId) searchParams.append('workflowId', params.workflowId);
      if (params.limit) searchParams.append('limit', params.limit.toString());

      const response = await fetch(`${API_BASE}/admin/automation/executions?${searchParams}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch executions');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async getExecution(id: string) {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/automation/executions/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch execution');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async cancelExecution(id: string) {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/automation/executions/${id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to cancel execution');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  /**
   * Queue Management
   */
  static async getQueueOverview() {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/queues/overview`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch queue overview');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async getQueueInfo(queueName: string) {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/queues/${queueName}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch queue info');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async pauseQueue(queueName: string) {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/queues/${queueName}/pause`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to pause queue');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async resumeQueue(queueName: string) {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/queues/${queueName}/resume`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to resume queue');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async cleanQueue(queueName: string, status?: string, grace?: number) {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/queues/${queueName}/clean`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, grace }),
      });
      if (!response.ok) throw new Error('Failed to clean queue');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  /**
   * Configuration Management
   */
  static async getAllConfigurations() {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/config`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch configurations');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async getEnvironments() {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/config/environments`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch environments');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async getEnvironmentConfiguration(environment: string) {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/config/${environment}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch environment configuration');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async updateEnvironmentConfiguration(environment: string, config: any) {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/config/${environment}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to update configuration');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async reloadConfigurations() {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/config/reload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to reload configurations');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async getConfigurationHistory(params: {
    environment?: string;
    limit?: number;
  }) {
    try {
      const token = await getAuthToken();
      const searchParams = new URLSearchParams();
      if (params.environment) searchParams.append('environment', params.environment);
      if (params.limit) searchParams.append('limit', params.limit.toString());

      const response = await fetch(`${API_BASE}/admin/config/history?${searchParams}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch configuration history');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  /**
   * System Information
   */
  static async getSystemInfo() {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/system/info`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch system info');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async getDependencies() {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/system/dependencies`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch dependency status');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  /**
   * Alerts (placeholder for future implementation)
   */
  static async getAlerts(params: {
    status?: string;
    severity?: string;
    limit?: number;
  }) {
    try {
      const token = await getAuthToken();
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.append('status', params.status);
      if (params.severity) searchParams.append('severity', params.severity);
      if (params.limit) searchParams.append('limit', params.limit.toString());

      const response = await fetch(`${API_BASE}/admin/alerts?${searchParams}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async acknowledgeAlert(id: string) {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/alerts/${id}/acknowledge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to acknowledge alert');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async resolveAlert(id: string) {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE}/admin/alerts/${id}/resolve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to resolve alert');
      return { data: await response.json(), error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
}
