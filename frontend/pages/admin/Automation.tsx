import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import { AdminApiService } from '@/services/admin/adminApiService';
import { Zap, Play, Pause, Loader, RefreshCw, AlertTriangle } from 'lucide-react';

const Automation: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);

  const loadData = async (workflowId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const [o, w, e] = await Promise.all([
        AdminApiService.getAutomationOverview(),
        AdminApiService.getWorkflows(),
        AdminApiService.getExecutions({ workflowId, limit: 10 }),
      ]);

      if (o.error || w.error || e.error) {
        setError('Some automation data failed to load');
      }

      setOverview(o.data);
      setWorkflows(w.data || []);
      setExecutions(e.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      const result = await AdminApiService.executeWorkflow(workflowId, {});
      if (result.error) {
        setError(result.error);
      } else {
        // Reload executions
        loadData(selectedWorkflow || undefined);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleWorkflowSelect = (workflowId: string) => {
    setSelectedWorkflow(workflowId);
    loadData(workflowId);
  };

  if (loading && !workflows.length) {
    return (
      <AdminLayout title="Automation" subtitle="Manage workflows and executions">
        <div className="flex items-center justify-center min-h-96 gap-3">
          <Loader className="animate-spin" size={24} />
          <span className="text-slate-400">Loading automation data...</span>
        </div>
      </AdminLayout>
    );
  }

  const activeWorkflows = workflows.filter((w) => w.status === 'active').length;
  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter((e) => e.status === 'success').length;

  return (
    <AdminLayout title="Automation" subtitle="Manage workflows and executions">
      <div className="flex gap-4 mb-6 flex-wrap">
        <button
          onClick={() => loadData(selectedWorkflow || undefined)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors border border-blue-600/30 font-medium text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-900/30 border border-yellow-800/50 flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-yellow-300">{error}</p>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Total Workflows"
          value={workflows.length}
          icon={<Zap size={24} />}
          subtext={`${activeWorkflows} active`}
        />
        <StatCard
          label="Recent Executions"
          value={totalExecutions}
          icon={<Play size={24} />}
          subtext={`${successfulExecutions} successful`}
          changeType={successfulExecutions === totalExecutions ? 'positive' : 'negative'}
        />
        <StatCard
          label="Success Rate"
          value={`${((successfulExecutions / (totalExecutions || 1)) * 100).toFixed(0)}%`}
          icon={<Pause size={24} />}
          changeType={successfulExecutions === totalExecutions ? 'positive' : 'negative'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflows List */}
        <div className="lg:col-span-2 bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4">Workflows</h2>
          {workflows.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  onClick={() => handleWorkflowSelect(workflow.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedWorkflow === workflow.id
                      ? 'bg-blue-600/20 border-blue-600/50'
                      : 'bg-slate-700/30 border-slate-700/50 hover:border-slate-600/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-mono text-sm text-slate-200 break-all">{workflow.name || workflow.id}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Created: {workflow.createdAt ? new Date(workflow.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <StatusBadge
                      status={workflow.status === 'active' ? 'active' : 'inactive'}
                      label={workflow.status?.charAt(0).toUpperCase() + (workflow.status?.slice(1) || '')}
                      size="sm"
                    />
                  </div>
                  {selectedWorkflow === workflow.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExecuteWorkflow(workflow.id);
                      }}
                      className="mt-3 w-full px-3 py-2 rounded-lg bg-blue-600/40 text-blue-300 hover:bg-blue-600/60 transition-colors border border-blue-600/50 font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <Play size={14} />
                      Execute Workflow
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No workflows available</p>
          )}
        </div>

        {/* Selected Workflow Details */}
        {selectedWorkflow && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-lg font-bold text-white mb-4">Details</h2>
            {workflows.find((w) => w.id === selectedWorkflow) && (
              <div className="space-y-4">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider">ID</p>
                  <p className="text-slate-200 font-mono text-xs break-all mt-1">{selectedWorkflow}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider">Status</p>
                  <StatusBadge
                    status={workflows.find((w) => w.id === selectedWorkflow)?.status === 'active' ? 'active' : 'inactive'}
                    label={
                      workflows
                        .find((w) => w.id === selectedWorkflow)
                        ?.status?.charAt(0)
                        .toUpperCase() + (workflows.find((w) => w.id === selectedWorkflow)?.status?.slice(1) || '')
                    }
                  />
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider">Executions</p>
                  <p className="text-slate-200 font-bold mt-1">{totalExecutions}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider">Success Rate</p>
                  <p className="text-green-400 font-bold mt-1">
                    {totalExecutions > 0 ? ((successfulExecutions / totalExecutions) * 100).toFixed(0) : 0}%
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Executions Table */}
      <div className="mt-6 bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">
          {selectedWorkflow ? 'Recent Executions' : 'All Recent Executions'}
        </h2>
        {executions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Execution ID</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Workflow</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Started</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((execution) => (
                  <tr key={execution.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-4 text-slate-200 font-mono text-xs break-all">{execution.id}</td>
                    <td className="py-3 px-4 text-slate-200 text-xs font-mono">{execution.workflowId}</td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status={
                          execution.status === 'success'
                            ? 'success'
                            : execution.status === 'error'
                            ? 'error'
                            : execution.status === 'running'
                            ? 'pending'
                            : 'inactive'
                        }
                        label={execution.status?.charAt(0).toUpperCase() + (execution.status?.slice(1) || '')}
                        size="sm"
                      />
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {execution.startedAt ? new Date(execution.startedAt).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No executions available</p>
        )}
      </div>
    </AdminLayout>
  );
};

export default Automation;
