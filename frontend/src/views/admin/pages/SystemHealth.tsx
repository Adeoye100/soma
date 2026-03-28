import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import StatCard from '../components/StatCard';
import { AdminApiService } from '../../../services/admin/adminApiService';

interface HealthMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  databaseStatus: string;
  cacheStatus: string;
  apiStatus: string;
}

const SystemHealth: React.FC = () => {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await AdminApiService.getSystemHealth();
        setMetrics(data);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('[SystemHealth] Error fetching metrics:', error);
        // Mock data
        setMetrics({
          cpuUsage: 35,
          memoryUsage: 62,
          diskUsage: 48,
          databaseStatus: 'Healthy',
          cacheStatus: 'Healthy',
          apiStatus: 'Healthy',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    if (status.toLowerCase().includes('healthy')) return '🟢';
    if (status.toLowerCase().includes('warning')) return '🟡';
    return '🔴';
  };

  const getUsageColor = (usage: number) => {
    if (usage < 50) return 'text-green-400';
    if (usage < 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return <AdminLayout title="System Health">Loading...</AdminLayout>;
  }

  return (
    <AdminLayout
      title="System Health"
      subtitle={`Last updated: ${lastUpdate.toLocaleTimeString()}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          label="CPU Usage"
          value={`${metrics?.cpuUsage || 0}%`}
          change={metrics && metrics.cpuUsage > 80 ? 'High usage detected' : 'Normal'}
          icon="💻"
        />
        <StatCard
          label="Memory Usage"
          value={`${metrics?.memoryUsage || 0}%`}
          change={metrics && metrics.memoryUsage > 80 ? 'High usage detected' : 'Normal'}
          icon="🧠"
        />
        <StatCard
          label="Disk Usage"
          value={`${metrics?.diskUsage || 0}%`}
          change={metrics && metrics.diskUsage > 90 ? 'Critical' : 'Normal'}
          icon="💾"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Database Status</p>
              <p className="text-xl font-bold mt-2">{metrics?.databaseStatus}</p>
            </div>
            <span className="text-3xl">{getStatusColor(metrics?.databaseStatus || '')}</span>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Cache Status</p>
              <p className="text-xl font-bold mt-2">{metrics?.cacheStatus}</p>
            </div>
            <span className="text-3xl">{getStatusColor(metrics?.cacheStatus || '')}</span>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">API Status</p>
              <p className="text-xl font-bold mt-2">{metrics?.apiStatus}</p>
            </div>
            <span className="text-3xl">{getStatusColor(metrics?.apiStatus || '')}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <h3 className="text-lg font-semibold mb-4">Detailed Metrics</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-300">CPU Usage</span>
              <span className={getUsageColor(metrics?.cpuUsage || 0)}>{metrics?.cpuUsage}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${metrics?.cpuUsage || 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-300">Memory Usage</span>
              <span className={getUsageColor(metrics?.memoryUsage || 0)}>{metrics?.memoryUsage}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${metrics?.memoryUsage || 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-300">Disk Usage</span>
              <span className={getUsageColor(metrics?.diskUsage || 0)}>{metrics?.diskUsage}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full"
                style={{ width: `${metrics?.diskUsage || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SystemHealth;
