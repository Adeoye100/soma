/**
 * Core types for the automation framework
 */

export interface WorkflowContext {
  executionId: string;
  workflowId: string;
  startTime: Date;
  currentStep: number;
  inputs: Record<string, any>;
  state: WorkflowState;
}

export interface WorkflowState {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  currentStep: number;
  progress: number;
  errors: AutomationError[];
  variables: Record<string, any>;
}

export interface TaskResult {
  success: boolean;
  output: Record<string, any>;
  state: WorkflowState;
  executionId: string;
  duration: number;
  errors?: AutomationError[];
}

export interface AutomationError extends Error {
  code: string;
  details?: Record<string, any>;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  triggers: string[];
  steps: WorkflowStep[];
  preProcessing?: WorkflowHook;
  postProcessing?: WorkflowHook;
  errorHandling?: ErrorHandling;
  requiredActions?: string[];
  metadata?: Record<string, any>;
}

export interface WorkflowStep {
  id?: string;
  name: string;
  actionId: string;
  inputs: Record<string, any>;
  preconditions?: WorkflowCondition[];
  retryConfig?: RetryConfiguration;
  parallel?: boolean;
  timeout?: number;
}

export interface WorkflowCondition {
  type: string;
  params: Record<string, any>;
}

export interface WorkflowHook {
  actionId: string;
  params?: Record<string, any>;
}

export interface ErrorHandling {
  recoveryStrategy?: {
    actionId: string;
    params?: Record<string, any>;
  };
  retryOnRecovery?: boolean;
  maxRecoveryAttempts?: number;
}

export interface RetryConfiguration {
  maxRetries: number;
  delay: number;
  backoffMultiplier?: number;
  maxDelay?: number;
}

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  execute: (inputs: Record<string, any>) => Promise<TaskResult>;
  validate?: (inputs: Record<string, any>) => ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface MonitoringEvent {
  type: string;
  timestamp: Date;
  executionId?: string;
  workflowId?: string;
  data: Record<string, any>;
}

export interface WorkflowMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  successRate: number;
  mostUsedWorkflows: Array<{
    workflowId: string;
    executionCount: number;
  }>;
}

export interface Configuration {
  maxConcurrentExecutions: number;
  defaultTimeout: number;
  enableMonitoring: boolean;
  enableMetrics: boolean;
  retryDefaults: RetryConfiguration;
  monitoring: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    retentionDays: number;
    enableMetrics: boolean;
  };
}

export interface IntegrationAdapter {
  name: string;
  version: string;
  canHandle: (input: Record<string, any>) => boolean;
  process: (input: Record<string, any>) => Promise<Record<string, any>>;
  validate?: (input: Record<string, any>) => ValidationResult;
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  priority: number;
  enabled: boolean;
}

export interface InputProcessor {
  validate: (input: Record<string, any>) => Promise<ValidationResult>;
  transform: (input: Record<string, any>) => Promise<Record<string, any>>;
  enrich?: (input: Record<string, any>) => Promise<Record<string, any>>;
}

export interface OutputProcessor {
  format: (output: Record<string, any>) => Promise<Record<string, any>>;
  validate?: (output: Record<string, any>) => Promise<ValidationResult>;
  route?: (output: Record<string, any>) => Promise<string[]>;
}
