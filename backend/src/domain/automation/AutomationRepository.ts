import { 
  AutomationConfig, 
  AutomationResult, 
  AutomationEvent, 
  AutomationTrigger,
  ScheduledTask,
  AutomationRule,
  ExternalIntegration,
  BusinessRule,
  WorkflowContext,
  AutomationStatus,
  AutomationHistory,
  IntegrationConfig,
  AutomationTemplate,
  AutomationAnalytics,
  AutomationJob,
  JobStatus,
  QueueStats,
  TaskExecutionLog,
  AutomationMetrics,
  RuleExecutionResult
} from './types';
import { IAutomationRepository } from './interfaces';

/**
 * In-memory implementation of IAutomationRepository
 * Provides data persistence for automation configurations, results, and logs
 */
export class AutomationRepository implements IAutomationRepository {
  private automations: Map<string, AutomationConfig> = new Map();
  private results: Map<string, AutomationResult[]> = new Map();
  private events: AutomationEvent[] = [];
  private triggers: Map<string, AutomationTrigger> = new Map();
  private tasks: Map<string, ScheduledTask> = new Map();
  private rules: Map<string, AutomationRule> = new Map();
  private integrations: Map<string, ExternalIntegration> = new Map();
  private businessRules: Map<string, BusinessRule> = new Map();
  private workflowContexts: Map<string, WorkflowContext> = new Map();
  private jobQueue: Map<string, AutomationJob> = new Map();
  private jobStatuses: Map<string, JobStatus> = new Map();
  private taskExecutionLogs: Map<string, TaskExecutionLog[]> = new Map();
  private automationAnalytics: Map<string, AutomationAnalytics> = new Map();
  private templates: Map<string, AutomationTemplate> = new Map();
  private integrationConfigs: Map<string, IntegrationConfig> = new Map();

  constructor() {
    this.initializeDefaultData();
  }

  /**
   * Initialize repository with default data
   */
  private initializeDefaultData(): void {
    // Initialize default templates
    const defaultTemplates: AutomationTemplate[] = [
      {
        id: 'template-1',
        name: 'Email Notification Template',
        description: 'Send email notifications based on exam completion',
        category: 'notification',
        config: {
          enabled: true,
          triggers: ['exam_completed'],
          conditions: [
            {
              id: 'condition-1',
              type: 'grade_threshold',
              config: { minGrade: 70, maxGrade: 100 },
              description: 'Check if grade is above threshold'
            }
          ],
          actions: [
            {
              id: 'action-1',
              type: 'send_email',
              config: { 
                template: 'exam_completed',
                recipients: ['student', 'instructor'] 
              },
              description: 'Send completion notification'
            }
          ],
          metadata: { version: '1.0.0', createdBy: 'system' }
        },
        parameters: [
          { name: 'minGrade', type: 'number', required: true, default: 70 },
          { name: 'recipients', type: 'array', required: true, default: ['student'] }
        ],
        tags: ['email', 'notification', 'exam'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'template-2',
        name: 'Grade Analysis Template',
        description: 'Analyze exam grades and generate reports',
        category: 'analysis',
        config: {
          enabled: true,
          triggers: ['exam_completed'],
          conditions: [
            {
              id: 'condition-2',
              type: 'batch_processing',
              config: { batchSize: 10 },
              description: 'Process in batches'
            }
          ],
          actions: [
            {
              id: 'action-2',
              type: 'generate_report',
              config: { 
                format: 'pdf',
                includeCharts: true,
                sections: ['summary', 'statistics', 'recommendations'] 
              },
              description: 'Generate analysis report'
            }
          ],
          metadata: { version: '1.0.0', createdBy: 'system' }
        },
        parameters: [
          { name: 'batchSize', type: 'number', required: true, default: 10 },
          { name: 'includeCharts', type: 'boolean', required: false, default: true }
        ],
        tags: ['analysis', 'report', 'grade'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });

    // Initialize default integrations
    const defaultIntegrations: ExternalIntegration[] = [
      {
        id: 'integration-1',
        name: 'Email Service',
        type: 'smtp',
        config: {
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
          }
        },
        enabled: true,
        lastSync: new Date(),
        healthStatus: 'healthy'
      },
      {
        id: 'integration-2',
        name: 'Database Service',
        type: 'database',
        config: {
          connectionString: process.env.DATABASE_URL || '',
          poolSize: 10,
          timeout: 5000
        },
        enabled: true,
        lastSync: new Date(),
        healthStatus: 'healthy'
      }
    ];

    defaultIntegrations.forEach(integration => {
      this.integrations.set(integration.id, integration);
    });
  }

  // Automation Configuration Methods
  async saveAutomation(config: AutomationConfig): Promise<void> {
    this.automations.set(config.id, config);
  }

  async getAutomation(id: string): Promise<AutomationConfig | null> {
    return this.automations.get(id) || null;
  }

  async getAllAutomations(): Promise<AutomationConfig[]> {
    return Array.from(this.automations.values());
  }

  async updateAutomation(id: string, updates: Partial<AutomationConfig>): Promise<boolean> {
    const existing = this.automations.get(id);
    if (!existing) return false;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.automations.set(id, updated);
    return true;
  }

  async deleteAutomation(id: string): Promise<boolean> {
    const deleted = this.automations.delete(id);
    
    // Clean up related data
    if (deleted) {
      this.results.delete(id);
      this.workflowContexts.delete(id);
      this.automationAnalytics.delete(id);
    }
    
    return deleted;
  }

  // Automation Results Methods
  async saveResult(result: AutomationResult): Promise<void> {
    const results = this.results.get(result.automationId) || [];
    results.push(result);
    
    // Keep only last 1000 results per automation
    if (results.length > 1000) {
      results.splice(0, results.length - 1000);
    }
    
    this.results.set(result.automationId, results);
  }

  async getResults(automationId: string, limit?: number): Promise<AutomationResult[]> {
    const results = this.results.get(automationId) || [];
    return limit ? results.slice(-limit) : results;
  }

  async getResult(id: string): Promise<AutomationResult | null> {
    for (const results of this.results.values()) {
      const result = results.find(r => r.id === id);
      if (result) return result;
    }
    return null;
  }

  async deleteResults(automationId: string, beforeDate?: Date): Promise<number> {
    const results = this.results.get(automationId) || [];
    let deletedCount = 0;

    const filteredResults = results.filter(result => {
      if (beforeDate && result.timestamp < beforeDate) {
        deletedCount++;
        return false;
      }
      return true;
    });

    this.results.set(automationId, filteredResults);
    return deletedCount;
  }

  // Event Management Methods
  async saveEvent(event: AutomationEvent): Promise<void> {
    this.events.push(event);
    
    // Keep only last 10000 events
    if (this.events.length > 10000) {
      this.events.splice(0, this.events.length - 10000);
    }
  }

  async getEvents(automationId?: string, limit?: number): Promise<AutomationEvent[]> {
    let filteredEvents = this.events;
    
    if (automationId) {
      filteredEvents = this.events.filter(event => event.automationId === automationId);
    }
    
    return limit ? filteredEvents.slice(-limit) : filteredEvents;
  }

  async getEvent(id: string): Promise<AutomationEvent | null> {
    return this.events.find(event => event.id === id) || null;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const index = this.events.findIndex(event => event.id === id);
    if (index === -1) return false;
    
    this.events.splice(index, 1);
    return true;
  }

  // Trigger Management Methods
  async saveTrigger(trigger: AutomationTrigger): Promise<void> {
    this.triggers.set(trigger.id, trigger);
  }

  async getTrigger(id: string): Promise<AutomationTrigger | null> {
    return this.triggers.get(id) || null;
  }

  async getAllTriggers(): Promise<AutomationTrigger[]> {
    return Array.from(this.triggers.values());
  }

  async deleteTrigger(id: string): Promise<boolean> {
    return this.triggers.delete(id);
  }

  // Scheduled Task Methods
  async saveTask(task: ScheduledTask): Promise<void> {
    this.tasks.set(task.id, task);
  }

  async getTask(id: string): Promise<ScheduledTask | null> {
    return this.tasks.get(id) || null;
  }

  async getAllTasks(): Promise<ScheduledTask[]> {
    return Array.from(this.tasks.values());
  }

  async updateTask(id: string, updates: Partial<ScheduledTask>): Promise<boolean> {
    const existing = this.tasks.get(id);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    this.tasks.set(id, updated);
    return true;
  }

  async deleteTask(id: string): Promise<boolean> {
    const deleted = this.tasks.delete(id);
    
    // Clean up execution logs
    if (deleted) {
      this.taskExecutionLogs.delete(id);
    }
    
    return deleted;
  }

  // Rule Management Methods
  async saveRule(rule: AutomationRule): Promise<void> {
    this.rules.set(rule.id, rule);
  }

  async getRule(id: string): Promise<AutomationRule | null> {
    return this.rules.get(id) || null;
  }

  async getAllRules(): Promise<AutomationRule[]> {
    return Array.from(this.rules.values());
  }

  async updateRule(id: string, updates: Partial<AutomationRule>): Promise<boolean> {
    const existing = this.rules.get(id);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    this.rules.set(id, updated);
    return true;
  }

  async deleteRule(id: string): Promise<boolean> {
    return this.rules.delete(id);
  }

  // Integration Management Methods
  async saveIntegration(integration: ExternalIntegration): Promise<void> {
    this.integrations.set(integration.id, integration);
  }

  async getIntegration(id: string): Promise<ExternalIntegration | null> {
    return this.integrations.get(id) || null;
  }

  async getAllIntegrations(): Promise<ExternalIntegration[]> {
    return Array.from(this.integrations.values());
  }

  async updateIntegration(id: string, updates: Partial<ExternalIntegration>): Promise<boolean> {
    const existing = this.integrations.get(id);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    this.integrations.set(id, updated);
    return true;
  }

  async deleteIntegration(id: string): Promise<boolean> {
    return this.integrations.delete(id);
  }

  // Business Rule Methods
  async saveBusinessRule(rule: BusinessRule): Promise<void> {
    this.businessRules.set(rule.id, rule);
  }

  async getBusinessRule(id: string): Promise<BusinessRule | null> {
    return this.businessRules.get(id) || null;
  }

  async getAllBusinessRules(): Promise<BusinessRule[]> {
    return Array.from(this.businessRules.values());
  }

  async deleteBusinessRule(id: string): Promise<boolean> {
    return this.businessRules.delete(id);
  }

  // Workflow Context Methods
  async saveWorkflowContext(context: WorkflowContext): Promise<void> {
    this.workflowContexts.set(context.id, context);
  }

  async getWorkflowContext(id: string): Promise<WorkflowContext | null> {
    return this.workflowContexts.get(id) || null;
  }

  async getAllWorkflowContexts(): Promise<WorkflowContext[]> {
    return Array.from(this.workflowContexts.values());
  }

  async deleteWorkflowContext(id: string): Promise<boolean> {
    return this.workflowContexts.delete(id);
  }

  // Job Queue Methods
  async saveJob(job: AutomationJob): Promise<void> {
    this.jobQueue.set(job.id, job);
  }

  async getJob(id: string): Promise<AutomationJob | null> {
    return this.jobQueue.get(id) || null;
  }

  async getAllJobs(): Promise<AutomationJob[]> {
    return Array.from(this.jobQueue.values());
  }

  async updateJob(id: string, updates: Partial<AutomationJob>): Promise<boolean> {
    const existing = this.jobQueue.get(id);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    this.jobQueue.set(id, updated);
    return true;
  }

  async deleteJob(id: string): Promise<boolean> {
    return this.jobQueue.delete(id);
  }

  // Job Status Methods
  async saveJobStatus(status: JobStatus): Promise<void> {
    this.jobStatuses.set(status.id, status);
  }

  async getJobStatus(id: string): Promise<JobStatus | null> {
    return this.jobStatuses.get(id) || null;
  }

  async getAllJobStatuses(): Promise<JobStatus[]> {
    return Array.from(this.jobStatuses.values());
  }

  async updateJobStatus(id: string, updates: Partial<JobStatus>): Promise<boolean> {
    const existing = this.jobStatuses.get(id);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    this.jobStatuses.set(id, updated);
    return true;
  }

  // Task Execution Log Methods
  async saveTaskExecutionLog(log: TaskExecutionLog): Promise<void> {
    const logs = this.taskExecutionLogs.get(log.taskId) || [];
    logs.push(log);
    
    // Keep only last 1000 logs per task
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    this.taskExecutionLogs.set(log.taskId, logs);
  }

  async getTaskExecutionLogs(taskId: string, limit?: number): Promise<TaskExecutionLog[]> {
    const logs = this.taskExecutionLogs.get(taskId) || [];
    return limit ? logs.slice(-limit) : logs;
  }

  // Analytics Methods
  async saveAutomationAnalytics(analytics: AutomationAnalytics): Promise<void> {
    this.automationAnalytics.set(analytics.automationId, analytics);
  }

  async getAutomationAnalytics(automationId: string): Promise<AutomationAnalytics | null> {
    return this.automationAnalytics.get(automationId) || null;
  }

  async getAllAutomationAnalytics(): Promise<AutomationAnalytics[]> {
    return Array.from(this.automationAnalytics.values());
  }

  // Template Management Methods
  async saveTemplate(template: AutomationTemplate): Promise<void> {
    this.templates.set(template.id, template);
  }

  async getTemplate(id: string): Promise<AutomationTemplate | null> {
    return this.templates.get(id) || null;
  }

  async getAllTemplates(): Promise<AutomationTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplatesByCategory(category: string): Promise<AutomationTemplate[]> {
    return Array.from(this.templates.values()).filter(template => template.category === category);
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }

  // Integration Configuration Methods
  async saveIntegrationConfig(config: IntegrationConfig): Promise<void> {
    this.integrationConfigs.set(config.id, config);
  }

  async getIntegrationConfig(id: string): Promise<IntegrationConfig | null> {
    return this.integrationConfigs.get(id) || null;
  }

  async getAllIntegrationConfigs(): Promise<IntegrationConfig[]> {
    return Array.from(this.integrationConfigs.values());
  }

  async deleteIntegrationConfig(id: string): Promise<boolean> {
    return this.integrationConfigs.delete(id);
  }

  // Utility Methods
  async getStatistics(): Promise<any> {
    return {
      automations: this.automations.size,
      results: this.results.size,
      events: this.events.length,
      triggers: this.triggers.size,
      tasks: this.tasks.size,
      rules: this.rules.size,
      integrations: this.integrations.size,
      businessRules: this.businessRules.size,
      workflowContexts: this.workflowContexts.size,
      jobs: this.jobQueue.size,
      jobStatuses: this.jobStatuses.size,
      taskExecutionLogs: Array.from(this.taskExecutionLogs.values()).reduce((total, logs) => total + logs.length, 0),
      analytics: this.automationAnalytics.size,
      templates: this.templates.size,
      integrationConfigs: this.integrationConfigs.size
    };
  }

  async cleanup(): Promise<void> {
    // Clear all data
    this.automations.clear();
    this.results.clear();
    this.events = [];
    this.triggers.clear();
    this.tasks.clear();
    this.rules.clear();
    this.integrations.clear();
    this.businessRules.clear();
    this.workflowContexts.clear();
    this.jobQueue.clear();
    this.jobStatuses.clear();
    this.taskExecutionLogs.clear();
    this.automationAnalytics.clear();
    this.templates.clear();
    this.integrationConfigs.clear();

    // Reinitialize default data
    this.initializeDefaultData();
  }
}