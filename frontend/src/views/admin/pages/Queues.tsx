import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminApiService, QueuesResponse } from '../../../services/admin/adminApiService';

const Queues: React.FC = () => {
  const [data, setData] = useState<QueuesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getQueues();
      setData(result);
    } catch {
      // Keep last good data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return <AdminLayout title="Queues">Loading...</AdminLayout>;
  }

  const queues = data?.queues;
  const redis = data?.redis;

  return (
    <AdminLayout
      title="Queue Management"
      subtitle="Real-time queue status from database"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Processing</p>
          <p className="text-3xl font-bold text-yellow-400 mt-2">{queues?.processing.count ?? 0}</p>
          {queues?.processing.oldest && (
            <div className="mt-3 border-t border-slate-700 pt-3">
              <p className="text-slate-500 text-xs">Oldest:</p>
              <p className="text-slate-300 text-sm truncate">{queues.processing.oldest.title}</p>
              <p className="text-slate-500 text-xs">
                Since {new Date(queues.processing.oldest.created_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Pending</p>
          <p className="text-3xl font-bold text-slate-50 mt-2">{queues?.pending.count ?? 0}</p>
          <p className="text-slate-500 text-sm mt-2">Draft exams</p>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Failed (24h)</p>
          <p className="text-3xl font-bold text-red-400 mt-2">{queues?.failed.count ?? 0}</p>
          <p className="text-slate-500 text-sm mt-2">Generation failures</p>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Completed (24h)</p>
          <p className="text-3xl font-bold text-green-400 mt-2">{queues?.completed.count ?? 0}</p>
          <p className="text-slate-500 text-sm mt-2">
            Avg: {queues?.completed.avgTime ?? 0}s
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Redis Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Mode</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                redis?.mode === 'redis'
                  ? 'bg-green-900/30 text-green-400 border-green-800'
                  : 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
              }`}>
                {redis?.mode === 'redis' ? 'Redis' : 'Memory'}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                redis?.status === 'connected'
                  ? 'bg-green-900/30 text-green-400 border-green-800'
                  : 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
              }`}>
                {redis?.status}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Queue Summary</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Processing</span>
                <span className="text-yellow-400">{queues?.processing.count ?? 0}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (queues?.processing.count ?? 0) * 10)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Pending</span>
                <span className="text-slate-400">{queues?.pending.count ?? 0}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-slate-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (queues?.pending.count ?? 0) * 10)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Failed</span>
                <span className="text-red-400">{queues?.failed.count ?? 0}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (queues?.failed.count ?? 0) * 10)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Queues;
