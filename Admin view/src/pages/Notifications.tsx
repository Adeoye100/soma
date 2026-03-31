import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, AlertTriangle, XCircle, Info, RefreshCw } from 'lucide-react';

export function Notifications() {
  const { alerts, fetchAlerts } = useDashboardStore();
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');

  const alertList = alerts?.alerts || [];
  const summary = alerts?.summary;
  const filtered = filter === 'all' ? alertList : alertList.filter(a => a.severity === filter);

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-danger" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-warning" />;
      default: return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-danger/10 border-danger/20';
      case 'warning': return 'bg-warning/10 border-warning/20';
      default: return 'bg-primary/10 border-primary/20';
    }
  };

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Alerts & Notifications</h1>
          <p className="text-muted-foreground mt-1">Real system alerts derived from backend conditions.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={fetchAlerts}><RefreshCw className="w-4 h-4" /> Refresh</Button>
      </motion.div>

      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-4">
        <div className="bg-danger/10 border border-danger/20 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-danger">{summary?.critical ?? 0}</p>
          <p className="text-danger text-sm">Critical</p>
        </div>
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-warning">{summary?.warning ?? 0}</p>
          <p className="text-warning text-sm">Warning</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-primary">{summary?.info ?? 0}</p>
          <p className="text-primary text-sm">Info</p>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'critical', 'warning'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)} {f === 'all' ? `(${alertList.length})` : `(${alertList.filter(a => a.severity === f).length})`}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card-surface p-8 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="text-foreground text-lg font-medium">All Clear</p>
            <p className="text-muted-foreground text-sm">No alerts matching the current filter</p>
          </div>
        ) : filtered.map((alert, i) => (
          <motion.div key={alert.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className={`p-4 rounded-xl border ${getColor(alert.severity)}`}>
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-white/10">{getIcon(alert.severity)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">{alert.title}</h4>
                  <span className="text-xs text-muted-foreground">{formatTime(alert.timestamp)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
              </div>
              <Badge variant="outline" className={getColor(alert.severity)}>{alert.severity}</Badge>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
