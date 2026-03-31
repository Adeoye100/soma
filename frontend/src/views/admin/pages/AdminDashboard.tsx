<<<<<<< HEAD
import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import StatCard from '../components/StatCard';
import { AdminApiService, DashboardResponse } from '../../../services/admin/adminApiService';

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await AdminApiService.getDashboard();
      setData(result);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return <AdminLayout title="Dashboard">Loading...</AdminLayout>;
  }

  const stats = data?.stats;
  const completionRate = stats && stats.totalExams > 0
    ? Math.round((stats.examsByStatus.completed / stats.totalExams) * 100)
    : 0;

=======
import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import StatCard from '../components/StatCard';
import { AdminApiService } from '../../../services/admin/adminApiService';

interface DashboardData {
  totalUsers: number;
  activeExams: number;
  completedExams: number;
  systemStatus: string;
  uptime: number;
  avgResponseTime: number;
}

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const dashboardData = await AdminApiService.getDashboard();
        setData(dashboardData);
        setError(null);
      } catch (err) {
        console.error('[AdminDashboard] Error fetching data:', err);
        setError('Failed to load dashboard data');
        // Set mock data for demo
        setData({
          totalUsers: 1250,
          activeExams: 45,
          completedExams: 3200,
          systemStatus: 'Healthy',
          uptime: 99.8,
          avgResponseTime: 245,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <AdminLayout title="Dashboard">Loading...</AdminLayout>;
  }

>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
  return (
    <AdminLayout
      title="Admin Dashboard"
      subtitle="System overview and key metrics"
    >
      {error && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6 text-yellow-300">
<<<<<<< HEAD
          {error}
=======
          ⚠️ {error}
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
<<<<<<< HEAD
          label="Total Exams"
          value={stats?.totalExams ?? 0}
          change={`${stats?.newExamsThisWeek ?? 0} new this week`}
          icon="📝"
        />
        <StatCard
          label="Total Users"
          value={stats?.totalUsers ?? 0}
          change={`${stats?.newUsersThisWeek ?? 0} new this week`}
          icon="👥"
        />
        <StatCard
          label="Total Questions"
          value={stats?.totalQuestions ?? 0}
          change="Across all exams"
          icon="❓"
        />
        <StatCard
          label="Avg Score"
          value={`${stats?.avgScore ?? 0}%`}
          change="All graded sessions"
          icon="📊"
        />
        <StatCard
          label="New This Week"
          value={stats?.newExamsThisWeek ?? 0}
          change="Exams generated"
          icon="🆕"
        />
        <StatCard
          label="Completion Rate"
          value={`${completionRate}%`}
          change={`${stats?.examsByStatus.completed ?? 0} completed`}
          icon="✅"
=======
          label="Total Users"
          value={data?.totalUsers || 0}
          change="+12% this month"
          icon="👥"
        />
        <StatCard
          label="Active Exams"
          value={data?.activeExams || 0}
          change="In progress"
          icon="📝"
        />
        <StatCard
          label="Completed Exams"
          value={data?.completedExams || 0}
          change="All time"
          icon="✅"
        />
        <StatCard
          label="System Status"
          value={data?.systemStatus || 'Unknown'}
          change="All systems operational"
          icon="🟢"
        />
        <StatCard
          label="Uptime"
          value={`${data?.uptime || 0}%`}
          change="Last 30 days"
          icon="📊"
        />
        <StatCard
          label="Avg Response Time"
          value={`${data?.avgResponseTime || 0}ms`}
          change="Optimal"
          icon="⚡"
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
<<<<<<< HEAD
          <h3 className="text-lg font-semibold mb-4">Exams by Status</h3>
          <div className="space-y-3">
            {stats && Object.entries(stats.examsByStatus).map(([status, count]) => {
              const total = stats.totalExams || 1;
              const pct = Math.round((count / total) * 100);
              const colors: Record<string, string> = {
                draft: 'bg-slate-500',
                processing: 'bg-yellow-500',
                completed: 'bg-green-500',
                failed: 'bg-red-500',
              };
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 capitalize">{status}</span>
                    <span className="text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${colors[status] || 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
=======
          <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-300">Activity #{i}</span>
                <span className="text-xs text-slate-500">{i}h ago</span>
              </div>
            ))}
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
<<<<<<< HEAD
          <h3 className="text-lg font-semibold mb-4">Daily Exams (Last 30 Days)</h3>
          <div className="space-y-1">
            {data?.charts.dailyExams && data.charts.dailyExams.length > 0 ? (
              (() => {
                const maxCount = Math.max(...data.charts.dailyExams.map(d => d.count), 1);
                return data.charts.dailyExams.slice(-14).map((entry) => (
                  <div key={entry.date} className="flex items-center gap-2">
                    <span className="text-xs w-16 text-slate-400 font-mono">
                      {entry.date.slice(5)}
                    </span>
                    <div className="flex-1 bg-slate-800 rounded h-5 relative">
                      <div
                        className="bg-blue-600 rounded h-full transition-all duration-300"
                        style={{ width: `${(entry.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right">{entry.count}</span>
                  </div>
                ));
              })()
            ) : (
              <p className="text-slate-500 text-sm">No exam data available yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-slate-300 font-semibold text-sm">Title</th>
                <th className="px-6 py-3 text-left text-slate-300 font-semibold text-sm">User</th>
                <th className="px-6 py-3 text-left text-slate-300 font-semibold text-sm">Status</th>
                <th className="px-6 py-3 text-left text-slate-300 font-semibold text-sm">Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentActivity && data.recentActivity.length > 0 ? (
                data.recentActivity.map((activity, idx) => (
                  <tr key={activity.id} className={idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950'}>
                    <td className="px-6 py-3 text-slate-50 text-sm">{activity.title}</td>
                    <td className="px-6 py-3 text-slate-400 text-sm">{activity.user_email}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        activity.status === 'completed'
                          ? 'bg-green-900/30 text-green-400'
                          : activity.status === 'processing'
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : activity.status === 'failed'
                          ? 'bg-red-900/30 text-red-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {activity.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-400 text-sm">
                      {new Date(activity.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No recent activity</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
=======
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors">
              View System Logs
            </button>
            <button className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors">
              Manage Users
            </button>
            <button className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors">
              View Analytics
            </button>
            <button className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors">
              System Configuration
            </button>
          </div>
        </div>
      </div>
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
    </AdminLayout>
  );
};

export default AdminDashboard;
