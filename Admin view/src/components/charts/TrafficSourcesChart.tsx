import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { cn } from '@/lib/utils';

const COLORS = ['#6C63FF', '#22C55E', '#F59E0B', '#3B82F6', '#EF4444', '#EC4899'];

export function TrafficSourcesChart() {
  const { monitoring } = useDashboardStore();
  const byType = monitoring?.distributions?.byQuestionType || {};

  const total = Object.values(byType).reduce((a, b) => a + b, 0);
  const chartData = Object.entries(byType).map(([name, value], i) => ({
    name,
    value,
    percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.4 }} className="card-surface p-5 h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Question Type Distribution</h3>
        <p className="text-sm text-muted-foreground">Across all questions in database</p>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">No data available</div>
      ) : (
        <>
          <div className="w-full h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" animationDuration={1500}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={({ active, payload }: any) => {
                  if (active && payload?.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-card border border-white/[0.07] rounded-xl p-3 shadow-xl">
                        <p className="text-sm font-medium text-white">{d.name}</p>
                        <p className="text-lg font-bold text-white">{d.percentage}%</p>
                        <p className="text-xs text-muted-foreground">{d.value} questions</p>
                      </div>
                    );
                  }
                  return null;
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-4">
            {chartData.map((source, index) => (
              <motion.div key={source.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                  <span className="text-sm text-foreground">{source.name}</span>
                </div>
                <span className="text-sm font-medium text-foreground">{source.percentage}%</span>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
