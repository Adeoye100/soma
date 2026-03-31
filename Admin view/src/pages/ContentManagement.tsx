import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, FileText, BookOpen } from 'lucide-react';

export function ContentManagement() {
  const { dashboard, stats, fetchDashboard, fetchStats } = useDashboardStore();

  const totalExams = stats?.stats?.totalExams ?? dashboard?.stats?.totalExams ?? 0;
  const totalQuestions = stats?.stats?.totalQuestions ?? dashboard?.stats?.totalQuestions ?? 0;
  const totalDocs = stats?.stats?.totalDocuments ?? 0;
  const recentExams = dashboard?.recentActivity || [];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Content Overview</h1>
          <p className="text-muted-foreground mt-1">Platform content metrics from real data.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => { fetchDashboard(); fetchStats(); }}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Exams', value: totalExams.toLocaleString(), icon: FileText, color: 'text-primary' },
          { label: 'Total Questions', value: totalQuestions.toLocaleString(), icon: BookOpen, color: 'text-success' },
          { label: 'Documents', value: totalDocs.toLocaleString(), icon: FileText, color: 'text-warning' },
          { label: 'Sessions', value: (stats?.stats?.totalSubmissions ?? 0).toLocaleString(), icon: FileText, color: 'text-muted-foreground' },
        ].map((stat) => (
          <div key={stat.label} className="card-surface p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10"><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Recent Exams Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.07]">
          <h3 className="text-lg font-semibold text-foreground">Recent Exams</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/5">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Title</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">User</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Created</th>
            </tr>
          </thead>
          <tbody>
            {recentExams.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No exams yet</td></tr>
            ) : recentExams.map((exam) => (
              <tr key={exam.id} className="border-b border-white/[0.05] hover:bg-white/5 transition-colors">
                <td className="py-3 px-4"><span className="text-sm font-medium text-foreground">{exam.title}</span></td>
                <td className="py-3 px-4"><span className="text-sm text-muted-foreground">{exam.user_email}</span></td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className={
                    exam.status === 'completed' ? 'bg-success/10 text-success' :
                    exam.status === 'processing' ? 'bg-warning/10 text-warning' :
                    exam.status === 'failed' ? 'bg-danger/10 text-danger' : 'bg-muted text-muted-foreground'
                  }>{exam.status}</Badge>
                </td>
                <td className="py-3 px-4"><span className="text-sm text-muted-foreground">{new Date(exam.created_at).toLocaleDateString()}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
