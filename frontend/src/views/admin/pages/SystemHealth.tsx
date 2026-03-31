import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminApiService, SystemHealthResponse } from '../../../services/admin/adminApiService';

const SystemHealth: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await AdminApiService.getSystemHealth();
      setMetrics(data);
      setLastUpdate(new Date());
    } catch {
      // Keep last good data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const formatBytes = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${Math.round(mb)}MB`;
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up':
      case 'connected':
      case 'reachable':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      case 'down':
      case 'unreachable':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'up':
      case 'connected':
      case 'reachable':
        return 'bg-green-900/30 text-green-400 border-green-800';
      case 'degraded':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
      case 'down':
      case 'unreachable':
        return 'bg-red-900/30 text-red-400 border-red-800';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const overallStatus = metrics?.status || 'degraded';
  const overallColor = overallStatus === 'healthy' ? 'text-green-400' : overallStatus === 'degraded' ? 'text-yellow-400' : 'text-red-400';
  const overallBg = overallStatus === 'healthy' ? 'bg-green-900/20 border-green-800' : overallStatus === 'degraded' ? 'bg-yellow-900/20 border-yellow-800' : 'bg-red-900/20 border-red-800';

  const memUsage = metrics ? Math.round((metrics.memory.heapUsed / metrics.memory.heapTotal) * 100) : 0;

  if (loading && !metrics) {
    return <AdminLayout title="System Health">Loading...</AdminLayout>;
  }

  return (
    <AdminLayout
      title="System Health"
      subtitle={`Last updated: ${lastUpdate.toLocaleTimeString()}`}
    >
      <div className={`${overallBg} border rounded-lg p-6 mb-8 flex items-center justify-between`}>
        <div>
          <p className="text-sm text-slate-400">Overall System Status</p>
          <p className={`text-3xl font-bold capitalize mt-1 ${overallColor}`}>{overallStatus}</p>
        </div>
        <div className={`text-6xl ${overallColor}`}>
          {overallStatus === 'healthy' ? '●' : overallStatus === 'degraded' ? '◐' : '○'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Database</p>
              <p className={`text-xl font-bold mt-2 capitalize ${getStatusColor(metrics?.services.database.status || 'down')}`}>
                {metrics?.services.database.status || 'unknown'}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(metrics?.services.database.status || 'down')}`}>
              {metrics?.services.database.responseTime ?? 0}ms
            </span>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Redis</p>
              <p className={`text-xl font-bold mt-2 capitalize ${getStatusColor(metrics?.services.redis.status || 'down')}`}>
                {metrics?.services.redis.status || 'unknown'}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(metrics?.services.redis.status || 'down')}`}>
              {metrics?.services.redis.mode || 'memory'}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Gemini API</p>
              <p className={`text-xl font-bold mt-2 capitalize ${getStatusColor(metrics?.services.geminiApi.status || 'unreachable')}`}>
                {metrics?.services.geminiApi.status || 'unknown'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Backend</p>
              <p className="text-xl font-bold mt-2 text-green-400">up</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium border bg-green-900/30 text-green-400 border-green-800">
              {formatUptime(metrics?.services.backend.uptime || 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <h3 className="text-lg font-semibold mb-4">Memory Usage</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-300">Heap</span>
              <span className={memUsage > 85 ? 'text-red-400' : memUsage > 60 ? 'text-yellow-400' : 'text-green-400'}>
                {formatBytes(metrics?.memory.heapUsed || 0)} / {formatBytes(metrics?.memory.heapTotal || 0)} ({memUsage}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  memUsage > 85 ? 'bg-red-500' : memUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${memUsage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-slate-800/50 rounded p-3">
              <p className="text-slate-400 text-xs">Heap Used</p>
              <p className="text-slate-50 font-mono text-sm">{formatBytes(metrics?.memory.heapUsed || 0)}</p>
            </div>
            <div className="bg-slate-800/50 rounded p-3">
              <p className="text-slate-400 text-xs">Heap Total</p>
              <p className="text-slate-50 font-mono text-sm">{formatBytes(metrics?.memory.heapTotal || 0)}</p>
            </div>
            <div className="bg-slate-800/50 rounded p-3">
              <p className="text-slate-400 text-xs">RSS</p>
              <p className="text-slate-50 font-mono text-sm">{formatBytes(metrics?.memory.rss || 0)}</p>
            </div>
            <div className="bg-slate-800/50 rounded p-3">
              <p className="text-slate-400 text-xs">External</p>
              <p className="text-slate-50 font-mono text-sm">{formatBytes(metrics?.memory.external || 0)}</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SystemHealth;
