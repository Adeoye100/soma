import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminApiService, MonitoringResponse } from '../../../services/admin/adminApiService';

const Monitoring: React.FC = () => {
  const [data, setData] = useState<MonitoringResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getMonitoring();
      setData(result);
    } catch {
      // Keep last good data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return <AdminLayout title="Monitoring">Loading...</AdminLayout>;
  }

  const metrics = data?.examMetrics.last24h;
  const questionTypes = data?.distributions.byQuestionType || {};
  const difficulties = data?.distributions.byDifficulty || {};
  const hourly = data?.hourlyActivity || [];

  const maxHourlyCount = Math.max(...hourly.map(h => h.count), 1);

  const diffColors: Record<string, string> = {
    easy: 'bg-green-500',
    medium: 'bg-yellow-500',
    hard: 'bg-red-500',
  };

  const totalQuestions = Object.values(questionTypes).reduce((a, b) => a + b, 0);
  const totalDiff = Object.values(difficulties).reduce((a, b) => a + b, 0);

  return (
    <AdminLayout
      title="Monitoring"
      subtitle="Real-time performance metrics and analytics"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Success Rate (24h)</p>
          <p className="text-3xl font-bold text-green-400 mt-2">{metrics?.successRate ?? 0}%</p>
          <p className="text-slate-500 text-sm mt-2">{metrics?.success ?? 0} completed</p>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Failed (24h)</p>
          <p className="text-3xl font-bold text-red-400 mt-2">{metrics?.failed ?? 0}</p>
          <p className="text-slate-500 text-sm mt-2">Generation failures</p>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Processing (24h)</p>
          <p className="text-3xl font-bold text-yellow-400 mt-2">{metrics?.processing ?? 0}</p>
          <p className="text-slate-500 text-sm mt-2">In progress</p>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Avg Generation Time</p>
          <p className="text-3xl font-bold text-slate-50 mt-2">{data?.examMetrics.avgGenerationTime ?? 0}s</p>
          <p className="text-slate-500 text-sm mt-2">Per exam</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Question Types</h3>
          {Object.keys(questionTypes).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(questionTypes).map(([type, count]) => {
                const pct = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{type}</span>
                      <span className="text-slate-400">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No question data available</p>
          )}
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Difficulty Distribution</h3>
          {Object.keys(difficulties).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(difficulties).map(([diff, count]) => {
                const pct = totalDiff > 0 ? Math.round((count / totalDiff) * 100) : 0;
                return (
                  <div key={diff}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300 capitalize">{diff}</span>
                      <span className="text-slate-400">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className={`${diffColors[diff] || 'bg-blue-500'} h-2 rounded-full`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No difficulty data available</p>
          )}
        </div>
      </div>

      <div className="mt-6 bg-slate-900 rounded-lg p-6 border border-slate-800">
        <h3 className="text-lg font-semibold mb-4">Hourly Activity (Last 24h)</h3>
        {hourly.length > 0 ? (
          <div className="space-y-1">
            {hourly.map((entry) => (
              <div key={entry.hour} className="flex items-center gap-2">
                <span className="text-xs w-16 text-slate-400 font-mono">
                  {entry.hour.split(' ')[1] || entry.hour.slice(-5)}
                </span>
                <div className="flex-1 bg-slate-800 rounded h-6 relative">
                  <div
                    className="bg-blue-600 rounded h-full transition-all duration-300"
                    style={{ width: `${(entry.count / maxHourlyCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-8 text-right">{entry.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No activity in the last 24 hours</p>
        )}
      </div>
    </AdminLayout>
  );
};

export default Monitoring;
