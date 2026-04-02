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

  return (
    <AdminLayout
      title="Configuration"
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
      </div>
    </AdminLayout>
  );
};

export default Configuration;
