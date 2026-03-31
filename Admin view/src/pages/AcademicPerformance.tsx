import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function AcademicPerformance() {
  const { monitoring, fetchMonitoring } = useDashboardStore();
  const byType = monitoring?.distributions?.byQuestionType || {};
  const byDiff = monitoring?.distributions?.byDifficulty || {};

  const totalQuestions = Object.values(byType).reduce((a, b) => a + b, 0);
  const totalDiff = Object.values(byDiff).reduce((a, b) => a + b, 0);

  const diffColors: Record<string, string> = { easy: 'bg-success', medium: 'bg-warning', hard: 'bg-danger' };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Academic Performance</h1>
          <p className="text-muted-foreground mt-1">Question and difficulty distributions from the database.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={fetchMonitoring}><RefreshCw className="w-4 h-4" /> Refresh</Button>
      </motion.div>

      {/* Question Type Distribution */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-surface p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4">Question Type Distribution</h3>
        {Object.keys(byType).length === 0 ? (
          <p className="text-muted-foreground text-sm">No question data available</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(byType).map(([type, count]) => {
              const pct = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0;
              return (
                <div key={type} className="p-4 rounded-xl bg-white/5 text-center">
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground mt-1">{type}</p>
                  <Badge variant="outline" className="mt-2 bg-primary/10 text-primary">{pct}%</Badge>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Difficulty Distribution */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-surface p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4">Difficulty Distribution</h3>
        {Object.keys(byDiff).length === 0 ? (
          <p className="text-muted-foreground text-sm">No difficulty data available</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(byDiff).map(([diff, count]) => {
              const pct = totalDiff > 0 ? Math.round((count / totalDiff) * 100) : 0;
              return (
                <div key={diff}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-foreground capitalize">{diff}</span>
                    <span className="text-sm text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full">
                    <div className={`h-full rounded-full ${diffColors[diff] || 'bg-primary'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Success Rate Overview */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Completed (24h)', value: monitoring?.examMetrics.last24h.success ?? 0, color: 'text-success' },
          { label: 'Failed (24h)', value: monitoring?.examMetrics.last24h.failed ?? 0, color: 'text-danger' },
          { label: 'Success Rate', value: `${monitoring?.examMetrics.last24h.successRate ?? 0}%`, color: 'text-primary' },
        ].map(s => (
          <div key={s.label} className="card-surface p-4 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
