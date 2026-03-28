import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import { AdminApiService } from '@/services/admin/adminApiService';
import {
  Activity,
  BarChart3,
  Zap,
  Gauge,
  AlertTriangle,
  Loader,
} from 'lucide-react';

interface DashboardData {
  health?: any;
  monitoringStatus?: any;
  queueOverview?: any;
  automationOverview?: any;
}

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({});

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [health, monitoring, queues, automation] = await Promise.all([
          AdminApiService.getSystemHealth(),
          AdminApiService.getMonitoringStatus(),
          AdminApiService.getQueueOverview(),
          AdminApiService.getAutomationOverview(),
        ]);

        if (health.error || monitoring.error || queues.error || automation.error) {
          setError('Failed to load some dashboard data');
        }

        setData({
          health: health.data,
          monitoringStatus: monitoring.data,
          queueOverview: queues.data,
          automationOverview: automation.data,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Dashboard" subtitle="System overview and key metrics">
        <div className="flex items-center justify-center min-h-96 gap-3">
          <Loader className="animate-spin" size={24} />
          <span className="text-slate-400">Loading dashboard data...</span>
        </div>
      </AdminLayout>
    );
  }

  const healthStatus = data.health?.status || 'unknown';
  const uptime = data.health?.uptime ? Math.floor(data.health.uptime / 3600) : 0;
  const requestsPerMin = data.monitoringStatus?.requestsPerMinute || 0;
  const activeWorkflows = data.automationOverview?.totalWorkflows || 0;
  const queueCount = data.queueOverview?.totalQueues || 0;

  return (
    <AdminLayout title="Dashboard" subtitle="System overview and key metrics">
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-900/30 border border-yellow-800/50 flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-yellow-300 font-medium">{error}</p>
            <p className="text-yellow-200/70 text-sm mt-1">Some data may be outdated or unavailable</p>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="System Status"
          value={healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}
          icon={<Activity size={24} />}
          changeType={healthStatus === 'healthy' ? 'positive' : 'negative'}
          subtext="Overall health"
        />
        <StatCard
          label="Uptime"
          value={`${uptime}h`}
          icon={<BarChart3 size={24} />}
          subtext="Total uptime"
        />
        <StatCard
          label="Requests/Min"
          value={requestsPerMin}
          icon={<Gauge size={24} />}
          subtext="Current rate"
        />
        <StatCard
          label="Active Workflows"
          value={activeWorkflows}
          icon={<Zap size={24} />}
          subtext={`${queueCount} queues`}
        />
      </div>

      {/* System Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Status */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4">System Health</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Overall Status</span>
              <StatusBadge
                status={healthStatus === 'healthy' ? 'active' : 'error'}
                label={healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">CPU Usage</span>
              <span className="text-slate-200 font-medium">
                {data.health?.cpu?.percentage?.toFixed(1) || 'N/A'}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Memory Usage</span>
              <span className="text-slate-200 font-medium">
                {data.health?.memory?.usage?.toFixed(1) || 'N/A'}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Connected Services</span>
              <StatusBadge
                status="active"
                label={`${Object.keys(data.health?.dependencies || {}).length || 0} services`}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/admin/monitoring"
              className="block w-full px-4 py-3 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors border border-blue-600/30 font-medium text-sm"
            >
              View Detailed Metrics
            </a>
            <a
              href="/admin/automation"
              className="block w-full px-4 py-3 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors border border-purple-600/30 font-medium text-sm"
            >
              Manage Workflows
            </a>
            <a
              href="/admin/queues"
              className="block w-full px-4 py-3 rounded-lg bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 transition-colors border border-amber-600/30 font-medium text-sm"
            >
              Queue Management
            </a>
            <a
              href="/admin/configuration"
              className="block w-full px-4 py-3 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-600/30 font-medium text-sm"
            >
              Configuration Settings
            </a>
          </div>
        </div>
      </div>

      {/* Recent Activity (Placeholder) */}
      <div className="mt-6 bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
        <div className="text-center py-8">
          <p className="text-slate-400">No recent activity to display</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
