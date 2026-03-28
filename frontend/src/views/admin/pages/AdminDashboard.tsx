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

  return (
    <AdminLayout
      title="Admin Dashboard"
      subtitle="System overview and key metrics"
    >
      {error && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6 text-yellow-300">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
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
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-300">Activity #{i}</span>
                <span className="text-xs text-slate-500">{i}h ago</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
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
    </AdminLayout>
  );
};

export default AdminDashboard;
