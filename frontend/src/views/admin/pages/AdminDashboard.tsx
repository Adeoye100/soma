import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { RefreshCw, ArrowUpRight, ArrowDownRight, FileText, Users, Award, CheckCircle, Activity, HelpCircle } from 'lucide-react';
import StatCard from '../components/StatCard';
import { AdminApiService, KPI, DashboardData } from '../../../services/admin/adminApiService';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

export const AdminDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kpiRes, dashboardRes] = await Promise.all([
        AdminApiService.getKpis(),
        AdminApiService.getDashboard()
      ]);
      setKpis(kpiRes.kpis);
      setDashboardData(dashboardRes);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {kpis.map((kpi) => (
          <StatCard 
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            change={kpi.change}
            trend={kpi.trend}
            icon={kpi.icon}
            color={kpi.color}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Area Chart */}
        <div className="lg:col-span-8 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-6">Exam Activity (Last 30 Days)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData?.timeSeries || []}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#475569" 
                  fontSize={12}
                  tickFormatter={(str) => {
                    const date = new Date(str);
                    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis stroke="#475569" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e', color: '#f1f5f9' }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#6366f1" 
                  fillOpacity={1} 
                  fill="url(#colorCompleted)" 
                  name="Completed"
                />
                <Area 
                  type="monotone" 
                  dataKey="failed" 
                  stroke="#ef4444" 
                  fillOpacity={1} 
                  fill="url(#colorFailed)" 
                  name="Failed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Donut Chart */}
        <div className="lg:col-span-4 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-6">Exam Status</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboardData?.statusBreakdown || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {(dashboardData?.statusBreakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e', color: '#f1f5f9' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Activity Table */}
        <div className="lg:col-span-7 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[#2a2d3e] flex justify-between items-center">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <button onClick={fetchData} className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center">
              <RefreshCw size={14} className="mr-1" /> Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#1e2235] text-xs uppercase tracking-wider text-[#94a3b8]">
                <tr>
                  <th className="px-6 py-4 font-semibold">Title</th>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2d3e]">
                {(dashboardData?.recentActivity || []).map((activity: any) => (
                  <tr key={activity.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium truncate max-w-[200px]">{activity.title}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{activity.user_email || 'System'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        activity.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                        activity.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                        activity.status === 'processing' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {activity.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leaderboard Preview */}
        <div className="lg:col-span-5 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[#2a2d3e]">
            <h3 className="text-lg font-semibold">Top Performing Users</h3>
          </div>
          <div className="p-6 space-y-4">
            {(dashboardData?.leaderboard || []).map((user, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/30 transition-colors border border-transparent hover:border-[#2a2d3e]">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-amber-500/20 text-amber-500' :
                    index === 1 ? 'bg-slate-300/20 text-slate-300' :
                    index === 2 ? 'bg-amber-700/20 text-amber-700' :
                    'bg-slate-800 text-slate-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{user.full_name || user.email.split('@')[0]}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-400">{user.avg_score || 0}%</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{user.exams} Exams</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
