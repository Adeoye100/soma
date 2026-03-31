import { motion } from 'framer-motion';
import { KPICard } from '@/components/KPICard';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { TrafficSourcesChart } from '@/components/charts/TrafficSourcesChart';
import { ActivityFeed } from '@/components/ActivityFeed';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/button';
import { Download, Calendar, RefreshCw } from 'lucide-react';

export function Overview() {
  const { dashboard, stats, fetchDashboard, fetchStats, fetchActivity } = useDashboardStore();
  const s = stats?.stats;
  const d = dashboard?.stats;

  const kpiCards = [
    { title: 'Total Users', value: (s?.totalUsers ?? d?.totalUsers ?? 0).toLocaleString(), subtitle: `${d?.newUsersThisWeek ?? 0} new this week`, change: 0, icon: 'users' as const },
    { title: 'Total Exams', value: (s?.totalExams ?? d?.totalExams ?? 0).toLocaleString(), subtitle: `${d?.newExamsThisWeek ?? 0} new this week`, change: 0, icon: 'exams' as const },
    { title: 'Submissions', value: (s?.totalSubmissions ?? d?.totalSessions ?? 0).toLocaleString(), subtitle: 'All time', change: 0, icon: 'sessions' as const },
    { title: 'Avg Score', value: `${s?.averageScore ?? d?.avgScore ?? 0}%`, subtitle: 'Platform average', change: 0, icon: 'passRate' as const },
    { title: 'Pass Rate', value: `${s?.passRate ?? 0}%`, subtitle: 'All submissions', change: 0, icon: 'passRate' as const },
    { title: 'Documents', value: (s?.totalDocuments ?? 0).toLocaleString(), subtitle: 'Uploaded files', change: 0, icon: 'countries' as const },
  ];

  const handleRefresh = () => { fetchDashboard(); fetchStats(); fetchActivity(); };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Platform Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Real data from Soma backend.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <Button variant="outline" className="gap-2 bg-muted border-border hover:bg-muted/80 w-full sm:w-auto" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card, index) => (
          <KPICard key={card.title} {...card} index={index} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3"><ActivityChart /></div>
        <div className="lg:col-span-2"><TrafficSourcesChart /></div>
      </div>

      <ActivityFeed />
    </div>
  );
}
