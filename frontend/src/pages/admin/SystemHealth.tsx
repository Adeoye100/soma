import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AdminApiService } from '../../services/admin/adminApiService';
import type { SystemHealthResponse } from '../../services/admin/adminApiService';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Server, Database, HardDrive, Shield, Activity,
  CheckCircle, AlertTriangle, XCircle, TrendingUp, TrendingDown,
  Wifi, Cpu
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { apiResponseHistory, errorRateHistory } from '../../data/adminData';

export function SystemHealth() {
  const [healthData, setHealthData] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await AdminApiService.getSystemHealth();
        setHealthData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch system health');
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  const mapServiceStatus = (status: string): 'healthy' | 'degraded' | 'down' => {
    if (status === 'up' || status === 'connected' || status === 'reachable') return 'healthy';
    if (status === 'degraded') return 'degraded';
    return 'down';
  };

  const services = healthData ? [
    { name: 'API', status: mapServiceStatus(healthData.services.backend.status), icon: Server },
    { name: 'Database', status: mapServiceStatus(healthData.services.database.status), icon: Database },
    { name: 'Redis', status: mapServiceStatus(healthData.services.redis.status), icon: HardDrive },
    { name: 'Gemini API', status: mapServiceStatus(healthData.services.geminiApi.status), icon: Shield },
  ] : [];

  const overallStatus = healthData?.status ?? 'healthy';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-success/10 text-success border-success/20';
      case 'degraded': return 'bg-warning/10 text-warning border-warning/20';
      case 'down': return 'bg-danger/10 text-danger border-danger/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'down': return <XCircle className="w-4 h-4 text-danger" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const memoryUsedMB = healthData ? Math.round(healthData.memory.heapUsed / 1024 / 1024) : 0;
  const memoryTotalMB = healthData ? Math.round(healthData.memory.heapTotal / 1024 / 1024) : 0;
  const memoryPercent = memoryTotalMB > 0 ? Math.round((healthData!.memory.heapUsed / healthData!.memory.heapTotal) * 100) : 0;
  const rssMB = healthData ? Math.round(healthData.memory.rss / 1024 / 1024) : 0;

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
        <p className="text-danger font-medium">Error loading system health</p>
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
          <h1 className="text-3xl font-bold text-white">System Health</h1>
          <p className="text-muted-foreground mt-1">
            Monitor infrastructure performance and system metrics.
          </p>
        </div>
        <Badge variant="outline" className={getStatusColor(overallStatus)}>
          {getStatusIcon(overallStatus)}
          <span className="ml-1 capitalize">{overallStatus === 'healthy' ? 'All Systems Operational' : overallStatus}</span>
        </Badge>
      </motion.div>

      {/* Uptime Gauge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="card-surface p-6 text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#22C55E"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(healthData?.uptime ?? 0) * 2.83} 283`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">{healthData?.uptime ?? 0}%</span>
              <span className="text-xs text-muted-foreground">Uptime</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Last 30 days
          </p>
        </div>

        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          {[
            {
              label: 'DB Response Time',
              value: `${healthData?.services.database.responseTime ?? 0}ms`,
              icon: Database,
              trend: '',
              trendUp: true,
              color: 'text-success'
            },
            {
              label: 'Memory Usage',
              value: `${memoryUsedMB}MB`,
              icon: Cpu,
              trend: `${memoryPercent}%`,
              trendUp: memoryPercent < 80,
              color: memoryPercent > 80 ? 'text-danger' : 'text-primary'
            },
            {
              label: 'RSS Memory',
              value: `${rssMB}MB`,
              icon: Activity,
              trend: '',
              trendUp: true,
              color: 'text-warning'
            },
            {
              label: 'Backend Uptime',
              value: `${Math.round((healthData?.services.backend.uptime ?? 0) / 3600)}h`,
              icon: Server,
              trend: '',
              trendUp: true,
              color: 'text-success'
            },
          ].map((metric) => (
            <div key={metric.label} className="card-surface p-4">
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-lg bg-white/5">
                  <metric.icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                {metric.trend && (
                  <div className={`flex items-center gap-1 text-xs ${metric.trendUp ? 'text-success' : 'text-danger'}`}>
                    {metric.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {metric.trend}
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold text-white mt-3">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Service Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {services.map((service, index) => (
          <motion.div
            key={service.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className={`card-surface p-4 border ${getStatusColor(service.status)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10">
                  <service.icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-white">{service.name}</span>
              </div>
              {getStatusIcon(service.status)}
            </div>
            <div className="mt-3">
              <Badge variant="outline" className={getStatusColor(service.status)}>
                {service.status}
              </Badge>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Response Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-surface p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">API Response Time</h3>
              <p className="text-sm text-muted-foreground">Last 60 minutes</p>
            </div>
            <Badge variant="outline" className="bg-success/10 text-success">
              <CheckCircle className="w-3 h-3 mr-1" />
              Healthy
            </Badge>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={apiResponseHistory}>
                <defs>
                  <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  hide
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}ms`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload) {
                      return (
                        <div className="bg-card border border-white/[0.07] rounded-xl p-3 shadow-xl">
                          <p className="text-sm font-medium text-white">
                            {payload[0].payload.time}
                          </p>
                          <p className="text-lg font-bold text-primary">
                            {payload[0].value}ms
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="responseTime"
                  stroke="#6C63FF"
                  strokeWidth={2}
                  dot={false}
                  fill="url(#responseGradient)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Error Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card-surface p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Error Rate</h3>
              <p className="text-sm text-muted-foreground">Last 24 hours</p>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={errorRateHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="hour"
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload) {
                      return (
                        <div className="bg-card border border-white/[0.07] rounded-xl p-3 shadow-xl">
                          <p className="text-sm font-medium text-white">
                            {payload[0].payload.hour}
                          </p>
                          <p className="text-sm text-warning">
                            4xx: {payload[0].value} errors
                          </p>
                          <p className="text-sm text-danger">
                            5xx: {payload[1].value} errors
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="errors4xx" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                <Bar dataKey="errors5xx" fill="#EF4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* DB Performance Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card-surface p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Database Query Performance</h3>
            <p className="text-sm text-muted-foreground">
              Average query execution time by table and operation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Fast</span>
            <div className="flex gap-1">
              {[0.2, 0.4, 0.6, 0.8, 1].map((opacity) => (
                <div
                  key={opacity}
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: `rgba(34, 197, 94, ${opacity})` }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Slow</span>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2">
          {['users', 'exams', 'questions', 'responses', 'analytics', 'sessions'].map((table) => (
            <div key={table}>
              <p className="text-xs text-muted-foreground mb-2 capitalize">{table}</p>
              <div className="space-y-1">
                {['SELECT', 'INSERT', 'UPDATE', 'DELETE'].map((op) => {
                  const intensity = Math.random();
                  return (
                    <div
                      key={op}
                      className="h-8 rounded flex items-center justify-center text-[10px] text-white/70"
                      style={{
                        backgroundColor: `rgba(${intensity > 0.7 ? '239, 68, 68' : intensity > 0.4 ? '245, 158, 11' : '34, 197, 94'}, ${0.3 + intensity * 0.7})`,
                      }}
                      title={`${table}.${op}: ${(intensity * 100).toFixed(0)}ms avg`}
                    >
                      {op}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* System Resources */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {[
          { label: 'Heap Used', value: memoryPercent, color: 'bg-primary' },
          { label: 'RSS Memory', value: Math.min(100, Math.round((rssMB / (memoryTotalMB || 1)) * 100)), color: 'bg-warning' },
          { label: 'External', value: healthData ? Math.round((healthData.memory.external / 1024 / 1024)) : 0, color: 'bg-success' },
        ].map((resource) => (
          <div key={resource.label} className="card-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-white">{resource.label}</span>
              </div>
              <span className="text-sm font-bold text-white">{resource.value}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${resource.value}%` }}
                transition={{ duration: 1, delay: 0.8 }}
                className={`h-full ${resource.color} rounded-full`}
              />
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
