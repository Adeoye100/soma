import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/StatusBadge';
import { AdminApiService } from '@/services/admin/adminApiService';
import { Settings, Loader, RefreshCw, Save, AlertTriangle } from 'lucide-react';

const Configuration: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [environments, setEnvironments] = useState<string[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [editedConfig, setEditedConfig] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const loadData = async (env?: string) => {
    try {
      setLoading(true);
      setError(null);

      const [e, c, h] = await Promise.all([
        AdminApiService.getEnvironments(),
        env ? AdminApiService.getEnvironmentConfiguration(env) : { data: null, error: null },
        env ? AdminApiService.getConfigurationHistory({ environment: env, limit: 10 }) : { data: [], error: null },
      ]);

      if (e.error) {
        setError('Failed to load environments');
      }

      setEnvironments(e.data || []);
      if (env && c.data) {
        setConfig(c.data);
        setEditedConfig(JSON.parse(JSON.stringify(c.data)));
      }
      setHistory(h.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEnv) {
      loadData(selectedEnv);
    }
  }, [selectedEnv]);

  const handleConfigChange = (key: string, value: any) => {
    setEditedConfig({
      ...editedConfig,
      [key]: value,
    });
  };

  const handleSaveConfig = async () => {
    if (!selectedEnv) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const result = await AdminApiService.updateEnvironmentConfiguration(selectedEnv, editedConfig);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`Configuration for ${selectedEnv} updated successfully`);
        loadData(selectedEnv);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReloadConfigs = async () => {
    try {
      setLoading(true);
      const result = await AdminApiService.reloadConfigurations();
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Configurations reloaded successfully');
        loadData(selectedEnv || undefined);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !environments.length) {
    return (
      <AdminLayout title="Configuration" subtitle="Manage environment configurations">
        <div className="flex items-center justify-center min-h-96 gap-3">
          <Loader className="animate-spin" size={24} />
          <span className="text-slate-400">Loading configuration...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Configuration" subtitle="Manage environment configurations">
      <div className="flex gap-4 mb-6 flex-wrap">
        <button
          onClick={() => loadData(selectedEnv || undefined)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors border border-blue-600/30 font-medium text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
        <button
          onClick={handleReloadConfigs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors border border-purple-600/30 font-medium text-sm"
        >
          <Settings size={16} />
          Reload All
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-800/50 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-lg bg-green-900/30 border border-green-800/50 flex items-start gap-3">
          <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
          <p className="text-green-300">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Environments List */}
        <div className="lg:col-span-1 bg-slate-800 rounded-lg p-6 border border-slate-700 h-fit">
          <h2 className="text-lg font-bold text-white mb-4">Environments</h2>
          {environments.length > 0 ? (
            <div className="space-y-2">
              {environments.map((env) => (
                <button
                  key={env}
                  onClick={() => setSelectedEnv(env)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors capitalize text-sm font-medium ${
                    selectedEnv === env
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-600/50'
                      : 'bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No environments available</p>
          )}
        </div>

        {/* Configuration Editor */}
        <div className="lg:col-span-3 bg-slate-800 rounded-lg p-6 border border-slate-700">
          {selectedEnv && config && editedConfig ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white capitalize">{selectedEnv} Configuration</h2>
                  <p className="text-slate-400 text-sm mt-1">Edit settings for this environment</p>
                </div>
                <button
                  onClick={handleSaveConfig}
                  disabled={saving || JSON.stringify(config) === JSON.stringify(editedConfig)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/20 text-green-300 hover:bg-green-600/30 transition-colors border border-green-600/30 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {/* Config Fields */}
              <div className="space-y-4 mb-6">
                {Object.entries(editedConfig).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm text-slate-400 mb-2 capitalize">
                      {key.replace(/_/g, ' ')}
                    </label>
                    {typeof value === 'boolean' ? (
                      <button
                        onClick={() => handleConfigChange(key, !value)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                          value
                            ? 'bg-green-600/30 text-green-300 border border-green-600/50'
                            : 'bg-red-600/30 text-red-300 border border-red-600/50'
                        }`}
                      >
                        {value ? 'Enabled' : 'Disabled'}
                      </button>
                    ) : typeof value === 'number' ? (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => handleConfigChange(key, Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <textarea
                        value={String(value)}
                        onChange={(e) => handleConfigChange(key, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-xs"
                        rows={3}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* History */}
              {history.length > 0 && (
                <div className="border-t border-slate-700 pt-6">
                  <h3 className="font-bold text-white mb-3">Change History</h3>
                  <div className="space-y-2">
                    {history.map((entry, idx) => (
                      <div key={idx} className="text-xs p-2 bg-slate-700/30 rounded border border-slate-700/50">
                        <p className="text-slate-300 font-mono break-all">{entry.message || 'Configuration updated'}</p>
                        <p className="text-slate-500 mt-1">
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-center py-16">
              {selectedEnv ? 'Loading configuration...' : 'Select an environment to view and edit its configuration'}
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Configuration;
