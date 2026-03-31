import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Play, CheckCircle, RotateCcw, FileCheck, RefreshCw } from 'lucide-react';

export function ActivityFeed() {
  const { activity, fetchActivity } = useDashboardStore();
  const activities = activity?.activities || [];

  const formatTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getActionIcon = (type: string) => {
    if (type.includes('created')) return Play;
    if (type.includes('submitted')) return FileCheck;
    if (type.includes('passed')) return CheckCircle;
    return RotateCcw;
  };

  const getStatusColor = (desc: string) => {
    if (desc.includes('passed')) return 'bg-success/10 text-success border-success/20';
    if (desc.includes('failed')) return 'bg-danger/10 text-danger border-danger/20';
    return 'bg-primary/10 text-primary border-primary/20';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.5 }} className="card-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Live Activity Stream</h3>
          <p className="text-sm text-muted-foreground">Real-time submissions from the platform</p>
        </div>
        <button onClick={fetchActivity} className="text-sm text-primary hover:underline flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Event</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 ? (
              <tr><td colSpan={3} className="py-8 text-center text-muted-foreground text-sm">No recent activity</td></tr>
            ) : activities.slice(0, 10).map((a) => {
              const Icon = getActionIcon(a.type);
              return (
                <tr key={a.id} className="border-b border-white/[0.05] hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground capitalize">{a.type.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4"><span className="text-sm text-foreground">{a.description}</span></td>
                  <td className="py-3 px-4"><span className="text-sm text-muted-foreground">{formatTime(a.timestamp)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
