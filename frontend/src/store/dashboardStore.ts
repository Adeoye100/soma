import { create } from 'zustand';

type Theme = 'dark' | 'light';
type AccentColor = 'indigo' | 'green' | 'blue' | 'amber' | 'red';

export type PageView = 
  | 'overview' 
  | 'users' 
  | 'location' 
  | 'academic' 
  | 'exams' 
  | 'leaderboard' 
  | 'content' 
  | 'notifications' 
  | 'health' 
  | 'settings';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface DashboardState {
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  setNotifications: (notifications: Notification[]) => void;
  
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Array<{ id: string; name: string; email: string; avatar: string }>;
  setSearchResults: (results: Array<{ id: string; name: string; email: string; avatar: string }>) => void;
  
  dateRange: 'today' | '7d' | '30d' | 'custom';
  setDateRange: (range: 'today' | '7d' | '30d' | 'custom') => void;
  
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const loadPersistedTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('soma-theme') as Theme) || 'dark';
};

const loadPersistedAccent = (): AccentColor => {
  if (typeof window === 'undefined') return 'indigo';
  return (localStorage.getItem('soma-accent') as AccentColor) || 'indigo';
};

export const useDashboardStore = create<DashboardState>((set) => ({
  currentPage: 'overview',
  setCurrentPage: (page) => set({ currentPage: page }),
  
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
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
  
  accentColor: loadPersistedAccent(),
  setAccentColor: (color) => {
    localStorage.setItem('soma-accent', color);
    set({ accentColor: color });
  },
  
  notifications: [],
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    )
  })),
  setNotifications: (notifications) => set({ notifications }),
  
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  searchResults: [],
  setSearchResults: (results) => set({ searchResults: results }),
  
  dateRange: 'today',
  setDateRange: (range) => set({ dateRange: range }),
  
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
