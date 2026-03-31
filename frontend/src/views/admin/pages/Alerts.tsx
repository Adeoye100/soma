import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminApiService, AlertsResponse, AlertItem } from '../../../services/admin/adminApiService';

const Alerts: React.FC = () => {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');

  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getAlerts();
      setData(result);
    } catch {
      // Keep last good data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getSeverityStyles = (severity: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-900/20 border-red-800',
      warning: 'bg-yellow-900/20 border-yellow-800',
      info: 'bg-blue-900/20 border-blue-800',
    };
    return styles[severity] || styles.info;
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-900/40 text-red-400',
      warning: 'bg-yellow-900/40 text-yellow-400',
      info: 'bg-blue-900/40 text-blue-400',
    };
    return styles[severity] || styles.info;
  };

  const getRelativeTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const filteredAlerts = data?.alerts.filter(alert => {
    if (filter === 'all') return true;
    return alert.severity === filter;
  }) || [];

  if (loading && !data) {
    return <AdminLayout title="Alerts">Loading...</AdminLayout>;
  }

  return (
    <AdminLayout
      title="Alerts & Notifications"
      subtitle="System alerts derived from real-time conditions"
    >
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{data?.summary.critical ?? 0}</p>
          <p className="text-red-300 text-sm">Critical</p>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{data?.summary.warning ?? 0}</p>
          <p className="text-yellow-300 text-sm">Warning</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">{data?.summary.info ?? 0}</p>
          <p className="text-blue-300 text-sm">Info</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          All ({data?.alerts.length ?? 0})
        </button>
        <button
          onClick={() => setFilter('critical')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'critical' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Critical ({data?.summary.critical ?? 0})
        </button>
        <button
          onClick={() => setFilter('warning')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'warning' ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Warning ({data?.summary.warning ?? 0})
        </button>
      </div>

      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-slate-900 rounded-lg p-8 text-center border border-slate-800">
            <p className="text-4xl mb-4">✅</p>
            <p className="text-slate-300 text-lg font-medium">All Clear</p>
            <p className="text-slate-500 text-sm mt-1">No alerts matching the current filter</p>
          </div>
        ) : (
          filteredAlerts.map((alert: AlertItem) => (
            <div
              key={alert.id}
              className={`rounded-lg p-6 border ${getSeverityStyles(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${getSeverityBadge(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <h3 className="font-semibold text-slate-50">{alert.title}</h3>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">{alert.message}</p>
                  <p className="text-xs text-slate-500">{getRelativeTime(alert.timestamp)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
};

export default Alerts;
