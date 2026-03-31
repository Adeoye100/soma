<<<<<<< HEAD
import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminApiService, AutomationResponse } from '../../../services/admin/adminApiService';

const Automation: React.FC = () => {
  const [data, setData] = useState<AutomationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getAutomation();
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
    return <AdminLayout title="Automation">Loading...</AdminLayout>;
  }

  const status = data?.status || 'stopped';
  const statusBadge = status === 'running'
    ? 'bg-green-900/30 text-green-400 border-green-800'
    : status === 'paused'
    ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
    : 'bg-red-900/30 text-red-400 border-red-800';
=======
import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminApiService } from '../../../services/admin/adminApiService';

interface Workflow {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  executions: number;
  lastRun: string;
}

const Automation: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const data = await AdminApiService.getWorkflows();
        setWorkflows(data);
      } catch (error) {
        console.error('[Automation] Error:', error);
        setWorkflows([
          { id: '1', name: 'Email Notification Workflow', status: 'active', executions: 1250, lastRun: '5 mins ago' },
          { id: '2', name: 'Data Sync Process', status: 'active', executions: 850, lastRun: '10 mins ago' },
          { id: '3', name: 'Report Generation', status: 'inactive', executions: 145, lastRun: '2 days ago' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflows();
  }, []);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-900/30 text-green-400 border-green-800',
      inactive: 'bg-slate-800 text-slate-400 border-slate-700',
      error: 'bg-red-900/30 text-red-400 border-red-800',
    };
    return colors[status] || colors.inactive;
  };

  if (loading) return <AdminLayout title="Automation">Loading...</AdminLayout>;
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba

  return (
    <AdminLayout
      title="Automation"
      subtitle="Manage workflows and automated tasks"
    >
<<<<<<< HEAD
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Framework Status</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border capitalize ${statusBadge}`}>
              {status}
            </span>
          </div>
        </div>
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Version</p>
          <p className="text-2xl font-bold text-slate-50 mt-2 font-mono">{data?.version || '1.0.0'}</p>
        </div>
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Workflows</p>
          <p className="text-2xl font-bold text-slate-50 mt-2">{data?.workflows.length || 0}</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold">Workflows</h3>
        </div>
=======
      <div className="mb-6">
        <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors font-medium">
          ➕ Create Workflow
        </button>
      </div>

      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
<<<<<<< HEAD
                <th className="px-6 py-3 text-left text-slate-300 font-semibold text-sm">Name</th>
                <th className="px-6 py-3 text-left text-slate-300 font-semibold text-sm">Steps</th>
                <th className="px-6 py-3 text-left text-slate-300 font-semibold text-sm">Status</th>
                <th className="px-6 py-3 text-left text-slate-300 font-semibold text-sm">Last Run</th>
                <th className="px-6 py-3 text-left text-slate-300 font-semibold text-sm">Runs</th>
              </tr>
            </thead>
            <tbody>
              {data?.workflows && data.workflows.length > 0 ? (
                data.workflows.map((wf, idx) => (
                  <tr key={wf.id} className={idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950'}>
                    <td className="px-6 py-3">
                      <p className="text-slate-50 font-medium">{wf.name}</p>
                      <p className="text-slate-500 text-xs mt-1">{wf.description}</p>
                    </td>
                    <td className="px-6 py-3 text-slate-300">{wf.steps}</td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        wf.status === 'active'
                          ? 'bg-green-900/30 text-green-400 border-green-800'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {wf.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-300 text-sm">
                      {wf.lastRun ? new Date(wf.lastRun).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-3 text-slate-300">{wf.runCount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No workflows registered</td>
                </tr>
              )}
=======
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Workflow Name</th>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Status</th>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Executions</th>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Last Run</th>
                <th className="px-6 py-4 text-left text-slate-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((workflow, idx) => (
                <tr key={workflow.id} className={idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950'}>
                  <td className="px-6 py-4 text-slate-50">{workflow.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(workflow.status)}`}>
                      {workflow.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{workflow.executions}</td>
                  <td className="px-6 py-4 text-slate-300">{workflow.lastRun}</td>
                  <td className="px-6 py-4">
                    <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                      View
                    </button>
                  </td>
                </tr>
              ))}
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
            </tbody>
          </table>
        </div>
      </div>
<<<<<<< HEAD

      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold">Business Rules</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-slate-300 font-semibold text-sm">Name</th>
                <th className="px-6 py-3 text-left text-slate-300 font-semibold text-sm">Priority</th>
                <th className="px-6 py-3 text-left text-slate-300 font-semibold text-sm">Enabled</th>
                <th className="px-6 py-3 text-left text-slate-300 font-semibold text-sm">Description</th>
              </tr>
            </thead>
            <tbody>
              {data?.businessRules && data.businessRules.length > 0 ? (
                data.businessRules.map((rule, idx) => (
                  <tr key={rule.name} className={idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-950'}>
                    <td className="px-6 py-3 text-slate-50 font-medium">{rule.name}</td>
                    <td className="px-6 py-3 text-slate-300">{rule.priority}</td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        rule.enabled
                          ? 'bg-green-900/30 text-green-400 border-green-800'
                          : 'bg-red-900/30 text-red-400 border-red-800'
                      }`}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-400 text-sm">{rule.description}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No business rules</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data?.capabilities && data.capabilities.length > 0 && (
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Capabilities</h3>
          <div className="flex flex-wrap gap-2">
            {data.capabilities.map((cap) => (
              <span
                key={cap}
                className="px-3 py-1 rounded-full text-sm bg-blue-900/30 text-blue-400 border border-blue-800"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}
=======
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
    </AdminLayout>
  );
};

export default Automation;
