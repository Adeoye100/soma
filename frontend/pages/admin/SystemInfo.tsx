import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/StatusBadge';
import { AdminApiService } from '@/services/admin/adminApiService';
import { Server, Database, Loader, RefreshCw, AlertTriangle } from 'lucide-react';

const SystemInfo: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [dependencies, setDependencies] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [s, d] = await Promise.all([
        AdminApiService.getSystemInfo(),
        AdminApiService.getDependencies(),
      ]);

      if (s.error || d.error) {
        setError('Some system information failed to load');
      }

      setSystemInfo(s.data);
      setDependencies(d.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !systemInfo) {
    return (
      <AdminLayout title="System Info" subtitle="System details and dependency status">
        <div className="flex items-center justify-center min-h-96 gap-3">
          <Loader className="animate-spin" size={24} />
          <span className="text-slate-400">Loading system information...</span>
        </div>
      </AdminLayout>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const uptime = systemInfo.uptime || 0;
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);

  return (
    <AdminLayout title="System Info" subtitle="System details and dependency status">
      <div className="flex gap-4 mb-6">
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors border border-blue-600/30 font-medium text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-900/30 border border-yellow-800/50 flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-yellow-300">{error}</p>
        </div>
      )}

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Process Information */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Server size={20} />
            Process Information
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Process ID (PID)</p>
              <p className="text-slate-200 font-mono text-lg">{systemInfo.pid}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Uptime</p>
              <p className="text-slate-200 text-lg">
                {uptimeHours}h {uptimeMinutes}m
              </p>
              <p className="text-slate-500 text-xs mt-1">{uptime.toFixed(0)} seconds</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Version</p>
              <p className="text-slate-200 font-mono">{systemInfo.version}</p>
            </div>
          </div>
        </div>

        {/* Environment Information */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Database size={20} />
            Environment
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Platform</p>
              <p className="text-slate-200 capitalize text-lg">{systemInfo.platform}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Architecture</p>
              <p className="text-slate-200 text-lg">{systemInfo.arch}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Node.js Version</p>
              <p className="text-slate-200 font-mono text-sm">{systemInfo.version}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Memory Information */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
        <h2 className="text-lg font-bold text-white mb-4">Memory Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-slate-400 text-sm mb-2">RSS</p>
            <p className="text-slate-200 font-mono text-lg">
              {formatBytes(systemInfo.memory?.rss || 0)}
            </p>
            <p className="text-slate-500 text-xs mt-1">Resident Set Size</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-2">Heap Total</p>
            <p className="text-slate-200 font-mono text-lg">
              {formatBytes(systemInfo.memory?.heapTotal || 0)}
            </p>
            <p className="text-slate-500 text-xs mt-1">Total allocated</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-2">Heap Used</p>
            <p className="text-slate-200 font-mono text-lg">
              {formatBytes(systemInfo.memory?.heapUsed || 0)}
            </p>
            <p className="text-slate-500 text-xs mt-1">Currently in use</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-2">External</p>
            <p className="text-slate-200 font-mono text-lg">
              {formatBytes(systemInfo.memory?.external || 0)}
            </p>
            <p className="text-slate-500 text-xs mt-1">Bound to JS objects</p>
          </div>
        </div>

        {/* Memory Visualization */}
        <div className="mt-6 pt-6 border-t border-slate-700">
          <p className="text-slate-400 text-sm mb-3">Heap Usage</p>
          <div className="w-full bg-slate-700 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-blue-500 transition-all"
              style={{
                width: `${
                  ((systemInfo.memory?.heapUsed || 0) /
                    (systemInfo.memory?.heapTotal || 1)) *
                  100
                }%`,
              }}
            ></div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {(
              ((systemInfo.memory?.heapUsed || 0) /
                (systemInfo.memory?.heapTotal || 1)) *
              100
            ).toFixed(1)}
            % of allocated heap
          </p>
        </div>
      </div>

      {/* CPU Information */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
        <h2 className="text-lg font-bold text-white mb-4">CPU Usage</h2>
        {systemInfo.cpu ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-slate-400 text-sm mb-2">User</p>
              <p className="text-slate-200 font-mono text-lg">
                {(systemInfo.cpu.user / 1000000).toFixed(3)}s
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-2">System</p>
              <p className="text-slate-200 font-mono text-lg">
                {(systemInfo.cpu.system / 1000000).toFixed(3)}s
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-2">Total</p>
              <p className="text-slate-200 font-mono text-lg">
                {(
                  (systemInfo.cpu.user + systemInfo.cpu.system) /
                  1000000
                ).toFixed(3)}
                s
              </p>
            </div>
          </div>
        ) : (
          <p className="text-slate-500">No CPU data available</p>
        )}
      </div>

      {/* Service Dependencies */}
      {dependencies && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4">Service Dependencies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(dependencies).map(([service, status]) => (
              <div key={service} className="p-4 bg-slate-700/30 rounded-lg border border-slate-700/50 flex items-center justify-between">
                <p className="text-slate-300 text-sm capitalize">{service.replace(/_/g, ' ')}</p>
                <StatusBadge
                  status={
                    status === 'connected' || status === 'active' ? 'active' : 'inactive'
                  }
                  label={String(status).charAt(0).toUpperCase() + String(status).slice(1)}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default SystemInfo;
