import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { RefreshCw, CheckCircle, XCircle, Loader, Clock } from 'lucide-react';
import { AdminApiService } from '../../../services/admin/adminApiService';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

export const Monitoring: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('24h');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await AdminApiService.getMonitoring();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  // Process distributions for charts
  const typeData = (data?.distributions?.types || []).reduce((acc: any[], type: string) => {
    const existing = acc.find(i => i.name === type);
    if (existing) existing.value++;
    else acc.push({ name: type, value: 1 });
    return acc;
  }, []);

  const difficultyData = (data?.distributions?.difficulties || []).reduce((acc: any[], diff: string) => {
    const existing = acc.find(i => i.name === diff);
    if (existing) existing.value++;
    else acc.push({ name: diff, value: 1 });
    return acc;
  }, []);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Monitoring</h2>
        <div className="flex bg-[#1a1d27] rounded-lg p-1 border border-[#2a2d3e]">
          {['24h', '7d', '30d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                period === p ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1a1d27] p-6 rounded-xl border border-[#2a2d3e]">
          <p className="text-[#94a3b8] text-sm font-medium">Success Rate</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-3xl font-bold">{data?.quickMetrics?.successRate.toFixed(1)}%</p>
            <CheckCircle className="text-green-500 mb-1" size={20} />
          </div>
        </div>
        <div className="bg-[#1a1d27] p-6 rounded-xl border border-[#2a2d3e]">
          <p className="text-[#94a3b8] text-sm font-medium">Failed (24h)</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-3xl font-bold">{data?.quickMetrics?.failed24h}</p>
            <XCircle className="text-red-500 mb-1" size={20} />
          </div>
        </div>
        <div className="bg-[#1a1d27] p-6 rounded-xl border border-[#2a2d3e]">
          <p className="text-[#94a3b8] text-sm font-medium">Processing Now</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-3xl font-bold">{data?.quickMetrics?.processingNow}</p>
            <Loader className="text-blue-500 mb-1 animate-spin-slow" size={20} />
          </div>
        </div>
        <div className="bg-[#1a1d27] p-6 rounded-xl border border-[#2a2d3e]">
          <p className="text-[#94a3b8] text-sm font-medium">Avg Gen Time</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-3xl font-bold">{data?.quickMetrics?.avgGenTime.toFixed(1)}s</p>
            <Clock className="text-indigo-500 mb-1" size={20} />
          </div>
        </div>
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Hourly Activity */}
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#94a3b8] mb-6 uppercase tracking-wider">Hourly Activity</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.hourly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                <XAxis dataKey="hour" stroke="#475569" fontSize={10} tickFormatter={(h) => `${h}:00`} />
                <YAxis stroke="#475569" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Question Types */}
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#94a3b8] mb-6 uppercase tracking-wider">Question Types</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#94a3b8] mb-6 uppercase tracking-wider">Difficulty Distribution</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={difficultyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" horizontal={false} />
                <XAxis type="number" stroke="#475569" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#475569" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e' }} />
                <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Trend */}
      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#94a3b8] mb-6 uppercase tracking-wider">Generation Time Trend (Avg Seconds)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.hourly || []}>
              <defs>
                <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
              <XAxis dataKey="hour" stroke="#475569" fontSize={10} tickFormatter={(h) => `${h}:00`} />
              <YAxis stroke="#475569" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e' }} />
              <Area type="monotone" dataKey="avgTime" stroke="#818cf8" fillOpacity={1} fill="url(#colorTime)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
