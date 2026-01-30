// Core types for workflow automation system
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'input' | 'processing' | 'decision' | 'output' | 'conditional';
  description?: string;
  dependencies?: string[]; // Step IDs this step depends on
  config: Record<string, any>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  settings: WorkflowSettings;
}

export interface WorkflowTrigger {
  type: 'manual' | 'scheduled' | 'event' | 'webhook';
  config: Record<string, any>;
  conditions?: WorkflowCondition[];
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface WorkflowSettings {
  timeout: number; // milliseconds
  retryPolicy: RetryPolicy;
  errorHandling: 'continue' | 'stop' | 'rollback';
  concurrency: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
}

export interface WorkflowContext {
  workflowId: string;
  executionId: string;
  input: Record<string, any>;
  state: Record<string, any>;
  results: Record<string, any>;
  metadata: {
    startedAt: Date;
    currentStep?: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    error?: string;
    warnings?: string[];
  };
}

export interface AutomationModule {
  id: string;
  name: string;
  version: string;
  description: string;
  config: Record<string, any>;
  dependencies: string[]; // Other module IDs
  interfaces: ModuleInterface[];
  initialize(): Promise<void>;
  execute(context: WorkflowContext): Promise<any>;
  validate(): ValidationResult;
  cleanup(): Promise<void>;
}

export interface ModuleInterface {
  name: string;
  method: string;
  parameters: ParameterDefinition[];
  returnType: string;
}

export interface ParameterDefinition {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  type: 'validation' | 'transformation' | 'decision' | 'calculation';
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number; // Lower number = higher priority
  enabled: boolean;
}

export interface RuleCondition {
  field: string;
  operator: string;
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'set' | 'calculate' | 'validate' | 'transform' | 'notify' | 'execute';
  target: string;
  value?: any;
  formula?: string;
  validation?: ValidationRule;
  transformation?: TransformationRule;
}

export interface ValidationRule {
  required: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  custom?: string;
}

export interface TransformationRule {
  type: 'format' | 'convert' | 'map' | 'aggregate';
  source: string;
  target: string;
  rules: Record<string, any>;
}

// Input Processing Types
export interface InputProcessor {
  type: string;
  config: Record<string, any>;
  process(input: any): Promise<ProcessedInput>;
}

export interface ProcessedInput {
  data: Record<string, any>;
  metadata: InputMetadata;
  validation: ValidationResult;
  normalization: NormalizationResult;
}

export interface InputMetadata {
  source: string;
  format: string;
  size: number;
  timestamp: Date;
  checksum?: string;
}

export interface NormalizationResult {
  normalizedData: Record<string, any>;
  transformations: TransformationLog[];
  issues: ProcessingIssue[];
}

export interface TransformationLog {
  field: string;
  originalValue: any;
  transformedValue: any;
  rule: string;
}

export interface ProcessingIssue {
  type: 'warning' | 'error';
  field: string;
  message: string;
  suggestion?: string;
}

// Output Generation Types
export interface OutputGenerator {
  type: string;
  config: Record<string, any>;
  generate(context: WorkflowContext): Promise<WorkflowOutput>;
}

export interface WorkflowOutput {
  data: any;
  format: string;
  metadata: OutputMetadata;
  delivery: DeliveryInfo;
}

export interface OutputMetadata {
  generatedAt: Date;
  generator: string;
  version: string;
  size: number;
  checksum?: string;
}

export interface DeliveryInfo {
  channels: DeliveryChannel[];
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  timestamp?: Date;
}

export interface DeliveryChannel {
  type: 'file' | 'api' | 'email' | 'webhook' | 'queue';
  config: Record<string, any>;
  target: string;
}

// Monitoring and Reliability Types
export interface AutomationMetrics {
  workflowId: string;
  executionId: string;
  timestamp: Date;
  duration: number;
  steps: StepMetrics[];
  success: boolean;
  error?: string;
  resourceUsage: ResourceUsage;
}

export interface StepMetrics {
  stepId: string;
  name: string;
  duration: number;
  success: boolean;
  error?: string;
  retryCount: number;
  resourceUsage: ResourceUsage;
}

export interface ResourceUsage {
  memory: number;
  cpu: number;
  disk: number;
  network: number;
}

export interface AlertConfig {
  id: string;
  workflowId?: string; // null for global alerts
  type: 'error' | 'performance' | 'resource' | 'custom';
  conditions: AlertCondition[];
  actions: AlertAction[];
  enabled: boolean;
}

export interface AlertCondition {
  metric: string;
  operator: string;
  threshold: number;
  duration?: number;
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'log' | 'callback';
  config: Record<string, any>;
}

// Integration Types
export interface IntegrationAdapter {
  id: string;
  name: string;
  type: 'api' | 'database' | 'queue' | 'file' | 'service';
  config: Record<string, any>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  test(): Promise<boolean>;
  execute(operation: string, params: any): Promise<any>;
}

export interface WorkflowSchedule {
  id: string;
  workflowId: string;
  cron: string;
  timezone: string;
  enabled: boolean;
  nextRun: Date;
  lastRun?: Date;
  config: Record<string, any>;
}