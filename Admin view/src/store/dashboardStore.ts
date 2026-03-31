import { create } from 'zustand';
import type { PageView } from '@/types';
import api from '@/services/adminApi';
import type {
  DashboardResponse, HealthResponse, MonitoringResponse,
  AlertsResponse, QueuesResponse, UsersResponse,
  ExamsResponse, LeaderboardResponse, ActivityResponse,
  StatsResponse, AutomationResponse,
} from '@/services/adminApi';

type Theme = 'dark' | 'light';
type AccentColor = 'indigo' | 'green' | 'blue' | 'amber' | 'red';

interface DashboardState {
  // Navigation
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // Accent Color
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;

  // Auth
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;

  // Real data from API
  dashboard: DashboardResponse | null;
  health: HealthResponse | null;
  monitoring: MonitoringResponse | null;
  alerts: AlertsResponse | null;
  queues: QueuesResponse | null;
  users: UsersResponse | null;
  exams: ExamsResponse | null;
  leaderboard: LeaderboardResponse | null;
  activity: ActivityResponse | null;
  stats: StatsResponse | null;
  automation: AutomationResponse | null;

  // Loading
  isLoading: boolean;

  // Actions to fetch data
  fetchDashboard: () => Promise<void>;
  fetchHealth: () => Promise<void>;
  fetchMonitoring: () => Promise<void>;
  fetchAlerts: () => Promise<void>;
  fetchQueues: () => Promise<void>;
  fetchUsers: (page?: number, search?: string) => Promise<void>;
  fetchExams: (page?: number) => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  fetchActivity: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchAutomation: () => Promise<void>;
  fetchAll: () => Promise<void>;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Date range
  dateRange: 'today' | '7d' | '30d' | 'custom';
  setDateRange: (range: 'today' | '7d' | '30d' | 'custom') => void;
}

const loadPersistedTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('soma-theme') as Theme) || 'dark';
};

const loadPersistedAccent = (): AccentColor => {
  if (typeof window === 'undefined') return 'indigo';
  return (localStorage.getItem('soma-accent') as AccentColor) || 'indigo';
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Navigation
  currentPage: 'overview',
  setCurrentPage: (page) => set({ currentPage: page }),

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Theme
  theme: loadPersistedTheme(),
  setTheme: (theme) => { localStorage.setItem('soma-theme', theme); set({ theme }); },
  toggleTheme: () => set((s) => {
    const t = s.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('soma-theme', t);
    return { theme: t };
  }),

  // Accent
  accentColor: loadPersistedAccent(),
  setAccentColor: (c) => { localStorage.setItem('soma-accent', c); set({ accentColor: c }); },

  // Auth
  isAuthenticated: api.isLoggedIn(),
  login: async (email, password) => {
    const ok = await api.loginAdmin(email, password);
    if (ok) set({ isAuthenticated: true });
    return ok;
  },
  logout: () => { api.logoutAdmin(); set({ isAuthenticated: false }); },

  // Data (all null initially — pages show loading until first fetch)
  dashboard: null,
  health: null,
  monitoring: null,
  alerts: null,
  queues: null,
  users: null,
  exams: null,
  leaderboard: null,
  activity: null,
  stats: null,
  automation: null,
  isLoading: false,

  // ── Fetchers ──────────────────────────────────────
  fetchDashboard: async () => {
    try { set({ dashboard: await api.fetchDashboard() }); } catch { /* keep last */ }
  },
  fetchHealth: async () => {
    try { set({ health: await api.fetchSystemHealth() }); } catch { /* keep last */ }
  },
  fetchMonitoring: async () => {
    try { set({ monitoring: await api.fetchMonitoring() }); } catch { /* keep last */ }
  },
  fetchAlerts: async () => {
    try { set({ alerts: await api.fetchAlerts() }); } catch { /* keep last */ }
  },
  fetchQueues: async () => {
    try { set({ queues: await api.fetchQueues() }); } catch { /* keep last */ }
  },
  fetchUsers: async (page = 1, search) => {
    try { set({ users: await api.fetchUsers(page, 20, search) }); } catch { /* keep last */ }
  },
  fetchExams: async (page = 1) => {
    try { set({ exams: await api.fetchExams(page, 20) }); } catch { /* keep last */ }
  },
  fetchLeaderboard: async () => {
    try { set({ leaderboard: await api.fetchLeaderboard() }); } catch { /* keep last */ }
  },
  fetchActivity: async () => {
    try { set({ activity: await api.fetchActivity() }); } catch { /* keep last */ }
  },
  fetchStats: async () => {
    try { set({ stats: await api.fetchStats() }); } catch { /* keep last */ }
  },
  fetchAutomation: async () => {
    try { set({ automation: await api.fetchAutomation() }); } catch { /* keep last */ }
  },
  fetchAll: async () => {
    set({ isLoading: true });
    const s = get();
    await Promise.allSettled([
      s.fetchDashboard(),
      s.fetchHealth(),
      s.fetchMonitoring(),
      s.fetchAlerts(),
      s.fetchQueues(),
      s.fetchStats(),
      s.fetchActivity(),
      s.fetchLeaderboard(),
      s.fetchExams(),
      s.fetchUsers(),
      s.fetchAutomation(),
    ]);
    set({ isLoading: false });
  },

  // Search
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  // Date range
  dateRange: 'today',
  setDateRange: (r) => set({ dateRange: r }),
}));

// ── Polling ─────────────────────────────────────────
let pollingInterval: ReturnType<typeof setInterval> | null = null;

export function startPolling() {
  if (pollingInterval) return;
  pollingInterval = setInterval(() => {
    const s = useDashboardStore.getState();
    if (!s.isAuthenticated) return;
    // Refresh lightweight data every 30s
    s.fetchHealth();
    s.fetchAlerts();
    s.fetchQueues();
    s.fetchActivity();
  }, 30_000);
}

export function stopPolling() {
  if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
}
