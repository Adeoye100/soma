const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getToken(): string | null {
  return localStorage.getItem('soma_admin_token');
}

function setToken(token: string): void {
  localStorage.setItem('soma_admin_token', token);
}

function clearToken(): void {
  localStorage.removeItem('soma_admin_token');
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }
  if (res.status === 403) {
    throw new Error('FORBIDDEN');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error ${res.status}`);
  }
  return res.json();
}

// ── Auth ────────────────────────────────────────────
export async function loginAdmin(email: string, password: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  if (data.session?.access_token) {
    setToken(data.session.access_token);
    return true;
  }
  return false;
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function logoutAdmin(): void {
  clearToken();
}

// ── Dashboard ───────────────────────────────────────
export interface DashboardStats {
  totalExams: number;
  totalUsers: number;
  totalQuestions: number;
  totalSessions: number;
  newUsersThisWeek: number;
  newExamsThisWeek: number;
  avgScore: number;
  examsByStatus: { draft: number; processing: number; completed: number; failed: number };
}

export interface DashboardResponse {
  stats: DashboardStats;
  charts: { dailyExams: Array<{ date: string; count: number }> };
  recentActivity: Array<{
    id: string; title: string; user_email: string; status: string; created_at: string;
  }>;
}

export async function fetchDashboard(): Promise<DashboardResponse> {
  return apiFetch('/api/admin/dashboard');
}

// ── System Health ───────────────────────────────────
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  services: {
    database: { status: 'up' | 'down'; responseTime: number };
    redis: { status: 'connected' | 'degraded' | 'down'; mode: 'redis' | 'memory' };
    geminiApi: { status: 'reachable' | 'unreachable' };
    backend: { status: 'up'; uptime: number };
  };
  memory: { heapUsed: number; heapTotal: number; rss: number; external: number };
  timestamp: string;
}

export async function fetchSystemHealth(): Promise<HealthResponse> {
  return apiFetch('/api/admin/system/health');
}

// ── Monitoring ──────────────────────────────────────
export interface MonitoringResponse {
  examMetrics: {
    last24h: { success: number; failed: number; processing: number; successRate: number };
    avgGenerationTime: number;
  };
  distributions: {
    byQuestionType: Record<string, number>;
    byDifficulty: Record<string, number>;
  };
  hourlyActivity: Array<{ hour: string; count: number }>;
}

export async function fetchMonitoring(): Promise<MonitoringResponse> {
  return apiFetch('/api/admin/monitoring');
}

// ── Automation ──────────────────────────────────────
export interface AutomationResponse {
  status: 'running' | 'paused' | 'stopped';
  version: string;
  workflows: Array<{
    id: string; name: string; description: string; steps: number;
    status: string; lastRun: string | null; runCount: number;
  }>;
  businessRules: Array<{ name: string; description: string; priority: number; enabled: boolean }>;
  capabilities: string[];
}

export async function fetchAutomation(): Promise<AutomationResponse> {
  return apiFetch('/api/admin/automation');
}

// ── Alerts ──────────────────────────────────────────
export interface AlertItem {
  id: string; severity: 'info' | 'warning' | 'critical';
  title: string; message: string; timestamp: string; resolved: boolean;
}

export interface AlertsResponse {
  alerts: AlertItem[];
  summary: { total: number; critical: number; warning: number; info: number };
}

export async function fetchAlerts(): Promise<AlertsResponse> {
  return apiFetch('/api/admin/alerts');
}

// ── Queues ──────────────────────────────────────────
export interface QueuesResponse {
  queues: {
    processing: { count: number; oldest: { id: string; title: string; created_at: string } | null };
    pending: { count: number };
    failed: { count: number };
    completed: { count: number; avgTime: number };
  };
  redis: { mode: 'redis' | 'memory'; status: 'connected' | 'degraded' };
}

export async function fetchQueues(): Promise<QueuesResponse> {
  return apiFetch('/api/admin/queues');
}

// ── Users ───────────────────────────────────────────
export interface UsersResponse {
  users: Array<{
    id: string; email: string; fullName: string | null; username: string | null;
    role: string; createdAt: string;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function fetchUsers(page = 1, limit = 20, search?: string): Promise<UsersResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  return apiFetch(`/api/admin/users?${params}`);
}

// ── Exams ───────────────────────────────────────────
export interface ExamsResponse {
  exams: Array<{
    id: string; title: string; type: string; difficulty: string;
    numQuestions: number; userId: string; status: string; createdAt: string;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function fetchExams(page = 1, limit = 20): Promise<ExamsResponse> {
  return apiFetch(`/api/admin/exams?page=${page}&limit=${limit}`);
}

// ── Leaderboard ─────────────────────────────────────
export interface LeaderboardResponse {
  leaderboard: Array<{
    rank: number; userId: string; username: string; country: string | null;
    totalExams: number; averageScore: number; bestScore: number;
    currentStreak: number; longestStreak: number;
  }>;
}

export async function fetchLeaderboard(limit = 100): Promise<LeaderboardResponse> {
  return apiFetch(`/api/admin/leaderboard?limit=${limit}`);
}

// ── Activity ────────────────────────────────────────
export interface ActivityResponse {
  activities: Array<{
    type: string; id: string; userId: string;
    description: string; timestamp: string;
  }>;
}

export async function fetchActivity(limit = 50): Promise<ActivityResponse> {
  return apiFetch(`/api/admin/activity?limit=${limit}`);
}

// ── Stats ───────────────────────────────────────────
export interface StatsResponse {
  stats: {
    totalUsers: number; totalExams: number; totalSubmissions: number;
    totalDocuments: number; averageScore: number; passRate: number;
  };
}

export async function fetchStats(): Promise<StatsResponse> {
  return apiFetch('/api/admin/stats');
}

export default {
  loginAdmin, isLoggedIn, logoutAdmin,
  fetchDashboard, fetchSystemHealth, fetchMonitoring, fetchAutomation,
  fetchAlerts, fetchQueues, fetchUsers, fetchExams, fetchLeaderboard,
  fetchActivity, fetchStats,
};
