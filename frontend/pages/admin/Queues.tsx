import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import { AdminApiService } from '@/services/admin/adminApiService';
import { Gauge, Play, Pause, Trash2, Loader, RefreshCw, AlertTriangle } from 'lucide-react';

const Queues: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [o, qList] = await Promise.all([
        AdminApiService.getQueueOverview(),
        AdminApiService.getQueueOverview(),
      ]);

      if (o.error || qList.error) {
        setError('Failed to load queue data');
      }

      setOverview(o.data);
      setQueues(o.data?.queues || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePauseQueue = async (queueName: string) => {
    try {
      setActionLoading(true);
      const result = await AdminApiService.pauseQueue(queueName);
      if (result.error) {
        setError(result.error);
      } else {
        loadData();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeQueue = async (queueName: string) => {
    try {
      setActionLoading(true);
      const result = await AdminApiService.resumeQueue(queueName);
      if (result.error) {
        setError(result.error);
      } else {
        loadData();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCleanQueue = async (queueName: string) => {
    if (!window.confirm(`Are you sure you want to clean the "${queueName}" queue?`)) return;

    try {
      setActionLoading(true);
      const result = await AdminApiService.cleanQueue(queueName, 'failed');
      if (result.error) {
        setError(result.error);
      } else {
        loadData();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !queues.length) {
    return (
      <AdminLayout title="Queues" subtitle="Manage task queues and workers">
        <div className="flex items-center justify-center min-h-96 gap-3">
          <Loader className="animate-spin" size={24} />
          <span className="text-slate-400">Loading queue data...</span>
        </div>
      </AdminLayout>
    );
  }

  const activeQueues = queues.filter((q) => q.status === 'active').length;
  const totalJobs = queues.reduce((sum, q) => sum + (q.count || 0), 0);
  const failedJobs = queues.reduce((sum, q) => sum + (q.failedCount || 0), 0);

  return (
    <AdminLayout title="Queues" subtitle="Manage task queues and workers">
      <div className="flex gap-4 mb-6 flex-wrap">
        <button
          onClick={loadData}
          disabled={loading || actionLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors border border-blue-600/30 font-medium text-sm"
        >
          <RefreshCw size={16} className={loading || actionLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-900/30 border border-yellow-800/50 flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-yellow-300">{error}</p>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Active Queues"
          value={activeQueues}
          icon={<Gauge size={24} />}
          subtext={`of ${queues.length} total`}
          changeType={activeQueues === queues.length ? 'positive' : 'negative'}
        />
        <StatCard
          label="Total Jobs"
          value={totalJobs}
          icon={<Play size={24} />}
          subtext="Pending & active"
        />
        <StatCard
          label="Failed Jobs"
          value={failedJobs}
          icon={<Pause size={24} />}
          changeType={failedJobs === 0 ? 'positive' : 'negative'}
        />
      </div>

      {/* Queues List */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">All Queues</h2>
        {queues.length > 0 ? (
          <div className="space-y-3">
            {queues.map((queue) => (
              <div
                key={queue.name}
                className="p-4 rounded-lg bg-slate-700/30 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-mono text-sm text-slate-200">{queue.name}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>Jobs: {queue.count || 0}</span>
                      <span>Failed: {queue.failedCount || 0}</span>
                      <span>Delayed: {queue.delayedCount || 0}</span>
                    </div>
                  </div>
                  <StatusBadge
                    status={queue.status === 'active' || queue.paused === false ? 'active' : 'inactive'}
                    label={queue.paused ? 'Paused' : 'Active'}
                    size="sm"
                  />
                </div>

                {/* Queue Progress */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="text-slate-400">Processing Rate</span>
                    <span className="text-slate-300">{((queue.processingRate || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-600/30 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${(queue.processingRate || 0) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {queue.paused ? (
                    <button
                      onClick={() => handleResumeQueue(queue.name)}
                      disabled={actionLoading}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600/20 text-green-300 hover:bg-green-600/30 transition-colors border border-green-600/30 font-medium text-xs"
                    >
                      <Play size={12} />
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePauseQueue(queue.name)}
                      disabled={actionLoading}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/30 transition-colors border border-yellow-600/30 font-medium text-xs"
                    >
                      <Pause size={12} />
                      Pause
                    </button>
                  )}
                  <button
                    onClick={() => handleCleanQueue(queue.name)}
                    disabled={actionLoading || queue.failedCount === 0}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 transition-colors border border-red-600/30 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={12} />
                    Clean
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No queues available</p>
        )}
      </div>
    </AdminLayout>
  );
};

export default Queues;
