<<<<<<< HEAD
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
=======
import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminApiService } from '../../../services/admin/adminApiService';

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'active' | 'acknowledged' | 'resolved';
  timestamp: string;
}

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await AdminApiService.getAlerts();
        setAlerts(data);
      } catch (error) {
        console.error('[Alerts] Error:', error);
        setAlerts([
          {
            id: '1',
            title: 'High Memory Usage',
            message: 'Memory usage exceeded 85%',
            severity: 'warning',
            status: 'active',
            timestamp: '5 mins ago',
          },
          {
            id: '2',
            title: 'Database Connection',
            message: 'Slow query detected',
            severity: 'info',
            status: 'acknowledged',
            timestamp: '1 hour ago',
          },
          {
            id: '3',
            title: 'API Rate Limit',
            message: 'Rate limit approached for user 123',
            severity: 'warning',
            status: 'resolved',
            timestamp: '2 hours ago',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve') => {
    try {
      if (action === 'acknowledge') {
        await AdminApiService.acknowledgeAlert(alertId);
      } else if (action === 'resolve') {
        await AdminApiService.resolveAlert(alertId);
      }
      // Refresh alerts
      const data = await AdminApiService.getAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('[Alerts] Action error:', error);
    }
  };

  const getSeverityStyles = (severity: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-900/30 text-red-400 border-red-800 text-red-300',
      warning: 'bg-yellow-900/30 text-yellow-400 border-yellow-800 text-yellow-300',
      info: 'bg-blue-900/30 text-blue-400 border-blue-800 text-blue-300',
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
    };
    return styles[severity] || styles.info;
  };

<<<<<<< HEAD
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
=======
  const getStatusStyles = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-red-900/30 text-red-400',
      acknowledged: 'bg-yellow-900/30 text-yellow-400',
      resolved: 'bg-green-900/30 text-green-400',
    };
    return styles[status] || styles.active;
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'active') return alert.status === 'active' || alert.status === 'acknowledged';
    return alert.status === 'resolved';
  });

  if (loading) return <AdminLayout title="Alerts">Loading...</AdminLayout>;
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba

  return (
    <AdminLayout
      title="Alerts & Notifications"
<<<<<<< HEAD
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

=======
      subtitle="Manage system alerts and notifications"
    >
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
<<<<<<< HEAD
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
=======
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          All ({alerts.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'active'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Active ({alerts.filter(a => a.status === 'active' || a.status === 'acknowledged').length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'resolved'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Resolved ({alerts.filter(a => a.status === 'resolved').length})
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
        </button>
      </div>

      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-slate-900 rounded-lg p-8 text-center border border-slate-800">
<<<<<<< HEAD
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
=======
            <p className="text-slate-400">No alerts to display</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg p-6 border flex justify-between items-start ${getSeverityStyles(alert.severity)}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{alert.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyles(alert.status)}`}>
                    {alert.status}
                  </span>
                </div>
                <p className="text-sm opacity-90 mb-2">{alert.message}</p>
                <p className="text-xs opacity-75">{alert.timestamp}</p>
              </div>

              <div className="flex gap-2 ml-4">
                {alert.status === 'active' && (
                  <button
                    onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors text-xs font-medium"
                  >
                    Acknowledge
                  </button>
                )}
                {alert.status !== 'resolved' && (
                  <button
                    onClick={() => handleAlertAction(alert.id, 'resolve')}
                    className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 transition-colors text-xs font-medium text-white"
                  >
                    Resolve
                  </button>
                )}
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
};

export default Alerts;
