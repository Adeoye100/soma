import React, { useState, useEffect } from 'react';
import { List, RefreshCw, Loader, Clock, CheckCircle, XCircle, Play } from 'lucide-react';
import { AdminApiService } from '../../../services/admin/adminApiService';

export const Queues: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await AdminApiService.getQueues();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#f1f5f9]">Job Queues</h2>
        <button onClick={fetchData} className="text-indigo-400 hover:text-indigo-300 flex items-center text-sm">
          <RefreshCw size={14} className="mr-2" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1a1d27] p-6 rounded-xl border border-[#2a2d3e]">
          <p className="text-[#94a3b8] text-sm font-medium">Processing</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-3xl font-bold">{data?.processing || 0}</p>
            <Loader className="text-blue-500 animate-spin" size={24} />
          </div>
        </div>
        <div className="bg-[#1a1d27] p-6 rounded-xl border border-[#2a2d3e]">
          <p className="text-[#94a3b8] text-sm font-medium">Pending</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-3xl font-bold">{data?.pending || 0}</p>
            <Clock className="text-amber-500" size={24} />
          </div>
        </div>
        <div className="bg-[#1a1d27] p-6 rounded-xl border border-[#2a2d3e]">
          <p className="text-[#94a3b8] text-sm font-medium">Failed (24h)</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-3xl font-bold">{data?.failed24h || 0}</p>
            <XCircle className="text-red-500" size={24} />
          </div>
        </div>
        <div className="bg-[#1a1d27] p-6 rounded-xl border border-[#2a2d3e]">
          <p className="text-[#94a3b8] text-sm font-medium">Completed (24h)</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-3xl font-bold">{data?.completed24h || 0}</p>
            <CheckCircle className="text-green-500" size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
            <div className="p-6 border-b border-[#2a2d3e]">
                <h3 className="text-lg font-semibold">Queue Health</h3>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-[#2a2d3e]/50">
                    <span className="text-slate-400">Queue Backend</span>
                    <span className="font-semibold text-green-500">{data?.redisMode || 'Local Memory'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2a2d3e]/50">
                    <span className="text-slate-400">Oldest Item Age</span>
                    <span className="text-slate-200">
                        {data?.oldestStuck ? `${Math.round((Date.now() - new Date(data.oldestStuck.created_at).getTime()) / 60000)} mins` : 'N/A'}
                    </span>
                </div>
            </div>
          </div>
          
          <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
            <div className="p-6 border-b border-[#2a2d3e]">
                <h3 className="text-lg font-semibold">Oldest Processing Job</h3>
            </div>
            <div className="p-6">
                {data?.oldestStuck ? (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-indigo-400">{data.oldestStuck.title}</p>
                            <p className="text-xs text-slate-500">ID: {data.oldestStuck.id}</p>
                        </div>
                        <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-500 text-[10px] font-bold">STUCK?</span>
                    </div>
                ) : (
                    <p className="text-slate-500 text-center py-4 italic">No active jobs in queue</p>
                )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default Queues;
