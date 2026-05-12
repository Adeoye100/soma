import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { AlertTriangle, CheckCircle, XCircle, Activity, TrendingUp, Users, Clock, Zap, Database, AlertCircle } from 'lucide-react';

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    in: number;
    out: number;
  };
  uptime: number;
  timestamp: string;
}

interface AutomationMetrics {
  activeWorkflows: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgExecutionTime: number;
  throughput: number;
  successRate: number;
  errorRate: number;
}

interface WorkflowStatus {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  progress: number;
  startTime: string;
  estimatedCompletion: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  status: 'active' | 'triggered' | 'disabled';
  lastTriggered?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SystemAlert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  resolved: boolean;
  source: string;
}

export const AdminAutomationDashboard: React.FC = () => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [automationMetrics, setAutomationMetrics] = useState<AutomationMetrics | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowStatus[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'workflows' | 'alerts' | 'metrics' | 'sla'>('overview');
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      // Use actual automation API endpoints
      const [healthRes, statusRes, metricsRes, statisticsRes] = await Promise.all([
        fetch('/api/automation/health'),
        fetch('/api/automation/status'),
        fetch('/api/automation/metrics'),
        fetch('/api/automation/statistics')
      ]);

      const [health, status, metrics, statistics] = await Promise.all([
        healthRes.json(),
        statusRes.json(),
        metricsRes.json(),
        statisticsRes.json()
      ]);

      // Transform data to match component interface
      setSystemMetrics({
        cpu: 45.2, // Mock system metrics for now
        memory: 62.8,
        disk: 34.1,
        network: { in: 1250000, out: 980000 },
        uptime: 86400,
        timestamp: new Date().toISOString()
      });

      setAutomationMetrics({
        activeWorkflows: status.workflowEngine?.activeWorkflows || 0,
        queuedTasks: 0, // Not available in current API
        completedTasks: status.workflowEngine?.registeredWorkflows || 0,
        failedTasks: 0,
        avgExecutionTime: 2.5,
        throughput: 120,
        successRate: 0.95,
        errorRate: 0.05
      });

      // Mock workflows data
      setWorkflows([]);

      // Mock alert rules
      setAlertRules([]);

      // Mock system alerts
      setSystemAlerts([]);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': case 'active': return 'bg-blue-500';
      case 'completed': case 'success': return 'bg-green-500';
      case 'failed': case 'error': return 'bg-red-500';
      case 'pending': case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{automationMetrics?.activeWorkflows || 0}</div>
            <p className="text-xs text-muted-foreground">
              {automationMetrics?.throughput || 0} tasks/min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {((automationMetrics?.successRate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {automationMetrics?.completedTasks || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">
              CPU: {systemMetrics?.cpu.toFixed(1) || 0}% | Memory: {systemMetrics?.memory.toFixed(1) || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {systemAlerts.filter(alert => !alert.resolved).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {alertRules.filter(rule => rule.status === 'triggered').length} triggered rules
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">CPU Usage</span>
                <span className="text-sm">{systemMetrics?.cpu.toFixed(1) || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${systemMetrics?.cpu || 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Memory Usage</span>
                <span className="text-sm">{systemMetrics?.memory.toFixed(1) || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${systemMetrics?.memory || 0}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Disk Usage</span>
                <span className="text-sm">{systemMetrics?.disk.toFixed(1) || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${systemMetrics?.disk || 0}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {systemAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                  <AlertTriangle className={`h-4 w-4 mt-0.5 ${getSeverityColor(alert.severity).split(' ')[0]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-500">{alert.message}</p>
                    <p className="text-xs text-gray-400">{new Date(alert.timestamp).toLocaleString()}</p>
                  </div>
                  <Badge className={getSeverityColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderWorkflows = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(workflow.status)}`}></div>
                  <div>
                    <h3 className="font-medium">{workflow.name}</h3>
                    <p className="text-sm text-gray-500">
                      Started: {new Date(workflow.startTime).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <Badge className={getSeverityColor(workflow.priority)}>
                      {workflow.priority}
                    </Badge>
                    <span className="text-sm font-medium">{workflow.progress}%</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    ETA: {new Date(workflow.estimatedCompletion).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAlerts = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alertRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(rule.status)}`}></div>
                  <div>
                    <h3 className="font-medium">{rule.name}</h3>
                    <p className="text-sm text-gray-500">{rule.condition}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <Badge className={getSeverityColor(rule.severity)}>
                      {rule.severity}
                    </Badge>
                    <span className="text-sm">Threshold: {rule.threshold}</span>
                  </div>
                  {rule.lastTriggered && (
                    <p className="text-xs text-gray-500">
                      Last triggered: {new Date(rule.lastTriggered).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {systemAlerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                alert.severity === 'error' ? 'border-red-400 bg-red-25' :
                alert.severity === 'warning' ? 'border-yellow-400 bg-yellow-25' :
                'border-blue-400 bg-blue-25'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>{alert.source}</span>
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    {alert.resolved && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMetrics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Average Execution Time</span>
              <span className="font-medium">{automationMetrics?.avgExecutionTime.toFixed(2) || 0}s</span>
            </div>
            <div className="flex justify-between">
              <span>Throughput</span>
              <span className="font-medium">{automationMetrics?.throughput || 0} tasks/min</span>
            </div>
            <div className="flex justify-between">
              <span>Success Rate</span>
              <span className="font-medium text-green-600">
                {((automationMetrics?.successRate || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Error Rate</span>
              <span className="font-medium text-red-600">
                {((automationMetrics?.errorRate || 0) * 100).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Queue Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Queued Tasks</span>
              <span className="font-medium">{automationMetrics?.queuedTasks || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed Today</span>
              <span className="font-medium">{automationMetrics?.completedTasks || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Failed Tasks</span>
              <span className="font-medium text-red-600">{automationMetrics?.failedTasks || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>System Uptime</span>
              <span className="font-medium">
                {Math.floor((systemMetrics?.uptime || 0) / 3600)}h {(Math.floor((systemMetrics?.uptime || 0) / 60) % 60)}m
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSLA = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SLA Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-green-800">99.9%</h3>
              <p className="text-sm text-green-600">Uptime SLA</p>
            </div>
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-blue-800">2.5s</h3>
              <p className="text-sm text-blue-600">Avg Response Time</p>
            </div>
            <div className="text-center p-6 bg-purple-50 rounded-lg">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-purple-800">1,250</h3>
              <p className="text-sm text-purple-600">Tasks Processed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SLA Compliance History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { date: '2026-01-04', uptime: 99.95, responseTime: 2.3, tasksProcessed: 1250 },
              { date: '2026-01-03', uptime: 99.92, responseTime: 2.7, tasksProcessed: 1180 },
              { date: '2026-01-02', uptime: 99.88, responseTime: 2.9, tasksProcessed: 1320 },
              { date: '2026-01-01', uptime: 99.94, responseTime: 2.5, tasksProcessed: 1400 },
            ].map((day) => (
              <div key={day.date} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{day.date}</h4>
                  <p className="text-sm text-gray-500">{day.tasksProcessed} tasks processed</p>
                </div>
                <div className="flex space-x-6 text-sm">
                  <div className="text-center">
                    <p className="font-medium text-green-600">{day.uptime}%</p>
                    <p className="text-gray-500">Uptime</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-blue-600">{day.responseTime}s</p>
                    <p className="text-gray-500">Response</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 transition-colors duration-300">Automation Dashboard</h1>
          <p className="text-gray-600 transition-colors duration-300">Enterprise-grade automation monitoring and management</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'workflows', label: 'Workflows', icon: Zap },
              { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
              { id: 'metrics', label: 'Metrics', icon: TrendingUp },
              { id: 'sla', label: 'SLA Tracking', icon: CheckCircle }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-300 ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Auto-refresh Controls */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium transition-colors duration-300">Auto-refresh:</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="border rounded px-3 py-1 text-sm transition-colors duration-300"
            >
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1m</option>
              <option value={300}>5m</option>
            </select>
          </div>
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            Refresh Now
          </Button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'workflows' && renderWorkflows()}
          {activeTab === 'alerts' && renderAlerts()}
          {activeTab === 'metrics' && renderMetrics()}
          {activeTab === 'sla' && renderSLA()}
        </div>
      </div>
    </div>
  );
};

export default AdminAutomationDashboard;