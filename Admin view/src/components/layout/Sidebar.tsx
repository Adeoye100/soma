import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { 
  LayoutDashboard, Users, MapPin, GraduationCap, 
  FileText, Trophy, BookOpen, Bell, Activity, 
  Settings, ChevronLeft, ChevronRight, BookMarked
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import type { PageView } from '@/types';

interface NavItem {
  id: PageView;
  label: string;
  icon: LucideIcon;
  section?: string;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users & Sessions', icon: Users },
  { id: 'location', label: 'Location Intelligence', icon: MapPin },
  { id: 'academic', label: 'Academic Performance', icon: GraduationCap },
  { id: 'exams', label: 'Exam Analytics', icon: FileText },
  { id: 'leaderboard', label: 'Leaderboards', icon: Trophy },
  { id: 'content', label: 'Content Management', icon: BookOpen, section: 'MANAGEMENT' },
  { id: 'notifications', label: 'Notifications & Alerts', icon: Bell },
  { id: 'health', label: 'System Health', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar } = useDashboardStore();

  return (
    <motion.aside
      initial={{ width: 240 }}
      animate={{ width: sidebarCollapsed ? 80 : 240 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <motion.div 
          className="flex items-center gap-3"
          animate={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <h1 className="font-bold text-lg text-white">Soma</h1>
              <p className="text-xs text-muted-foreground">EDTECH ADMIN</p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const showSection = item.section && !sidebarCollapsed;
          
          return (
            <div key={item.id}>
              {showSection && (
                <div className="mt-6 mb-2 px-3">
                  <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">
                    {item.section}
                  </span>
                </div>
              )}
              <motion.button
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 mb-1 ${
                  isActive 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}
                  >
                    {item.label}
                  </motion.span>
                )}
              </motion.button>
            </div>
          );
        })}
      </nav>

      {/* Admin Profile */}
      <div className="p-3 border-t border-sidebar-border">
        <motion.button
          className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
          whileHover={{ scale: 1.02 }}
        >
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin"
            alt="Admin"
            className="w-9 h-9 rounded-full bg-primary/20"
          />
          {!sidebarCollapsed && (
            <div className="text-left">
              <p className="text-sm font-medium text-sidebar-foreground">Chidi Obi</p>
              <p className="text-xs text-sidebar-foreground/60">Senior Admin</p>
            </div>
          )}
        </motion.button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-3 h-3 text-white" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-white" />
        )}
      </button>
    </motion.aside>
  );
}
