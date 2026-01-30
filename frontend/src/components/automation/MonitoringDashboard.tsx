import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface SystemMetrics {
  activeWorkflows: number;
  completedJobs: number;
  failedJobs: number;
  averageExecutionTime: number;
  throughput: number;
  errorRate: number;
  queueLength: number;
}

interface WorkflowMetrics {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  executionCount: number;
  averageDuration: number;
  successRate: number;
  lastExecuted: string;
}

export const MonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowMetrics[]>([]);
  const [timeRange, setTimeRange] = useState('1h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/automation/metrics?range=${timeRange}`);
      const data = await response.json();
      setMetrics(data.systemMetrics);
      setWorkflows(data.workflowMetrics);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'success',
      paused: 'secondary',
      completed: 'success',
      failed: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Monitoring Dashboard</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15m">15 minutes</SelectItem>
            <SelectItem value="1h">1 hour</SelectItem>
            <SelectItem value="6h">6 hours</SelectItem>
            <SelectItem value="24h">24 hours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* System Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeWorkflows}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                {metrics.throughput} jobs/hour
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {((metrics.completedJobs / (metrics.completedJobs + metrics.failedJobs)) * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.completedJobs} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Execution Time</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(metrics.averageExecutionTime)}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.queueLength} in queue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {metrics.errorRate.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.failedJobs} failed
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Workflow List */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-medium">{workflow.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Last executed: {new Date(workflow.lastExecuted).toLocaleString()}
                    </p>
                  </div>
                  {getStatusBadge(workflow.status)}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {workflow.executionCount} executions
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {workflow.successRate.toFixed(1)}% success
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Avg: {formatDuration(workflow.averageDuration)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button onClick={fetchMetrics} variant="outline">
          Refresh Metrics
        </Button>
      </div>
    </div>
  );
};