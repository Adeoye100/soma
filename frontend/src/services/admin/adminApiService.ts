import { supabase } from '../supabase';

export interface DashboardStats {
  totalExams: number;
  totalUsers: number;
  totalQuestions: number;
  totalSessions: number;
  newUsersThisWeek: number;
  newExamsThisWeek: number;
  avgScore: number;
  examsByStatus: {
    draft: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

export interface DashboardResponse {
  stats: DashboardStats;
  charts: {
    dailyExams: Array<{ date: string; count: number }>;
  };
  recentActivity: Array<{
    id: string;
    title: string;
    user_email: string;
    status: string;
    created_at: string;
  }>;
}

export interface SystemHealthResponse {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  services: {
    database: { status: 'up' | 'down'; responseTime: number };
    redis: { status: 'connected' | 'degraded' | 'down'; mode: 'redis' | 'memory' };
    geminiApi: { status: 'reachable' | 'unreachable' };
    backend: { status: 'up'; uptime: number };
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  timestamp: string;
}

export interface MonitoringResponse {
  examMetrics: {
    last24h: {
      success: number;
      failed: number;
      processing: number;
      successRate: number;
    };
    avgGenerationTime: number;
  };
  distributions: {
    byQuestionType: Record<string, number>;
    byDifficulty: Record<string, number>;
  };
  hourlyActivity: Array<{ hour: string; count: number }>;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  steps: number;
  status: string;
  lastRun: string | null;
  runCount: number;
}

export interface BusinessRule {
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
}

export interface AutomationResponse {
  status: 'running' | 'paused' | 'stopped';
  version: string;
  workflows: AutomationWorkflow[];
  businessRules: BusinessRule[];
  capabilities: string[];
}

export interface SystemInfoResponse {
  node: { version: string; platform: string; arch: string; pid: number };
  environment: string;
  backend: { version: string; port: number; uploadPath: string; maxFileSize: number };
  database: { provider: string; region: string; tables: string[] };
  features: { redis: boolean; gemini: boolean; rateLimit: boolean; throttling: boolean };
}

export interface AlertItem {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  metadata?: Record<string, unknown>;
}

export interface AlertsResponse {
  alerts: AlertItem[];
  summary: { total: number; critical: number; warning: number; info: number };
}

export interface ConfigurationResponse {
  exam: {
    maxQuestionsPerExam: number;
    minQuestionsPerExam: number;
    defaultDifficulty: string;
    supportedTypes: string[];
    maxFileSizeMB: number;
  };
  ai: { provider: string; model: string; configured: boolean };
  security: { jwtExpiration: string; rateLimitRequests: number; throttleLimit: number };
  storage: { uploadPath: string; redis: { enabled: boolean; mode: 'redis' | 'memory' } };
}

export interface QueuesResponse {
  queues: {
    processing: {
      count: number;
      oldest: { id: string; title: string; created_at: string } | null;
    };
    pending: { count: number };
    failed: { count: number };
    completed: { count: number; avgTime: number };
  };
  redis: { mode: 'redis' | 'memory'; status: 'connected' | 'degraded' };
}

export interface KPIResponse {
  activeNow: number;
  activeNowChange: number;
  sessionsToday: number;
  sessionsChange: number;
  passRate: number;
  passRateChange: number;
  examsTaken: number;
  examsChange: number;
  avgDuration: number;
  durationChange: number;
  countries: number;
  countriesChange: number;
  totalUsers: number;
}

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userCountry: string;
  action: string;
  subject: string;
  score?: number;
  status: string;
  timestamp: string;
}

export interface UsersListResponse {
  users: Array<{
    id: string;
    name: string;
    email: string;
    avatar: string;
    country: string;
    countryCode: string;
    role: string;
    status: string;
    joinedAt: string;
    lastActive: string;
    totalScore: number;
    passRate: number;
    examsCompleted: number;
    streak: number;
    badges: Array<{ id: string; name: string; icon: string; earnedAt: string }>;
  }>;
  total: number;
  page: number;
  limit: number;
}

export interface UserStatsResponse {
  total: number;
  active: number;
  new30d: number;
  churnRate: number;
  growth: Array<{ month: string; users: number }>;
}

export interface LocationsResponse {
  countries: Array<{
    rank: number;
    country: string;
    flag: string;
    users: number;
    exams: number;
    passRate: number;
    coordinates: [number, number];
  }>;
  regions: Array<{ name: string; value: number; percentage: number; color: string }>;
  heatmapData: Array<{ day: string; hour: number; value: number }>;
}

export interface AcademicResponse {
  scoreDistribution: Array<{ range: string; count: number; color: string }>;
  funnel: Array<{ stage: string; count: number; percentage: number }>;
  subjectPerformance: Array<{ subject: string; thisMonth: number; lastMonth: number }>;
  performanceTrends: Array<Record<string, unknown>>;
}

export interface ExamAnalyticsItem {
  examId: string;
  examName: string;
  totalAttempts: number;
  passRate: number;
  avgTime: number;
  retakeRate: number;
  hardestQuestions: Array<{ questionId: string; questionText: string; failRate: number }>;
  skippedQuestions: Array<{ questionId: string; questionText: string; skipCount: number }>;
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    country: string;
    countryCode: string;
    role: string;
    status: string;
    joinedAt: string;
    lastActive: string;
    totalScore: number;
    passRate: number;
    examsCompleted: number;
    streak: number;
    badges: Array<{ id: string; name: string; icon: string; earnedAt: string }>;
  };
  totalScore: number;
  passRate: number;
  examsCompleted: number;
  streak: number;
}

export interface TimeSeriesItem {
  time: string;
  activeSessions: number;
  examAttempts: number;
}

export interface TrafficSource {
  name: string;
  value: number;
  percentage: number;
  change: number;
  color: string;
}

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

  static async getDashboard(): Promise<DashboardResponse> {
    return this.request('/api/admin/dashboard');
  }

  static async getSystemHealth(): Promise<SystemHealthResponse> {
    return this.request('/api/admin/system/health');
  }

  static async getMonitoring(): Promise<MonitoringResponse> {
    return this.request('/api/admin/monitoring');
  }

  static async getAutomation(): Promise<AutomationResponse> {
    return this.request('/api/admin/automation');
  }

  static async getWorkflows(): Promise<AutomationResponse> {
    return this.getAutomation();
  }

  static async getSystemInfo(): Promise<SystemInfoResponse> {
    return this.request('/api/admin/system/info');
  }

  static async getAlerts(): Promise<AlertsResponse> {
    return this.request('/api/admin/alerts');
  }

  static async getConfiguration(): Promise<ConfigurationResponse> {
    return this.request('/api/admin/configuration');
  }

  static async getQueues(): Promise<QueuesResponse> {
    return this.request('/api/admin/queues');
  }

  static async getKPI(): Promise<KPIResponse> {
    return this.request('/api/admin/kpi');
  }

  static async getActivities(): Promise<ActivityItem[]> {
    return this.request('/api/admin/activities');
  }

  static async getUsers(params: { page?: number; limit?: number; search?: string; status?: string } = {}): Promise<UsersListResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.status) searchParams.append('status', params.status);
    const qs = searchParams.toString();
    return this.request(`/api/admin/users${qs ? `?${qs}` : ''}`);
  }

  static async getUserStats(): Promise<UserStatsResponse> {
    return this.request('/api/admin/users/stats');
  }

  static async getLocations(): Promise<LocationsResponse> {
    return this.request('/api/admin/locations');
  }

  static async getAcademic(): Promise<AcademicResponse> {
    return this.request('/api/admin/academic');
  }

  static async getExamAnalytics(): Promise<ExamAnalyticsItem[]> {
    return this.request('/api/admin/exams/analytics');
  }

  static async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return this.request('/api/admin/leaderboard');
  }

  static async getTimeSeries(): Promise<TimeSeriesItem[]> {
    return this.request('/api/admin/time-series');
  }

  static async getTrafficSources(): Promise<TrafficSource[]> {
    return this.request('/api/admin/traffic-sources');
  }
}
