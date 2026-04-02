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

  return (
    <AdminLayout
      title="Automation"
      subtitle="Manage workflows and automated tasks"
    >
      <div className="mb-6">
        <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors font-medium">
          ➕ Create Workflow
        </button>
      </div>

      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
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
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Automation;
