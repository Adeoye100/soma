import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';
import { Badge } from '@/components/ui/badge';
import { Server, Database, Shield, Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SystemHealth() {
  const { health, fetchHealth } = useDashboardStore();
  const h = health;

  const formatBytes = (b: number) => `${Math.round(b / 1024 / 1024)}MB`;
  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400); const hr = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60);
    return `${d}d ${hr}h ${m}m`;
  };

  const getStatusColor = (status: string) => {
    if (status === 'up' || status === 'connected' || status === 'reachable') return 'bg-success/10 text-success border-success/20';
    if (status === 'degraded') return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-danger/10 text-danger border-danger/20';
  };
  const getStatusIcon = (status: string) => {
    if (status === 'up' || status === 'connected' || status === 'reachable') return <CheckCircle className="w-4 h-4 text-success" />;
    if (status === 'degraded') return <AlertTriangle className="w-4 h-4 text-warning" />;
    return <XCircle className="w-4 h-4 text-danger" />;
  };

  const overallStatus = h?.status || 'degraded';
  const overallColor = overallStatus === 'healthy' ? 'text-success' : overallStatus === 'degraded' ? 'text-warning' : 'text-danger';

  const services = [
    { name: 'Database', status: h?.services.database.status || 'down', icon: Database, extra: h ? `${h.services.database.responseTime}ms` : '' },
    { name: 'Redis', status: h?.services.redis.status || 'down', icon: Server, extra: h?.services.redis.mode || 'memory' },
    { name: 'Gemini API', status: h?.services.geminiApi.status || 'unreachable', icon: Activity, extra: '' },
    { name: 'Backend', status: h?.services.backend.status || 'down', icon: Shield, extra: h ? formatUptime(h.services.backend.uptime) : '' },
  ];

  const memPct = h ? Math.round((h.memory.heapUsed / h.memory.heapTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Health</h1>
          <p className="text-muted-foreground mt-1">Real infrastructure metrics from backend.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={getStatusColor(overallStatus === 'healthy' ? 'up' : overallStatus === 'degraded' ? 'degraded' : 'down')}>
            {overallStatus === 'healthy' ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
            {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
          </Badge>
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchHealth}><RefreshCw className="w-4 h-4" /> Refresh</Button>
        </div>
      </motion.div>

      {/* Uptime & Memory */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-surface p-6 text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="#22C55E" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(h ? Math.min(h.services.backend.uptime, 86400) / 86400 * 100 : 0) * 2.83} 283`}
                className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{h ? formatUptime(h.services.backend.uptime) : '--'}</span>
              <span className="text-xs text-muted-foreground">Uptime</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Backend process uptime</p>
        </div>

        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 mb-1"><Cpu className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Heap Used</span></div>
            <p className="text-2xl font-bold text-foreground">{h ? formatBytes(h.memory.heapUsed) : '--'}</p>
            <div className="h-2 bg-white/10 rounded-full mt-2"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${memPct}%` }} /></div>
            <p className="text-xs text-muted-foreground mt-1">{memPct}% of {h ? formatBytes(h.memory.heapTotal) : '--'}</p>
          </div>
          <div className="card-surface p-4">
            <div className="flex items-center gap-2 mb-1"><Activity className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">RSS Memory</span></div>
            <p className="text-2xl font-bold text-foreground">{h ? formatBytes(h.memory.rss) : '--'}</p>
            <p className="text-xs text-muted-foreground mt-2">External: {h ? formatBytes(h.memory.external) : '--'}</p>
          </div>
        </div>
      </motion.div>

      {/* Service Status */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {services.map((svc, i) => (
          <motion.div key={svc.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
            className={`card-surface p-4 border ${getStatusColor(svc.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10"><svc.icon className="w-5 h-5" /></div>
                <span className="font-medium text-foreground">{svc.name}</span>
              </div>
              {getStatusIcon(svc.status)}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="outline" className={getStatusColor(svc.status)}>{svc.status}</Badge>
              {svc.extra && <span className="text-xs text-muted-foreground">{svc.extra}</span>}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
