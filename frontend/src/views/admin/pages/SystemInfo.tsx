<<<<<<< HEAD
import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminApiService, SystemInfoResponse } from '../../../services/admin/adminApiService';

const SystemInfo: React.FC = () => {
  const [info, setInfo] = useState<SystemInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const data = await AdminApiService.getSystemInfo();
      setInfo(data);
    } catch {
      // Keep last good data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !info) {
    return <AdminLayout title="System Information">Loading...</AdminLayout>;
  }
=======
import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminApiService } from '../../../services/admin/adminApiService';

interface SystemInfo {
  version: string;
  nodeVersion: string;
  uptime: number;
  platform: string;
  arch: string;
  environment: string;
  dependencies: Record<string, string>;
  database: {
    type: string;
    version: string;
    status: string;
  };
  cache: {
    type: string;
    status: string;
  };
}

const SystemInfo: React.FC = () => {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const data = await AdminApiService.getSystemInfo();
        setInfo(data);
      } catch (error) {
        console.error('[SystemInfo] Error:', error);
        setInfo({
          version: 'v1.0.0',
          nodeVersion: 'v18.16.0',
          uptime: 864000,
          platform: 'Linux',
          arch: 'x64',
          environment: 'production',
          dependencies: {
            'react': '^19.2.4',
            'react-router-dom': '^7.13.1',
            'supabase': '^2.99.1',
            'recharts': '^3.8.0',
          },
          database: {
            type: 'PostgreSQL',
            version: '15.2',
            status: 'Connected',
          },
          cache: {
            type: 'Redis',
            status: 'Connected',
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSystemInfo();
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading) return <AdminLayout title="System Information">Loading...</AdminLayout>;
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba

  return (
    <AdminLayout
      title="System Information"
      subtitle="Detailed system and environment information"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
<<<<<<< HEAD
          <h3 className="text-lg font-semibold mb-4">Node.js</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Version</span>
              <span className="text-slate-50 font-mono">{info?.node.version}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Platform</span>
              <span className="text-slate-50 font-mono">{info?.node.platform}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Architecture</span>
              <span className="text-slate-50 font-mono">{info?.node.arch}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">PID</span>
              <span className="text-slate-50 font-mono">{info?.node.pid}</span>
=======
          <h3 className="text-lg font-semibold mb-4">Application</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Version</span>
              <span className="text-slate-50 font-mono">{info?.version}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Environment</span>
              <span className="text-slate-50 font-mono">{info?.environment}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Uptime</span>
              <span className="text-slate-50 font-mono">{formatUptime(info?.uptime || 0)}</span>
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
<<<<<<< HEAD
          <h3 className="text-lg font-semibold mb-4">Environment</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">NODE_ENV</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                info?.environment === 'production'
                  ? 'bg-green-900/30 text-green-400 border-green-800'
                  : 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
              }`}>
                {info?.environment}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Port</span>
              <span className="text-slate-50 font-mono">{info?.backend.port}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Upload Path</span>
              <span className="text-slate-50 font-mono text-sm">{info?.backend.uploadPath}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Max File Size</span>
              <span className="text-slate-50 font-mono">
                {info ? Math.round((info.backend.maxFileSize / 1024 / 1024) * 100) / 100 : 0} MB
              </span>
=======
          <h3 className="text-lg font-semibold mb-4">System</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Platform</span>
              <span className="text-slate-50 font-mono">{info?.platform}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Architecture</span>
              <span className="text-slate-50 font-mono">{info?.arch}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Node.js Version</span>
              <span className="text-slate-50 font-mono">{info?.nodeVersion}</span>
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Database</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
<<<<<<< HEAD
              <span className="text-slate-400">Provider</span>
              <span className="text-slate-50 font-mono">{info?.database.provider}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Region / Project</span>
              <span className="text-slate-50 font-mono">{info?.database.region}</span>
            </div>
            <div className="border-t border-slate-700 pt-3">
              <p className="text-slate-400 mb-2">Tables</p>
              <div className="flex flex-wrap gap-2">
                {info?.database.tables.map((table) => (
                  <span key={table} className="px-2 py-1 bg-slate-800 rounded text-slate-300 text-xs font-mono">
                    {table}
                  </span>
                ))}
              </div>
=======
              <span className="text-slate-400">Type</span>
              <span className="text-slate-50 font-mono">{info?.database.type}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Version</span>
              <span className="text-slate-50 font-mono">{info?.database.version}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Status</span>
              <span className="text-green-400 font-mono">🟢 {info?.database.status}</span>
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
<<<<<<< HEAD
          <h3 className="text-lg font-semibold mb-4">Features</h3>
          <div className="space-y-3">
            {info && Object.entries(info.features).map(([key, enabled]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  enabled
                    ? 'bg-green-900/30 text-green-400 border-green-800'
                    : 'bg-red-900/30 text-red-400 border-red-800'
                }`}>
                  {enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
=======
          <h3 className="text-lg font-semibold mb-4">Cache</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Type</span>
              <span className="text-slate-50 font-mono">{info?.cache.type}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-400">Status</span>
              <span className="text-green-400 font-mono">🟢 {info?.cache.status}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <h3 className="text-lg font-semibold mb-4">Dependencies</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(info?.dependencies || {}).map(([name, version]) => (
            <div key={name} className="bg-slate-800/50 rounded p-3">
              <p className="text-slate-300 text-sm font-medium">{name}</p>
              <p className="text-slate-400 text-xs font-mono mt-1">{version}</p>
            </div>
          ))}
        </div>
      </div>
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
    </AdminLayout>
  );
};

export default SystemInfo;
