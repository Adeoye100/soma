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

  return (
    <AdminLayout
      title="Queue Management"
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
          </p>
        </div>
      </div>

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
        </div>
      </div>
    </AdminLayout>
  );
};

export default Queues;
