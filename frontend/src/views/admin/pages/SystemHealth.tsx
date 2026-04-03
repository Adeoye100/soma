import React from 'react';
import { Database, Zap, Cpu, Server, Activity, Clock } from 'lucide-react';
import { useAdminStream } from '../../../hooks/useAdminStream';

export const SystemHealth: React.FC = () => {
  const { data, connected } = useAdminStream();

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <Activity className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-amber-500';
      case 'down': case 'critical': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getMemColor = (percent: number) => {
    if (percent < 60) return 'bg-green-500';
    if (percent < 85) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold">System Health</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            data.status === 'healthy' ? 'bg-green-500/10 text-green-500' :
            data.status === 'degraded' ? 'bg-amber-500/10 text-amber-500' :
            'bg-red-500/10 text-red-500'
          }`}>
            {data.status}
          </span>
        </div>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Database */}
        <div className="bg-[#1a1d27] p-6 rounded-xl border border-[#2a2d3e]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-500">
              <Database size={24} />
            </div>
            <div className={`h-3 w-3 rounded-full ${getStatusColor(data.services.database.status)}`}></div>
          </div>
          <h4 className="text-[#94a3b8] text-sm font-medium">Database</h4>
          <p className="text-2xl font-bold mt-1">Supabase</p>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <Clock size={12} className="mr-1" />
            Response: {data.services.database.responseTime}ms
          </div>
        </div>

        {/* Redis */}
        <div className="bg-[#1a1d27] p-6 rounded-xl border border-[#2a2d3e]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-500/10 rounded-lg text-red-500">
              <Activity size={24} />
            </div>
            <div className={`h-3 w-3 rounded-full ${getStatusColor(data.services.redis.status)}`}></div>
          </div>
          <h4 className="text-[#94a3b8] text-sm font-medium">Cache Store</h4>
          <p className="text-2xl font-bold mt-1 capitalize">{data.services.redis.mode}</p>
          <div className="mt-4 flex items-center text-xs text-slate-500">
             Mode: {data.services.redis.mode === 'redis' ? 'External' : 'Local Memory'}
          </div>
        </div>

        {/* Gemini */}
        <div className="bg-[#1a1d27] p-6 rounded-xl border border-[#2a2d3e]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
              <Zap size={24} />
            </div>
            <div className={`h-3 w-3 rounded-full ${getStatusColor(data.services.gemini.status)}`}></div>
          </div>
          <h4 className="text-[#94a3b8] text-sm font-medium">AI Engine</h4>
          <p className="text-2xl font-bold mt-1">Google Gemini</p>
          <div className="mt-4">
            <span className="bg-blue-500/10 text-blue-500 text-[10px] font-bold px-2 py-0.5 rounded">CONFIGURED</span>
          </div>
        </div>

        {/* Backend */}
        <div className="bg-[#1a1d27] p-6 rounded-xl border border-[#2a2d3e]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-500/10 rounded-lg text-green-500">
              <Server size={24} />
            </div>
            <div className={`h-3 w-3 rounded-full ${getStatusColor(data.services.backend.status)}`}></div>
          </div>
          <h4 className="text-[#94a3b8] text-sm font-medium">Backend API</h4>
          <p className="text-2xl font-bold mt-1">Node.js</p>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <Clock size={12} className="mr-1" />
            Uptime: {formatUptime(data.services.backend.uptime)}
          </div>
        </div>
      </div>

      {/* Memory Usage */}
      <div className="bg-[#1a1d27] p-8 rounded-xl border border-[#2a2d3e]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold">Memory Usage</h3>
            <p className="text-sm text-slate-500">Heap usage overview</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{Math.round(data.memory.percent)}%</p>
            <p className="text-xs text-slate-500">{Math.round(data.memory.used / 1024 / 1024)} MB / {Math.round(data.memory.total / 1024 / 1024)} MB</p>
          </div>
        </div>
        
        <div className="w-full bg-[#2a2d3e] rounded-full h-4 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${getMemColor(data.memory.percent)}`} 
            style={{ width: `${data.memory.percent}%` }}
          ></div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="p-4 bg-[#0f1117] rounded-lg border border-[#2a2d3e]">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">RSS</p>
                <p className="text-lg font-bold">{(process as any).memoryUsage?.().rss ? Math.round((process as any).memoryUsage().rss / 1024 / 1024) : '---'} MB</p>
            </div>
            <div className="p-4 bg-[#0f1117] rounded-lg border border-[#2a2d3e]">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Heap Total</p>
                <p className="text-lg font-bold">{Math.round(data.memory.total / 1024 / 1024)} MB</p>
            </div>
            <div className="p-4 bg-[#0f1117] rounded-lg border border-[#2a2d3e]">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Heap Used</p>
                <p className="text-lg font-bold">{Math.round(data.memory.used / 1024 / 1024)} MB</p>
            </div>
        </div>
      </div>

      {/* System Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3e] overflow-hidden">
          <div className="p-6 border-b border-[#2a2d3e]">
            <h3 className="text-lg font-semibold">Runtime Environment</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between py-2 border-b border-[#2a2d3e]/50">
              <span className="text-slate-400">Node.js Version</span>
              <span className="font-mono text-indigo-400">{data.system.nodeVersion}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2a2d3e]/50">
              <span className="text-slate-400">Platform</span>
              <span className="capitalize">{data.system.platform}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2a2d3e]/50">
              <span className="text-slate-400">Architecture</span>
              <span className="uppercase">{data.system.arch}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Process ID</span>
              <span className="font-mono">{data.system.pid}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3e] overflow-hidden">
          <div className="p-6 border-b border-[#2a2d3e]">
            <h3 className="text-lg font-semibold">Application Config</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between py-2 border-b border-[#2a2d3e]/50">
              <span className="text-slate-400">Environment</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                data.system.env === 'production' ? 'bg-indigo-500/20 text-indigo-500' : 'bg-amber-500/20 text-amber-500'
              }`}>
                {data.system.env}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2a2d3e]/50">
              <span className="text-slate-400">Redis Enabled</span>
              <span className={process.env.REDIS_ENABLED === 'true' ? 'text-green-500' : 'text-amber-500'}>
                {process.env.REDIS_ENABLED === 'true' ? 'Active' : 'Disabled (Memory Fallback)'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2a2d3e]/50">
              <span className="text-slate-400">Worker Threads</span>
              <span className="font-mono">Enabled</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Request Logging</span>
              <span className="text-green-500">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
