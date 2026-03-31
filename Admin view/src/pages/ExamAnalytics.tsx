import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DIFF_COLORS: Record<string, string> = { easy: '#22C55E', medium: '#F59E0B', hard: '#EF4444' };

export function ExamAnalytics() {
  const { monitoring, dashboard, fetchMonitoring, fetchDashboard } = useDashboardStore();
  const m = monitoring?.examMetrics;
  const byType = monitoring?.distributions?.byQuestionType || {};
  const byDiff = monitoring?.distributions?.byDifficulty || {};
  const hourly = monitoring?.hourlyActivity || [];

  const diffChart = Object.entries(byDiff).map(([name, count]) => ({ name, count, color: DIFF_COLORS[name] || '#6C63FF' }));
  const maxHourly = Math.max(...hourly.map(h => h.count), 1);

  const handleRefresh = () => { fetchMonitoring(); fetchDashboard(); };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Exam Analytics</h1>
          <p className="text-muted-foreground mt-1">Real exam generation metrics from the last 24 hours.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleRefresh}><RefreshCw className="w-4 h-4" /> Refresh</Button>
      </motion.div>

      {/* Key Metrics */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Success Rate (24h)', value: `${m?.last24h.successRate ?? 0}%`, icon: TrendingUp, color: 'text-success' },
          { label: 'Completed (24h)', value: m?.last24h.success ?? 0, icon: BarChart3, color: 'text-primary' },
          { label: 'Failed (24h)', value: m?.last24h.failed ?? 0, icon: BarChart3, color: 'text-danger' },
          { label: 'Avg Gen Time', value: `${m?.avgGenerationTime ?? 0}s`, icon: Clock, color: 'text-warning' },
        ].map((metric) => (
          <div key={metric.label} className="card-surface p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-white/5 ${metric.color}`}><metric.icon className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="text-xl font-bold text-foreground">{metric.value}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Difficulty Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-surface p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Difficulty Distribution</h3>
          {diffChart.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={diffChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={({ active, payload }: any) => {
                    if (active && payload?.length) {
                      return <div className="bg-card border border-white/[0.07] rounded-xl p-3 shadow-xl">
                        <p className="text-sm font-medium text-foreground capitalize">{payload[0].payload.name}</p>
                        <p className="text-lg font-bold text-foreground">{payload[0].value} questions</p>
                      </div>;
                    }
                    return null;
                  }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {diffChart.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Question Types */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-surface p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Question Type Breakdown</h3>
          {Object.keys(byType).length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(byType).map(([type, count]) => {
                const total = Object.values(byType).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{type}</span>
                      <span className="text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Hourly Activity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card-surface p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4">Hourly Activity (Last 24h)</h3>
        {hourly.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No activity in the last 24 hours</div>
        ) : (
          <div className="space-y-1">
            {hourly.map((entry) => (
              <div key={entry.hour} className="flex items-center gap-2">
                <span className="text-xs w-16 text-muted-foreground font-mono">{entry.hour.split(' ')[1] || entry.hour.slice(-5)}</span>
                <div className="flex-1 bg-white/10 rounded h-6"><div className="bg-blue-600 rounded h-full" style={{ width: `${(entry.count / maxHourly) * 100}%` }} /></div>
                <span className="text-xs text-muted-foreground w-8 text-right">{entry.count}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
