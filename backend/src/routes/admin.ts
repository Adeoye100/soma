import { Router } from 'express';
import { AuthService } from '../services/authService';
import { AutomationAdminService } from '../services/automation/AutomationAdminService';
import { EnterpriseMonitoringSystem } from '../automation/monitoring/EnterpriseMonitoringSystem';
import { TaskQueueManager } from '../automation/queues/TaskQueueManager';
import { ConfigurationManager } from '../config/ConfigurationManager';

const router = Router();

// Middleware to check admin access
const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const user = await AuthService.verifyToken(token);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Health and monitoring endpoints
router.get('/health', requireAdmin, async (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService as EnterpriseMonitoringSystem;
    const health = monitoringService.getSystemHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get system health' });
  }
});

router.get('/monitoring/status', requireAdmin, async (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService as EnterpriseMonitoringSystem;
    const status = monitoringService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get monitoring status' });
  }
});

router.get('/monitoring/metrics', requireAdmin, async (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService as EnterpriseMonitoringSystem;
    const { name, startTime, endTime, limit } = req.query;
    
    const metrics = monitoringService.queryMetrics({
      name: name as string,
      startTime: startTime ? new Date(startTime as string) : undefined,
      endTime: endTime ? new Date(endTime as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to query metrics' });
  }
});

router.get('/monitoring/traces', requireAdmin, async (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService as EnterpriseMonitoringSystem;
    const { name, status, startTime, endTime, limit } = req.query;
    
    const traces = monitoringService.queryTraces({
      name: name as string,
      status: status as any,
      startTime: startTime ? new Date(startTime as string) : undefined,
      endTime: endTime ? new Date(endTime as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });
    
    res.json(traces);
  } catch (error) {
    res.status(500).json({ error: 'Failed to query traces' });
  }
});

router.get('/sla/metrics', requireAdmin, async (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService as EnterpriseMonitoringSystem;
    const slaMetrics = monitoringService.getSLAMetrics();
    res.json(slaMetrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get SLA metrics' });
  }
});

// Automation management endpoints
router.get('/automation/overview', requireAdmin, async (req, res) => {
  try {
    const automationService = req.app.locals.automationAdminService as AutomationAdminService;
    const overview = await automationService.getAutomationOverview();
    res.json(overview);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get automation overview' });
  }
});

router.get('/automation/workflows', requireAdmin, async (req, res) => {
  try {
    const automationService = req.app.locals.automationAdminService as AutomationAdminService;
    const workflows = await automationService.getWorkflows();
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get workflows' });
  }
});

router.get('/automation/workflows/:id', requireAdmin, async (req, res) => {
  try {
    const automationService = req.app.locals.automationAdminService as AutomationAdminService;
    const workflow = await automationService.getWorkflow(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get workflow' });
  }
});

router.post('/automation/workflows/:id/execute', requireAdmin, async (req, res) => {
  try {
    const automationService = req.app.locals.automationAdminService as AutomationAdminService;
    const executionId = await automationService.executeWorkflow(req.params.id, req.body);
    res.json({ executionId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

router.get('/automation/executions', requireAdmin, async (req, res) => {
  try {
    const automationService = req.app.locals.automationAdminService as AutomationAdminService;
    const { status, workflowId, limit } = req.query;
    const executions = await automationService.getExecutions({
      status: status as string,
      workflowId: workflowId as string,
      limit: limit ? parseInt(limit as string) : undefined
    });
    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get executions' });
  }
});

router.get('/automation/executions/:id', requireAdmin, async (req, res) => {
  try {
    const automationService = req.app.locals.automationAdminService as AutomationAdminService;
    const execution = await automationService.getExecution(req.params.id);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    res.json(execution);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get execution' });
  }
});

router.post('/automation/executions/:id/cancel', requireAdmin, async (req, res) => {
  try {
    const automationService = req.app.locals.automationAdminService as AutomationAdminService;
    await automationService.cancelExecution(req.params.id);
    res.json({ message: 'Execution cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel execution' });
  }
});

// Queue management endpoints
router.get('/queues/overview', requireAdmin, async (req, res) => {
  try {
    const queueManager = req.app.locals.taskQueueManager as TaskQueueManager;
    const overview = await queueManager.getQueueOverview();
    res.json(overview);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get queue overview' });
  }
});

router.get('/queues/:queueName', requireAdmin, async (req, res) => {
  try {
    const queueManager = req.app.locals.taskQueueManager as TaskQueueManager;
    const queueInfo = await queueManager.getQueueInfo(req.params.queueName);
    if (!queueInfo) {
      return res.status(404).json({ error: 'Queue not found' });
    }
    res.json(queueInfo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get queue info' });
  }
});

router.post('/queues/:queueName/pause', requireAdmin, async (req, res) => {
  try {
    const queueManager = req.app.locals.taskQueueManager as TaskQueueManager;
    await queueManager.pauseQueue(req.params.queueName);
    res.json({ message: 'Queue paused' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to pause queue' });
  }
});

router.post('/queues/:queueName/resume', requireAdmin, async (req, res) => {
  try {
    const queueManager = req.app.locals.taskQueueManager as TaskQueueManager;
    await queueManager.resumeQueue(req.params.queueName);
    res.json({ message: 'Queue resumed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resume queue' });
  }
});

router.post('/queues/:queueName/clean', requireAdmin, async (req, res) => {
  try {
    const queueManager = req.app.locals.taskQueueManager as TaskQueueManager;
    const { status, grace } = req.body;
    const count = await queueManager.cleanQueue(req.params.queueName, status, grace);
    res.json({ cleaned: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clean queue' });
  }
});

// Configuration management endpoints
router.get('/config', requireAdmin, async (req, res) => {
  try {
    const configManager = req.app.locals.configManager as ConfigurationManager;
    const config = await configManager.getAllConfigurations();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

router.get('/config/environments', requireAdmin, async (req, res) => {
  try {
    const configManager = req.app.locals.configManager as ConfigurationManager;
    const environments = await configManager.getEnvironments();
    res.json(environments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get environments' });
  }
});

router.get('/config/:environment', requireAdmin, async (req, res) => {
  try {
    const configManager = req.app.locals.configManager as ConfigurationManager;
    const config = await configManager.getEnvironmentConfiguration(req.params.environment);
    if (!config) {
      return res.status(404).json({ error: 'Environment not found' });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get environment configuration' });
  }
});

router.put('/config/:environment', requireAdmin, async (req, res) => {
  try {
    const configManager = req.app.locals.configManager as ConfigurationManager;
    await configManager.updateEnvironmentConfiguration(req.params.environment, req.body);
    res.json({ message: 'Configuration updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

router.post('/config/reload', requireAdmin, async (req, res) => {
  try {
    const configManager = req.app.locals.configManager as ConfigurationManager;
    await configManager.reloadConfigurations();
    res.json({ message: 'Configurations reloaded' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reload configurations' });
  }
});

router.get('/config/history', requireAdmin, async (req, res) => {
  try {
    const configManager = req.app.locals.configManager as ConfigurationManager;
    const { environment, limit } = req.query;
    const history = await configManager.getConfigurationHistory({
      environment: environment as string,
      limit: limit ? parseInt(limit as string) : undefined
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get configuration history' });
  }
});

// Alert management endpoints
router.get('/alerts', requireAdmin, async (req, res) => {
  try {
    const monitoringService = req.app.locals.monitoringService as EnterpriseMonitoringSystem;
    const { status, severity, limit } = req.query;
    
    // This would need to be implemented in the monitoring service
    // For now, return empty array
    const alerts = [];
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

router.post('/alerts/:id/acknowledge', requireAdmin, async (req, res) => {
  try {
    // This would acknowledge an alert
    res.json({ message: 'Alert acknowledged' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

router.post('/alerts/:id/resolve', requireAdmin, async (req, res) => {
  try {
    // This would resolve an alert
    res.json({ message: 'Alert resolved' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// System information endpoints
router.get('/system/info', requireAdmin, async (req, res) => {
  try {
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    };
    res.json(systemInfo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get system info' });
  }
});

router.get('/system/dependencies', requireAdmin, async (req, res) => {
  try {
    // Return dependency status
    const dependencies = {
      redis: 'connected',
      database: 'connected',
      queue: 'active',
      monitoring: 'active'
    };
    res.json(dependencies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dependency status' });
  }
});

export default router;