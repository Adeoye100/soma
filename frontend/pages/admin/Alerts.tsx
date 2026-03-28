import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import { AdminApiService } from '@/services/admin/adminApiService';
import { Bell, AlertTriangle, CheckCircle, Loader, RefreshCw } from 'lucide-react';

const Alerts: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const result = await AdminApiService.getAlerts({ limit: 50 });
      setAlerts(result.data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    // Refresh alerts every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (id: string) => {
    try {
      setActionLoading(true);
      await AdminApiService.acknowledgeAlert(id);
      loadAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      setActionLoading(true);
      await AdminApiService.resolveAlert(id);
      loadAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const unacknowledgedCount = alerts.filter((a) => a.status === 'unacknowledged').length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  if (loading && !alerts.length) {
    return (
      <AdminLayout title="Alerts" subtitle="Monitor and manage system alerts">
        <div className="flex items-center justify-center min-h-96 gap-3">
          <Loader className="animate-spin" size={24} />
          <span className="text-slate-400">Loading alerts...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Alerts" subtitle="Monitor and manage system alerts">
      <div className="flex gap-4 mb-6 flex-wrap">
        <button
          onClick={loadAlerts}
          disabled={loading || actionLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors border border-blue-600/30 font-medium text-sm"
        >
          <RefreshCw size={16} className={loading || actionLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Unacknowledged"
          value={unacknowledgedCount}
          icon={<Bell size={24} />}
          changeType={unacknowledgedCount > 0 ? 'negative' : 'positive'}
          subtext="Require attention"
        />
        <StatCard
          label="Critical Alerts"
          value={criticalCount}
          icon={<AlertTriangle size={24} />}
          changeType={criticalCount > 0 ? 'negative' : 'positive'}
        />
        <StatCard
          label="Warnings"
          value={warningCount}
          icon={<Bell size={24} />}
          changeType={warningCount > 3 ? 'negative' : 'positive'}
        />
      </div>

      {/* Alerts List */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">Active Alerts</h2>
        {alerts.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${
                  alert.severity === 'critical'
                    ? 'bg-red-900/20 border-red-700/50'
                    : alert.severity === 'warning'
                    ? 'bg-yellow-900/20 border-yellow-700/50'
                    : 'bg-slate-700/30 border-slate-700/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-mono text-sm text-slate-200 break-all">{alert.title || 'Unnamed Alert'}</p>
                    {alert.message && (
                      <p className="text-xs text-slate-400 mt-1">{alert.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={
                        alert.severity === 'critical'
                          ? 'error'
                          : alert.severity === 'warning'
                          ? 'warning'
                          : 'pending'
                      }
                      label={alert.severity?.charAt(0).toUpperCase() + (alert.severity?.slice(1) || '')}
                      size="sm"
                    />
                    <StatusBadge
                      status={alert.status === 'acknowledged' ? 'success' : 'error'}
                      label={alert.status?.charAt(0).toUpperCase() + (alert.status?.slice(1) || '')}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span>{alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'N/A'}</span>
                  <span>{alert.source || 'System'}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {alert.status !== 'acknowledged' && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={actionLoading}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors border border-blue-600/30 font-medium text-xs"
                    >
                      <CheckCircle size={12} />
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => handleResolve(alert.id)}
                    disabled={actionLoading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600/20 text-green-300 hover:bg-green-600/30 transition-colors border border-green-600/30 font-medium text-xs"
                  >
                    <CheckCircle size={12} />
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-16">
            No active alerts. Your system is running smoothly!
          </p>
        )}
      </div>

      {/* Alert Guidelines */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-700/50">
          <p className="text-red-300 font-medium text-sm mb-2">Critical</p>
          <p className="text-xs text-red-200/70">Immediate action required. System may be unavailable.</p>
        </div>
        <div className="p-4 rounded-lg bg-yellow-900/20 border border-yellow-700/50">
          <p className="text-yellow-300 font-medium text-sm mb-2">Warning</p>
          <p className="text-xs text-yellow-200/70">Review soon. Performance or availability may be affected.</p>
        </div>
        <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-700/50">
          <p className="text-blue-300 font-medium text-sm mb-2">Info</p>
          <p className="text-xs text-blue-200/70">FYI notifications. System is operating normally.</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Alerts;
