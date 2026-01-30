// Shared Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: PaginationMeta;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface ExamConfig {
  type: 'OBJECTIVE' | 'SHORT_ANSWER' | 'ESSAY';
  difficulty: 'easy' | 'medium' | 'hard';
  numQuestions: number;
}

export interface Material {
  content: string;
  mimeType: string;
  title?: string;
}

export interface Question {
  id?: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  topic: string;
  examId?: string;
  order?: number;
}

export interface UserAnswer {
  questionId: string;
  answer: string;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  isCorrect: boolean;
  topic: string;
}

export interface ExamResult {
  id: string;
  userId: string;
  examId: string;
  questions: Question[];
  userAnswers: UserAnswer[];
  evaluations: EvaluationResult[];
  totalScore: number;
  maxScore: number;
  completedAt: string;
  duration: number; // in seconds
}

export interface ExamHistory {
  id: string;
  userId: string;
  examResults: ExamResult[];
  totalExams: number;
  averageScore: number;
  lastExamDate: string;
}

// Authentication Types
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  fullName?: string;
}

// API Configuration Types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  strategy: 'LRU' | 'LFU' | 'TTL';
}

// Service Types
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: {
    executionTime: number;
    cacheHit?: boolean;
    attempts?: number;
  };
}

export interface ProcessingResult<T = any> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: {
    executionTime: number;
    cacheHit?: boolean;
    attempts?: number;
    outputSize?: number;
    processedItems?: number;
    failedItems?: number;
  };
}

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  cause?: Error;
  isOperational?: boolean;
}

// External Service Types
export interface GeminiApiKey {
  key: string;
  index: number;
  isActive: boolean;
  usage: {
    requests: number;
    lastUsed: string;
  };
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
}

// Event Types
export interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  payload: any;
  timestamp: string;
  metadata?: {
    userId?: string;
    correlationId?: string;
    [key: string]: any;
  };
}

// Query Types
export interface Query<T = any> {
  filter?: Partial<T>;
  sort?: {
    field: keyof T;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface QueryResult<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Workflow Automation Types
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  enabled: boolean;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
  errorHandling: WorkflowErrorHandling;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    tags: string[];
    priority: 'low' | 'normal' | 'high' | 'critical';
  };
}

export interface WorkflowTrigger {
  id: string;
  type: 'schedule' | 'event' | 'webhook' | 'manual';
  config: {
    cronExpression?: string;
    eventType?: string;
    webhookUrl?: string;
    conditions?: Record<string, any>;
  };
  enabled: boolean;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'input_processing' | 'business_rule' | 'output_generation' | 'integration' | 'conditional' | 'parallel';
  config: {
    processor?: string;
    rule?: string;
    template?: string;
    service?: string;
    parallel?: WorkflowStep[];
    condition?: string;
    timeout?: number;
    retries?: number;
    dependencies?: string[];
  };
  position: { x: number; y: number };
  enabled: boolean;
}

export interface WorkflowCondition {
  id: string;
  expression: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists';
  value?: any;
  nextStep?: string;
}

export interface WorkflowErrorHandling {
  strategy: 'stop' | 'retry' | 'skip' | 'continue' | 'fallback';
  maxRetries?: number;
  fallbackSteps?: string[];
  errorNotification?: boolean;
  escalationPolicy?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  currentStep?: string;
  startedAt: string;
  completedAt?: string;
  error?: {
    code: string;
    message: string;
    stepId?: string;
    details?: any;
  };
  metadata: {
    triggeredBy: string;
    correlationId?: string;
    executionTime?: number;
    stepResults?: Record<string, any>;
  };
}

export interface InputProcessor {
  id: string;
  name: string;
  type: 'file' | 'api' | 'database' | 'stream' | 'manual';
  config: {
    source: string;
    format: string;
    validation?: string[];
    transformation?: string[];
    batchSize?: number;
    pollingInterval?: number;
  };
  enabled: boolean;
}

export interface BusinessRule {
  id: string;
  name: string;
  description?: string;
  category: string;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  version: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    tags: string[];
  };
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists' | 'matches_pattern';
  value?: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'transform' | 'validate' | 'enrich' | 'route' | 'notify' | 'store';
  config: Record<string, any>;
  parameters?: Record<string, any>;
}

export interface OutputGenerator {
  id: string;
  name: string;
  type: 'file' | 'api' | 'database' | 'email' | 'notification';
  config: {
    destination: string;
    format: string;
    template?: string;
    compression?: boolean;
    encryption?: boolean;
    batching?: boolean;
    batchSize?: number;
  };
  enabled: boolean;
}

export interface IntegrationComponent {
  id: string;
  name: string;
  type: 'api' | 'database' | 'queue' | 'cache' | 'storage';
  provider: string;
  config: {
    endpoint?: string;
    credentials?: Record<string, string>;
    settings?: Record<string, any>;
    timeout?: number;
    retries?: number;
  };
  enabled: boolean;
  healthCheck?: {
    endpoint: string;
    interval: number;
    timeout: number;
  };
}

export interface AutomationConfig {
  workflows: WorkflowDefinition[];
  processors: InputProcessor[];
  rules: BusinessRule[];
  generators: OutputGenerator[];
  integrations: IntegrationComponent[];
  globalSettings: {
    maxConcurrentExecutions: number;
    defaultTimeout: number;
    enableMetrics: boolean;
    enableDebugging: boolean;
    retryPolicy: {
      maxAttempts: number;
      backoffMultiplier: number;
      maxBackoffTime: number;
    };
  };
}
