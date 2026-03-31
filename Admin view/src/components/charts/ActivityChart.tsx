import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboardStore } from '@/store/dashboardStore';
import { Badge } from '@/components/ui/badge';

export function ActivityChart() {
  const { monitoring } = useDashboardStore();
  const hourly = monitoring?.hourlyActivity || [];

  const chartData = hourly.map((h) => ({
    time: h.hour.split(' ')[1] || h.hour.slice(-5),
    exams: h.count,
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }} className="card-surface p-5 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Exam Activity (24h)</h3>
          <p className="text-sm text-muted-foreground">Hourly exam generation from database</p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Live</Badge>
      </div>

      <div className="h-[280px]">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No activity in the last 24 hours</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorExam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={({ active, payload, label }: any) => {
                if (active && payload?.length) {
                  return (
                    <div className="bg-card border border-white/[0.07] rounded-xl p-3 shadow-xl">
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-lg font-bold text-primary">{payload[0].value} exams</p>
                    </div>
                  );
                }
                return null;
              }} />
              <Area type="monotone" dataKey="exams" name="Exams" stroke="#6C63FF" strokeWidth={2} fillOpacity={1} fill="url(#colorExam)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
