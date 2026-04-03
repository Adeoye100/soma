import { create } from 'zustand';
import type { 
  User, Activity, KPIData, TimeSeriesData, Notification, 
  PageView, SystemHealth 
} from '@/types';
import { 
  mockUsers, mockActivities, kpiData, timeSeriesData, 
  mockNotifications, systemHealthData, generateActivity 
} from '@/data/mockData';

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
  
  // Data
  users: User[];
  activities: Activity[];
  kpiData: KPIData;
  timeSeriesData: TimeSeriesData[];
  notifications: Notification[];
  systemHealth: SystemHealth;
  
  // Real-time updates
  updateKPIData: (data: Partial<KPIData>) => void;
  addActivity: (activity: Activity) => void;
  markNotificationRead: (id: string) => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: User[];
  
  // Date range
  dateRange: 'today' | '7d' | '30d' | 'custom';
  setDateRange: (range: 'today' | '7d' | '30d' | 'custom') => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

// Load persisted preferences from localStorage
const loadPersistedTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('soma-theme') as Theme) || 'dark';
};

const loadPersistedAccent = (): AccentColor => {
  if (typeof window === 'undefined') return 'indigo';
  return (localStorage.getItem('soma-accent') as AccentColor) || 'indigo';
};

export const useDashboardStore = create<DashboardState>((set) => ({
  // Navigation
  currentPage: 'overview',
  setCurrentPage: (page) => set({ currentPage: page }),
  
  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  // Theme
  theme: loadPersistedTheme(),
  setTheme: (theme) => {
    localStorage.setItem('soma-theme', theme);
    set({ theme });
  },
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('soma-theme', newTheme);
    return { theme: newTheme };
  }),
  
  // Accent Color
  accentColor: loadPersistedAccent(),
  setAccentColor: (color) => {
    localStorage.setItem('soma-accent', color);
    set({ accentColor: color });
  },
  
  // Data
  users: mockUsers,
  activities: mockActivities,
  kpiData: kpiData,
  timeSeriesData: timeSeriesData,
  notifications: mockNotifications,
  systemHealth: systemHealthData,
  
  // Real-time updates
  updateKPIData: (data) => set((state) => ({
    kpiData: { ...state.kpiData, ...data }
  })),
  
  addActivity: (activity) => set((state) => ({
    activities: [activity, ...state.activities].slice(0, 50)
  })),
  
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    )
  })),
  
  // Search
  searchQuery: '',
  setSearchQuery: (query) => {
    set({ searchQuery: query });
    if (query.trim()) {
      const results = mockUsers.filter(u => 
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10);
      set({ searchResults: results });
    } else {
      set({ searchResults: [] });
    }
  },
  searchResults: [],
  
  // Date range
  dateRange: 'today',
  setDateRange: (range) => set({ dateRange: range }),
  
  // Loading states
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));

// Simulate real-time updates
let activityCounter = 50;

export const startRealtimeSimulation = () => {
  const interval = setInterval(() => {
    const store = useDashboardStore.getState();
    
    // Add new activity
    const newActivity = generateActivity(`activity-${activityCounter++}`);
    store.addActivity(newActivity);
    
    // Update KPI data with small random changes
    const currentKPI = store.kpiData;
    store.updateKPIData({
      activeNow: currentKPI.activeNow + Math.floor(Math.random() * 20 - 10),
      sessionsToday: currentKPI.sessionsToday + Math.floor(Math.random() * 5),
    });
  }, 5000);
  
  return () => clearInterval(interval);
};
