<<<<<<< HEAD
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
=======
import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminApiService } from '../../../services/admin/adminApiService';

interface ConfigItem {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean';
  editable: boolean;
}

const Configuration: React.FC = () => {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const data = await AdminApiService.getConfiguration();
        setConfigs(data);
      } catch (error) {
        console.error('[Configuration] Error:', error);
        setConfigs([
          { key: 'MAX_FILE_SIZE', value: '100', type: 'number', editable: true },
          { key: 'API_TIMEOUT', value: '30000', type: 'number', editable: true },
          { key: 'ENABLE_DEBUG', value: 'false', type: 'boolean', editable: true },
          { key: 'DATABASE_URL', value: '***hidden***', type: 'string', editable: false },
          { key: 'CACHE_TTL', value: '3600', type: 'number', editable: true },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, []);

  const handleEdit = (config: ConfigItem) => {
    setEditingKey(config.key);
    setEditValue(config.value);
  };

  const handleSave = async (key: string) => {
    try {
      await AdminApiService.updateConfiguration(key, editValue);
      setConfigs(configs.map(c => c.key === key ? { ...c, value: editValue } : c));
      setEditingKey(null);
    } catch (error) {
      console.error('[Configuration] Save error:', error);
    }
  };

  if (loading) return <AdminLayout title="Configuration">Loading...</AdminLayout>;
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba

  return (
    <AdminLayout
      title="Configuration"
<<<<<<< HEAD
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
=======
      subtitle="Manage system configuration and environment variables"
    >
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Configuration Key</th>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Value</th>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Type</th>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config, idx) => (
                <tr key={config.key} className={idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950'}>
                  <td className="px-6 py-4 text-slate-50 font-mono text-sm">{config.key}</td>
                  <td className="px-6 py-4">
                    {editingKey === config.key ? (
                      <input
                        type={config.type === 'number' ? 'number' : 'text'}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="bg-slate-800 text-slate-50 px-3 py-1 rounded border border-slate-700 focus:border-blue-500 outline-none"
                      />
                    ) : (
                      <span className="text-slate-300 font-mono">{config.value}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-400 text-sm">{config.type}</span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    {config.editable ? (
                      <>
                        {editingKey === config.key ? (
                          <>
                            <button
                              onClick={() => handleSave(config.key)}
                              className="text-green-400 hover:text-green-300 font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingKey(null)}
                              className="text-red-400 hover:text-red-300 font-medium"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleEdit(config)}
                            className="text-blue-400 hover:text-blue-300 font-medium"
                          >
                            Edit
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-500 text-xs">Read-only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <p className="text-blue-300 text-sm">
          ℹ️ Configuration changes take effect immediately. Some changes may require service restart.
        </p>
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
      </div>
    </AdminLayout>
  );
};

export default Configuration;
