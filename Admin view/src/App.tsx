import { useEffect, useState } from 'react';
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
import { useDashboardStore, startPolling, stopPolling } from '@/store/dashboardStore';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail } from 'lucide-react';

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useDashboardStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (!ok) setError('Invalid credentials or not an admin.');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm card-surface p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">Soma Admin</h1>
            <p className="text-xs text-muted-foreground">Sign in to continue</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="pl-10 bg-white/5 border-white/[0.07]"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 bg-white/5 border-white/[0.07]"
                required
              />
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

function App() {
  const { currentPage, sidebarCollapsed, isAuthenticated, fetchAll } = useDashboardStore();
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { stopPolling(); setDataLoaded(false); return; }
    fetchAll().then(() => setDataLoaded(true));
    startPolling();
    return () => stopPolling();
  }, [isAuthenticated]);

  if (!isAuthenticated) return <ThemeProvider><LoginScreen /><Toaster /></ThemeProvider>;

  if (!dataLoaded) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-white text-lg">S</span>
            </div>
            <p className="text-muted-foreground">Loading admin dashboard…</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'overview': return <Overview />;
      case 'users': return <UserManagement />;
      case 'location': return <LocationIntelligence />;
      case 'academic': return <AcademicPerformance />;
      case 'exams': return <ExamAnalytics />;
      case 'leaderboard': return <Leaderboard />;
      case 'content': return <ContentManagement />;
      case 'notifications': return <Notifications />;
      case 'health': return <SystemHealth />;
      case 'settings': return <Settings />;
      default: return <Overview />;
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        <div className="hidden lg:block"><Sidebar /></div>
        <MobileNav />
        <div
          className="transition-all duration-300 lg:ml-0"
          style={{
            marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024
              ? (sidebarCollapsed ? '80px' : '240px') : '0',
          }}
        >
          <div className="hidden lg:block"><Topbar /></div>
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
        <Toaster
          position="bottom-right"
          toastOptions={{ style: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' } }}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
