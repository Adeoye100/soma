import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Overview } from '@/pages/Overview';
import { LocationIntelligence } from '@/pages/LocationIntelligence';
import { AcademicPerformance } from '@/pages/AcademicPerformance';
import { Leaderboard } from '@/pages/Leaderboard';
import { ExamAnalytics } from '@/pages/ExamAnalytics';
import { UserManagement } from '@/pages/UserManagement';
import { Notifications } from '@/pages/Notifications';
import { SystemHealth } from '@/pages/SystemHealth';
import { Settings } from '@/pages/Settings';
import { ContentManagement } from '@/pages/ContentManagement';
import { useDashboardStore, startRealtimeSimulation } from '@/store/dashboardStore';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const { currentPage, sidebarCollapsed } = useDashboardStore();

  useEffect(() => {
    // Start real-time simulation
    const cleanup = startRealtimeSimulation();
    return cleanup;
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <Overview />;
      case 'users':
        return <UserManagement />;
      case 'location':
        return <LocationIntelligence />;
      case 'academic':
        return <AcademicPerformance />;
      case 'exams':
        return <ExamAnalytics />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'content':
        return <ContentManagement />;
      case 'notifications':
        return <Notifications />;
      case 'health':
        return <SystemHealth />;
      case 'settings':
        return <Settings />;
      default:
        return <Overview />;
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Mobile Navigation */}
        <MobileNav />

        {/* Main Content */}
        <div 
          className="transition-all duration-300 lg:ml-0"
          style={{ 
            marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024 
              ? (sidebarCollapsed ? '80px' : '240px') 
              : '0',
          }}
        >
          {/* Topbar - hidden on mobile */}
          <div className="hidden lg:block">
            <Topbar />
          </div>

          {/* Mobile Header */}
          <div className="lg:hidden h-16 bg-background border-b border-border flex items-center px-4 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="font-bold text-lg text-foreground">Soma</h1>
                <p className="text-[10px] text-muted-foreground">EDTECH ADMIN</p>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <main className="p-4 lg:p-6 pb-24 lg:pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* Toast Notifications */}
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            },
          }}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
