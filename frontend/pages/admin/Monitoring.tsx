import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import { AdminApiService } from '@/services/admin/adminApiService';
import { BarChart3, TrendingUp, Clock, Loader, RefreshCw, AlertTriangle } from 'lucide-react';

const Monitoring: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [traces, setTraces] = useState<any[]>([]);
  const [sla, setSla] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [m, t, s] = await Promise.all([
        AdminApiService.queryMetrics({ limit: 10 }),
        AdminApiService.queryTraces({ limit: 10 }),
        AdminApiService.getSLAMetrics(),
      ]);

      if (m.error || t.error || s.error) {
        setError('Some monitoring data failed to load');
      }

      setMetrics(m.data || []);
      setTraces(t.data || []);
      setSla(s.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Monitoring" subtitle="System metrics and performance traces">
        <div className="flex items-center justify-center min-h-96 gap-3">
          <Loader className="animate-spin" size={24} />
          <span className="text-slate-400">Loading monitoring data...</span>
        </div>
      </AdminLayout>
    );
  }

  const avgResponseTime = metrics.length > 0
    ? (metrics.reduce((sum, m) => sum + (m.value || 0), 0) / metrics.length).toFixed(2)
    : 0;

  const errorRate = traces.length > 0
    ? ((traces.filter((t) => t.status === 'error').length / traces.length) * 100).toFixed(2)
    : 0;

  return (
    <AdminLayout title="Monitoring" subtitle="System metrics and performance traces">
      <div className="flex gap-4 mb-6 flex-wrap">
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Avg Response Time"
          value={`${avgResponseTime}ms`}
          icon={<Clock size={24} />}
          subtext="Last 10 metrics"
        />
        <StatCard
          label="Error Rate"
          value={`${errorRate}%`}
          icon={<AlertTriangle size={24} />}
          changeType={Number(errorRate) > 5 ? 'negative' : 'positive'}
          subtext="Last 10 traces"
        />
        <StatCard
          label="Total Metrics"
          value={metrics.length}
          icon={<BarChart3 size={24} />}
          subtext="Tracked"
        />
        <StatCard
          label="Total Traces"
          value={traces.length}
          icon={<TrendingUp size={24} />}
          subtext="Recorded"
        />
      </div>

      {/* SLA Metrics */}
      {sla && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">SLA Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-slate-400 text-sm mb-2">Uptime %</p>
              <p className="text-2xl font-bold text-green-400">{(sla.uptime || 0).toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-2">Avg Response Time</p>
              <p className="text-2xl font-bold text-blue-400">{(sla.avgResponseTime || 0).toFixed(0)}ms</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-2">Error Rate</p>
              <p className="text-2xl font-bold text-yellow-400">{(sla.errorRate || 0).toFixed(2)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Table */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
        <h2 className="text-lg font-bold text-white mb-4">Recent Metrics</h2>
        {metrics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Metric Name</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Value</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Timestamp</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, idx) => (
                  <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-4 text-slate-200 font-mono">{metric.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-slate-200">{metric.value?.toFixed(2) || 'N/A'}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {metric.timestamp ? new Date(metric.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {metric.tags ? Object.entries(metric.tags).map(([k, v]) => `${k}=${v}`).join(', ') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No metrics available</p>
        )}
      </div>

      {/* Traces Table */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">Recent Traces</h2>
        {traces.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Operation</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Duration</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {traces.map((trace, idx) => (
                  <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-4 text-slate-200 font-mono text-xs">{trace.name || 'Unknown'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status={trace.status === 'success' ? 'success' : trace.status === 'error' ? 'error' : 'pending'}
                        label={trace.status?.charAt(0).toUpperCase() + (trace.status?.slice(1) || '')}
                        size="sm"
                      />
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {trace.duration ? `${trace.duration.toFixed(2)}ms` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {trace.timestamp ? new Date(trace.timestamp).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No traces available</p>
        )}
      </div>
    </AdminLayout>
  );
};

export default Monitoring;
