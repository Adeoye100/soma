import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LocationIntelligence() {
  const { dashboard, stats, fetchDashboard, fetchStats } = useDashboardStore();

  // Derive a simple region view from real data
  const totalUsers = stats?.stats?.totalUsers ?? dashboard?.stats?.totalUsers ?? 0;
  const totalExams = stats?.stats?.totalExams ?? dashboard?.stats?.totalExams ?? 0;

  const dailyExams = dashboard?.charts?.dailyExams || [];
  const maxDaily = Math.max(...dailyExams.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Platform Activity</h1>
          <p className="text-muted-foreground mt-1">Daily exam generation trends from real data.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => { fetchDashboard(); fetchStats(); }}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </motion.div>

      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: totalUsers.toLocaleString() },
          { label: 'Total Exams', value: totalExams.toLocaleString() },
          { label: 'Total Questions', value: (stats?.stats?.totalQuestions ?? 0).toLocaleString() },
          { label: 'Sessions', value: (stats?.stats?.totalSubmissions ?? 0).toLocaleString() },
        ].map(s => (
          <div key={s.label} className="card-surface p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Daily chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-surface p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4">Daily Exam Generation (Last 30 Days)</h3>
        {dailyExams.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No exam data available yet</div>
        ) : (
          <div className="space-y-1">
            {dailyExams.slice(-14).map((entry) => (
              <div key={entry.date} className="flex items-center gap-2">
                <span className="text-xs w-16 text-muted-foreground font-mono">{entry.date.slice(5)}</span>
                <div className="flex-1 bg-white/10 rounded h-5"><div className="bg-primary rounded h-full" style={{ width: `${(entry.count / maxDaily) * 100}%` }} /></div>
                <span className="text-xs text-muted-foreground w-8 text-right">{entry.count}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Activity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-surface p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Exams</h3>
        <div className="space-y-2">
          {(dashboard?.recentActivity || []).slice(0, 10).map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div>
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.user_email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={
                  a.status === 'completed' ? 'bg-success/10 text-success' : a.status === 'processing' ? 'bg-warning/10 text-warning' : a.status === 'failed' ? 'bg-danger/10 text-danger' : 'bg-muted text-muted-foreground'
                }>{a.status}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {(!dashboard?.recentActivity || dashboard.recentActivity.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No recent exams</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
