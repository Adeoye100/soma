/**
 * Workflow Automation System Types
 * Defines the core types for workflow orchestration and automation
 */

/**
 * Workflow status enum
 */
export enum WorkflowStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  TIMEOUT = 'TIMEOUT'
}

/**
 * Step result interface
 */
export interface StepResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Workflow step execution context
 */
export interface StepExecutionContext {
  input: any;
  context: WorkflowContext;
  previousResults: Record<string, StepResult>;
  step: WorkflowStep;
}

/**
 * Workflow step handler function
 */
export type StepHandler = (context: StepExecutionContext) => Promise<StepResult>;

/**
 * Individual workflow step definition
 */
export interface WorkflowStep {
  name: string;
  handler: StepHandler;
  description?: string;
  requires?: string[]; // Required inputs from context or previous results
  onError?: 'stop' | 'continue';
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    maxDelay: number;
  };
}

/**
 * Workflow retry policy
 */
export interface WorkflowRetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  maxDelay: number;
}

/**
 * Workflow definition interface
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: WorkflowStep[];
  timeout?: number;
  retryPolicy?: WorkflowRetryPolicy;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  input: any;
  currentStep: number;
  results: StepResult[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  retryCount: number;
  maxRetries: number;
  timeout: number;
  metadata: {
    priority: 'low' | 'normal' | 'high';
    source: string;
    userId?: string;
    correlationId?: string;
  };
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  workflowId: string;
  duration: number;
  stepsExecuted: number;
  metadata?: Record<string, any>;
}

/**
 * Input processor interface
 */
export interface InputProcessor {
  id: string;
  name: string;
  process(input: any): Promise<ProcessedInput>;
  validate(input: any): ValidationResult;
  priority: number;
}

/**
 * Processed input result
 */
export interface ProcessedInput {
  data: any;
  metadata: Record<string, any>;
  validationErrors?: string[] | undefined;
}

/**
 * Input validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[] | undefined;
}

/**
 * Business rule interface
 */
export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  evaluate(context: RuleContext): Promise<RuleResult>;
  priority: number;
  enabled: boolean;
}

/**
 * Business rule evaluation context
 */
export interface RuleContext {
  input: any;
  workflowContext?: WorkflowContext | undefined;
  previousResults?: Record<string, any> | undefined;
  metadata?: Record<string, any> | undefined;
}

/**
 * Business rule evaluation result
 */
export interface RuleResult {
  passed: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
  details?: any;
  recommendations?: string[];
}

/**
 * Business rule execution result (multiple rules)
 */
export interface RuleExecutionResult {
  success: boolean;
  overallPassed: boolean;
  results: RuleResult[];
  errors: Array<{ ruleId: string; error: string }>;
  executionTime: number;
  summary: {
    totalRules: number;
    passed: number;
    failed: number;
    criticalFailures: number;
    warnings: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Output generator interface
 */
export interface OutputGenerator {
  id: string;
  name: string;
  format: 'json' | 'xml' | 'html' | 'pdf' | 'csv' | 'custom';
  generate(data: any, options?: any): Promise<GeneratedOutput>;
  validate(data: any): ValidationResult;
}

/**
 * Generated output result
 */
export interface GeneratedOutput {
  content: any;
  format: string;
  metadata: Record<string, any>;
  size?: number;
  checksum?: string;
}

/**
 * Integration component interface
 */
export interface IntegrationComponent {
  id: string;
  name: string;
  type: 'input' | 'processing' | 'output' | 'monitoring' | 'utility';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
}

/**
 * Health status for components
 */
export interface HealthStatus {
  healthy: boolean;
  message: string;
  details?: Record<string, any>;
  lastCheck: Date;
  uptime?: number;
}

/**
 * Monitoring metrics
 */
export interface MonitoringMetrics {
  timestamp: Date;
  workflowId?: string;
  componentId?: string;
  metrics: {
    executionTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    errorCount?: number;
    successCount?: number;
    throughput?: number;
    [key: string]: any;
  };
}

/**
 * Event system types
 */
export interface AutomationEvent {
  type: string;
  timestamp: Date;
  source: string;
  data: any;
  correlationId?: string;
}

/**
 * Scalability configuration
 */
export interface ScalabilityConfig {
  maxConcurrentWorkflows: number;
  queueSize: number;
  workerPoolSize: number;
  autoScaling: {
    enabled: boolean;
    minWorkers: number;
    maxWorkers: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
  };
}

/**
 * Automation configuration
 */
export interface AutomationConfig {
  workflows: Record<string, WorkflowDefinition>;
  inputProcessors: InputProcessor[];
  businessRules: BusinessRule[];
  outputGenerators: OutputGenerator[];
  integrations: IntegrationComponent[];
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    healthCheckInterval: number;
  };
  scalability: ScalabilityConfig;
}