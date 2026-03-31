import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import { AdminApiService } from '../../services/admin/adminApiService';
import type { AcademicResponse } from '../../services/admin/adminApiService';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Download, Filter, TrendingUp, Users, Target } from 'lucide-react';

export function AcademicPerformance() {
  const [timeWindow, setTimeWindow] = useState<'7d' | '30d' | '90d' | 'all'>('7d');
  const [academicData, setAcademicData] = useState<AcademicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAcademic = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await AdminApiService.getAcademic();
        setAcademicData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch academic data');
      } finally {
        setLoading(false);
      }
    };
    fetchAcademic();
  }, []);

  const subjectPerformance = academicData?.subjectPerformance ?? [];
  const scoreDistribution = academicData?.scoreDistribution ?? [];
  const performanceTrends = academicData?.performanceTrends ?? [];
  const funnelData = academicData?.funnel ?? [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-white/[0.07] rounded-xl p-3 shadow-xl">
          <p className="text-sm font-medium text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-muted-foreground">
                {entry.name}:
              </span>
              <span className="text-sm font-medium text-white">
                {entry.value}%
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-surface p-6 border border-danger/20">
        <p className="text-danger font-medium">Error loading academic data</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Academic Performance</h1>
          <p className="text-muted-foreground mt-1">
            Subject-wise performance metrics and student progress analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2 bg-white/5 border-white/[0.07] hover:bg-white/10"
          >
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button
            variant="outline"
            className="gap-2 bg-white/5 border-white/[0.07] hover:bg-white/10"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Pass Rate by Subject */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-surface p-5"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Pass Rate by Subject</h3>
            <p className="text-sm text-muted-foreground">
              Comparison between this month and last month
            </p>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            <TrendingUp className="w-3 h-3 mr-1" />
            +2.1% avg
          </Badge>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectPerformance} barGap={8}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="subject"
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={50}
                stroke="#F59E0B"
                strokeDasharray="5 5"
                label={{ value: 'Pass Threshold', fill: '#F59E0B', fontSize: 10, position: 'right' }}
              />
              <Bar
                dataKey="lastMonth"
                name="Last Month"
                fill="rgba(108, 99, 255, 0.3)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="thisMonth"
                name="This Month"
                fill="#6C63FF"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Two Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-surface p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Score Distribution</h3>
              <p className="text-sm text-muted-foreground">
                Student performance across score ranges
              </p>
            </div>
          </div>

          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scoreDistribution}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                    <stop offset="30%" stopColor="#F59E0B" stopOpacity={0.6}/>
                    <stop offset="60%" stopColor="#22C55E" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="range"
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card border border-white/[0.07] rounded-xl p-3 shadow-xl">
                          <p className="text-sm font-medium text-white">
                            Score: {payload[0].payload.range}
                          </p>
                          <p className="text-lg font-bold text-white">
                            {payload[0].value} students
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="url(#scoreGradient)"
                  fill="url(#scoreGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Performance Over Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-surface p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Performance Over Time</h3>
              <p className="text-sm text-muted-foreground">
                Subject trends across selected period
              </p>
            </div>
            <Tabs value={timeWindow} onValueChange={(v) => setTimeWindow(v as any)}>
              <TabsList className="bg-white/5">
                <TabsTrigger value="7d" className="text-xs">7D</TabsTrigger>
                <TabsTrigger value="30d" className="text-xs">30D</TabsTrigger>
                <TabsTrigger value="90d" className="text-xs">90D</TabsTrigger>
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceTrends as any[]}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="mathematics" stroke="#6C63FF" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="english" stroke="#22C55E" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="biology" stroke="#F59E0B" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="chemistry" stroke="#EF4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4">
            {[
              { name: 'Mathematics', color: '#6C63FF' },
              { name: 'English', color: '#22C55E' },
              { name: 'Biology', color: '#F59E0B' },
              { name: 'Chemistry', color: '#EF4444' },
            ].map((subject) => (
              <div key={subject.name} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-1 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                <span className="text-xs text-muted-foreground">{subject.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Exam Completion Funnel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card-surface p-5"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Exam Completion Funnel</h3>
            <p className="text-sm text-muted-foreground">
              Student journey from enrollment to distinction
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Total: {funnelData[0]?.count?.toLocaleString() ?? 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-success" />
              <span className="text-sm text-success">
                Conversion: {funnelData[funnelData.length - 1]?.percentage ?? 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="flex items-end justify-center gap-4 h-[200px]">
            {funnelData.map((stage, index) => {
              const width = 100 - index * 15;
              const dropOff = index > 0 && funnelData[index - 1]
                ? ((funnelData[index - 1].count - stage.count) / funnelData[index - 1].count * 100).toFixed(1)
                : null;

              return (
                <motion.div
                  key={stage.stage}
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                  className="flex flex-col items-center"
                  style={{ width: `${width}%` }}
                >
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-primary/40 to-primary/20 border border-primary/30 relative group cursor-pointer hover:from-primary/60 hover:to-primary/40 transition-all"
                    style={{ height: `${(stage.count / (funnelData[0]?.count || 1)) * 180}px` }}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-lg font-bold text-white">{stage.count.toLocaleString()}</span>
                      <span className="text-xs text-white/70">{stage.percentage}%</span>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-sm font-medium text-white">{stage.stage}</p>
                    <p className="text-xs text-muted-foreground">
                      {stage.count.toLocaleString()}
                    </p>
                    {dropOff && (
                      <p className="text-xs text-danger mt-0.5">
                        -{dropOff}% drop-off
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
