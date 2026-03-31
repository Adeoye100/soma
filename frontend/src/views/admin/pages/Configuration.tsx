import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminApiService, ConfigurationResponse } from '../../../services/admin/adminApiService';

const Configuration: React.FC = () => {
  const [config, setConfig] = useState<ConfigurationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const data = await AdminApiService.getConfiguration();
      setConfig(data);
    } catch {
      // Keep last good data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !config) {
    return <AdminLayout title="Configuration">Loading...</AdminLayout>;
  }

  return (
    <AdminLayout
      title="Configuration"
      subtitle="Application configuration (read-only, non-sensitive values)"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Exam Settings</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Max Questions Per Exam</span>
              <span className="text-slate-50 font-mono">{config?.exam.maxQuestionsPerExam}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Min Questions Per Exam</span>
              <span className="text-slate-50 font-mono">{config?.exam.minQuestionsPerExam}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Default Difficulty</span>
              <span className="text-slate-50 font-mono capitalize">{config?.exam.defaultDifficulty}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Max File Size</span>
              <span className="text-slate-50 font-mono">{config?.exam.maxFileSizeMB} MB</span>
            </div>
            <div className="border-t border-slate-700 pt-3">
              <p className="text-slate-400 mb-2">Supported Types</p>
              <div className="flex flex-wrap gap-2">
                {config?.exam.supportedTypes.map((type) => (
                  <span key={type} className="px-2 py-1 bg-slate-800 rounded text-slate-300 text-xs font-mono">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">AI Provider</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Provider</span>
              <span className="text-slate-50 font-mono">{config?.ai.provider}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Model</span>
              <span className="text-slate-50 font-mono text-sm">{config?.ai.model}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">API Key</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-mono">••••••••</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                  config?.ai.configured
                    ? 'bg-green-900/30 text-green-400 border-green-800'
                    : 'bg-red-900/30 text-red-400 border-red-800'
                }`}>
                  {config?.ai.configured ? 'Configured' : 'Not Set'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Security</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">JWT Expiration</span>
              <span className="text-slate-50 font-mono">{config?.security.jwtExpiration}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Rate Limit</span>
              <span className="text-slate-50 font-mono">{config?.security.rateLimitRequests} req/window</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Throttle Limit</span>
              <span className="text-slate-50 font-mono">{config?.security.throttleLimit} req/min</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Storage</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Upload Path</span>
              <span className="text-slate-50 font-mono text-sm">{config?.storage.uploadPath}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Redis Enabled</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                config?.storage.redis.enabled
                  ? 'bg-green-900/30 text-green-400 border-green-800'
                  : 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
              }`}>
                {config?.storage.redis.enabled ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Cache Mode</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                config?.storage.redis.mode === 'redis'
                  ? 'bg-green-900/30 text-green-400 border-green-800'
                  : 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
              }`}>
                {config?.storage.redis.mode === 'redis' ? 'Redis' : 'Memory Fallback'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Configuration;
