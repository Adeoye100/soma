<<<<<<< HEAD
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
=======
import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminApiService } from '../../../services/admin/adminApiService';

interface Queue {
  id: string;
  name: string;
  status: 'running' | 'paused';
  pending: number;
  processed: number;
  failed: number;
}

const Queues: React.FC = () => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueues = async () => {
      try {
        const data = await AdminApiService.getQueues();
        setQueues(data);
      } catch (error) {
        console.error('[Queues] Error:', error);
        setQueues([
          { id: '1', name: 'Email Queue', status: 'running', pending: 45, processed: 12850, failed: 8 },
          { id: '2', name: 'PDF Processing', status: 'running', pending: 12, processed: 2345, failed: 2 },
          { id: '3', name: 'Image Optimization', status: 'paused', pending: 0, processed: 5600, failed: 15 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchQueues();
  }, []);

  const handleQueueAction = async (queueId: string, action: 'pause' | 'resume' | 'clean') => {
    try {
      if (action === 'pause') {
        await AdminApiService.pauseQueue(queueId);
      } else if (action === 'resume') {
        await AdminApiService.resumeQueue(queueId);
      } else if (action === 'clean') {
        await AdminApiService.cleanQueue(queueId);
      }
      // Refresh queues
      const data = await AdminApiService.getQueues();
      setQueues(data);
    } catch (error) {
      console.error('[Queues] Action error:', error);
    }
  };

  if (loading) return <AdminLayout title="Queues">Loading...</AdminLayout>;
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba

  return (
    <AdminLayout
      title="Queue Management"
<<<<<<< HEAD
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
=======
      subtitle="Monitor and manage task queues"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Total Pending</p>
          <p className="text-3xl font-bold text-slate-50 mt-2">
            {queues.reduce((sum, q) => sum + q.pending, 0)}
          </p>
        </div>
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Total Processed</p>
          <p className="text-3xl font-bold text-green-400 mt-2">
            {queues.reduce((sum, q) => sum + q.processed, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Total Failed</p>
          <p className="text-3xl font-bold text-red-400 mt-2">
            {queues.reduce((sum, q) => sum + q.failed, 0)}
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
          </p>
        </div>
      </div>

<<<<<<< HEAD
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
=======
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Queue Name</th>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Status</th>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Pending</th>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Processed</th>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Failed</th>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queues.map((queue, idx) => (
                <tr key={queue.id} className={idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950'}>
                  <td className="px-6 py-4 text-slate-50 font-medium">{queue.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      queue.status === 'running'
                        ? 'bg-green-900/30 text-green-400 border border-green-800'
                        : 'bg-yellow-900/30 text-yellow-400 border border-yellow-800'
                    }`}>
                      {queue.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{queue.pending}</td>
                  <td className="px-6 py-4 text-slate-300">{queue.processed}</td>
                  <td className="px-6 py-4 text-red-400">{queue.failed}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => handleQueueAction(queue.id, queue.status === 'running' ? 'pause' : 'resume')}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {queue.status === 'running' ? '⏸️' : '▶️'}
                    </button>
                    <button
                      onClick={() => handleQueueAction(queue.id, 'clean')}
                      className="text-red-400 hover:text-red-300"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
        </div>
      </div>
    </AdminLayout>
  );
};

export default Queues;
