import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import { AdminApiService } from '@/services/admin/adminApiService';
import { Cpu, HardDrive, Zap, Database, Loader, RefreshCw } from 'lucide-react';

const SystemHealth: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<any>(null);
  const [dependencies, setDependencies] = useState<any>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [h, d, s] = await Promise.all([
        AdminApiService.getSystemHealth(),
        AdminApiService.getDependencies(),
        AdminApiService.getSystemInfo(),
      ]);

      setHealth(h.data);
      setDependencies(d.data);
      setSystemInfo(s.data);
    } catch (err) {
      console.error('Error loading system health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading || !health) {
    return (
      <AdminLayout title="System Health" subtitle="Monitor system resources and dependencies">
        <div className="flex items-center justify-center min-h-96 gap-3">
          <Loader className="animate-spin" size={24} />
          <span className="text-slate-400">Loading system health data...</span>
        </div>
      </AdminLayout>
    );
  }

  const healthStatus = health.status || 'unknown';
  const cpuUsage = health.cpu?.percentage || 0;
  const memoryUsage = health.memory?.usage || 0;
  const uptime = Math.floor((health.uptime || 0) / 3600);

  return (
    <AdminLayout title="System Health" subtitle="Monitor system resources and dependencies">
      <button
        onClick={loadData}
        disabled={loading}
        className="mb-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors border border-blue-600/30 font-medium text-sm"
      >
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        Refresh
      </button>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="System Status"
          value={healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}
          icon={<Zap size={24} />}
          changeType={healthStatus === 'healthy' ? 'positive' : 'negative'}
        />
        <StatCard
          label="CPU Usage"
          value={`${cpuUsage.toFixed(1)}%`}
          icon={<Cpu size={24} />}
          changeType={cpuUsage > 80 ? 'negative' : cpuUsage > 60 ? 'warning' : 'positive'}
          subtext="Real-time"
        />
        <StatCard
          label="Memory Usage"
          value={`${memoryUsage.toFixed(1)}%`}
          icon={<HardDrive size={24} />}
          changeType={memoryUsage > 85 ? 'negative' : memoryUsage > 70 ? 'warning' : 'positive'}
          subtext="Real-time"
        />
        <StatCard
          label="Uptime"
          value={`${uptime}h`}
          icon={<Database size={24} />}
          subtext="Continuous"
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* CPU & Memory Details */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4">CPU Details</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-400 text-sm">Usage</span>
                <span className="text-slate-200 font-medium">{cpuUsage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    cpuUsage > 80 ? 'bg-red-500' : cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${cpuUsage}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">User</span>
              <span className="text-slate-200">{health.cpu?.user?.toFixed(2) || 'N/A'}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">System</span>
              <span className="text-slate-200">{health.cpu?.system?.toFixed(2) || 'N/A'}%</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4">Memory Details</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-400 text-sm">Usage</span>
                <span className="text-slate-200 font-medium">{memoryUsage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    memoryUsage > 85 ? 'bg-red-500' : memoryUsage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${memoryUsage}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">RSS</span>
              <span className="text-slate-200">
                {((health.memory?.rss || 0) / 1024 / 1024).toFixed(0)} MB
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Heap Used</span>
              <span className="text-slate-200">
                {((health.memory?.heapUsed || 0) / 1024 / 1024).toFixed(0)} MB
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dependencies */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
        <h2 className="text-lg font-bold text-white mb-4">Service Dependencies</h2>
        <div className="space-y-3">
          {dependencies ? (
            Object.entries(dependencies).map(([service, status]) => (
              <div key={service} className="flex items-center justify-between">
                <span className="text-slate-400 capitalize">{service.replace(/_/g, ' ')}</span>
                <StatusBadge
                  status={status === 'connected' || status === 'active' ? 'active' : 'inactive'}
                  label={String(status).charAt(0).toUpperCase() + String(status).slice(1)}
                />
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-sm">No dependency data available</p>
          )}
        </div>
      </div>

      {/* System Information */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Process ID</p>
            <p className="text-slate-200 font-mono">{systemInfo?.pid || 'N/A'}</p>
          </div>
          <div>
            <p className="text-slate-400">Platform</p>
            <p className="text-slate-200 font-mono capitalize">{systemInfo?.platform || 'N/A'}</p>
          </div>
          <div>
            <p className="text-slate-400">Architecture</p>
            <p className="text-slate-200 font-mono">{systemInfo?.arch || 'N/A'}</p>
          </div>
          <div>
            <p className="text-slate-400">Node Version</p>
            <p className="text-slate-200 font-mono">{systemInfo?.version || 'N/A'}</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SystemHealth;
