import { EventEmitter } from 'events';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enterprise Multi-Format I/O Processing System
 * Features: JSON/XML/CSV/DB/API processing, validation, transformation, streaming
 */

// Core interfaces
export interface IOProcessorConfig {
  maxFileSize: number;
  maxConcurrentOperations: number;
  supportedFormats: DataFormat[];
  validation: ValidationConfig;
  transformation: TransformationConfig;
  streaming: StreamingConfig;
  database: DatabaseConfig;
  api: ApiConfig;
}

export interface Validator {
  validate: (data: any) => ValidationResult | { valid: boolean; errors: any[] };
}

export interface Transformer {
  transform: (data: any) => any;
}

export interface TransformationConfig {
  enabled: boolean;
  defaultPipeline?: string | undefined;
  allowCustomPipelines: boolean;
  maxSteps: number;
}

export interface ValidationConfig {
  enabled: boolean;
  strict: boolean;
  customValidators?: Record<string, (value: any) => boolean> | undefined;
  cacheResults: boolean;
}

export interface DataFormat {
  name: string;
  extension: string;
  mimeType: string;
  handler: FormatHandler;
  validator: Validator;
  transformer: Transformer;
}

export interface FormatHandler {
  canHandle: (input: any) => boolean;
  read: (input: any, options?: any) => Promise<any>;
  write: (data: any, options?: any) => Promise<any>;
  [key: string]: any;
}

export interface ValidationSchema {
  type: 'json-schema' | 'xml-schema' | 'custom';
  schema: any;
  rules: ValidationRule[];
  strict: boolean;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'min' | 'max' | 'pattern' | 'custom';
  params?: any;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: ValidationMetadata;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
  line?: number | undefined;
  column?: number | undefined;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string | undefined;
}

export interface ValidationMetadata {
  processedAt: Date;
  schemaVersion: string;
  recordCount: number;
  fieldCount: number;
}

export interface TransformationPipeline {
  id: string;
  name: string;
  steps: TransformationStep[];
  inputFormat: string;
  outputFormat: string;
  options: TransformationOptions;
}

export interface TransformationStep {
  type: 'map' | 'filter' | 'aggregate' | 'enrich' | 'validate' | 'custom';
  operation: string;
  parameters: Record<string, any>;
  conditions?: TransformationCondition[];
}

export interface TransformationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
  action: 'include' | 'exclude' | 'transform';
}

export interface TransformationOptions {
  preserveNulls: boolean;
  caseSensitive: boolean;
  trimWhitespace: boolean;
  failOnError: boolean;
  batchSize: number;
}

export interface StreamingConfig {
  enabled: boolean;
  bufferSize: number;
  chunkSize: number;
  backpressure: boolean;
  maxQueueSize: number;
}

export interface DatabaseConfig {
  connections: Map<string, DatabaseConnection>;
  connectionPool: {
    min: number;
    max: number;
    idleTimeout: number;
  };
  queryTimeout: number;
  retryAttempts: number;
}

export interface DatabaseConnection {
  id: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'sqlite';
  config: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    connectionString?: string;
    options?: Record<string, any>;
  };
  enabled: boolean;
}

export interface ApiConfig {
  baseUrls: Map<string, string>;
  defaultHeaders: Record<string, string>;
  timeout: number;
  retryAttempts: number;
  rateLimit: {
    requests: number;
    windowMs: number;
  };
  authentication: {
    type: 'none' | 'bearer' | 'basic' | 'oauth2';
    credentials?: Record<string, any>;
  };
}

export interface IOOperation {
  id: string;
  type: 'read' | 'write' | 'transform' | 'validate';
  input: any;
  output?: any;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime?: Date | undefined;
  endTime?: Date | undefined;
  duration?: number | undefined;
  error?: string | undefined;
  metadata: OperationMetadata;
}

export interface OperationMetadata {
  correlationId: string;
  source: string;
  destination?: string | undefined;
  recordCount?: number | undefined;
  byteCount?: number | undefined;
  compression?: string | undefined;
  encoding?: string | undefined;
}

export interface ProcessingResult {
  operationId: string;
  success: boolean;
  data?: any;
  metadata: ProcessingMetadata;
  errors: ProcessingError[];
  warnings: ProcessingWarning[];
}

export interface ProcessingMetadata {
  inputFormat: string;
  outputFormat?: string | undefined;
  recordsProcessed: number;
  bytesProcessed: number;
  processingTime: number;
  transformations: string[];
  validations: string[];
}

export interface ProcessingError {
  code: string;
  message: string;
  field?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
  severity: 'error' | 'warning';
}

export interface ProcessingWarning {
  code: string;
  message: string;
  suggestion?: string | undefined;
}

/**
 * Enterprise Multi-Format I/O Processing Engine
 */
export class MultiFormatIOProcessor extends EventEmitter {
  private logger: winston.Logger;
  private config: IOProcessorConfig;
  private formatHandlers: Map<string, DataFormat> = new Map();
  private validationSchemas: Map<string, ValidationSchema> = new Map();
  private transformationPipelines: Map<string, TransformationPipeline> = new Map();
  private activeOperations: Map<string, IOOperation> = new Map();
  private metrics: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    totalBytesProcessed: number;
    averageProcessingTime: number;
    operationsPerSecond: number;
  };

  constructor(config: IOProcessorConfig) {
    super();
    this.config = config;
    this.logger = this.createLogger();
    this.metrics = this.initializeMetrics();
    
    this.initializeFormatHandlers();
    this.initializeDefaultPipelines();
    this.setupEventHandlers();
  }

  /**
   * Initialize the I/O processor
   */
  async initialize(): Promise<void> {
    try {
      // Initialize format handlers
      await this.initializeFormatHandlers();
      
      // Initialize database connections
      await this.initializeDatabaseConnections();
      
      // Initialize validation schemas
      await this.initializeValidationSchemas();
      
      this.emit('initialized', {
        formats: this.formatHandlers.size,
        pipelines: this.transformationPipelines.size,
        schemas: this.validationSchemas.size
      });

      this.logger.info('Multi-Format I/O Processor initialized', {
        formats: this.formatHandlers.size,
        pipelines: this.transformationPipelines.size
      });
    } catch (error) {
      this.logger.error('Failed to initialize I/O Processor', error);
      throw error;
    }
  }

  /**
   * Process data with specified format and transformations
   */
  async process(
    input: any,
    options: {
      format?: string;
      schema?: string;
      pipeline?: string;
      outputFormat?: string;
      validate?: boolean;
      transform?: boolean;
      correlationId?: string;
    } = {}
  ): Promise<ProcessingResult> {
    const operationId = uuidv4();
    const correlationId = options.correlationId || uuidv4();
    
    const operation: IOOperation = {
      id: operationId,
      type: 'read',
      input,
      format: options.format || 'auto-detect',
      status: 'pending',
      startTime: new Date(),
      metadata: {
        correlationId,
        source: 'user-input'
      }
    };

    this.activeOperations.set(operationId, operation);
    this.emit('operationStarted', { operationId, correlationId });

    try {
      // Auto-detect format if not specified
      let detectedFormat: string | undefined = options.format;
      if (!detectedFormat || detectedFormat === 'auto-detect') {
        detectedFormat = this.detectFormat(input) || undefined;
      }

      if (!detectedFormat) {
        throw new Error('Unable to detect input format');
      }

      const dataFormat = this.formatHandlers.get(detectedFormat);
      if (!dataFormat) {
        throw new Error(`No handler found for format: ${detectedFormat}`);
      }
      const handler = dataFormat.handler;

      operation.status = 'processing';
      operation.format = detectedFormat;

      // Read data
      const data = await handler.read(input);
      
      // Validate if requested
      let validationResult: ValidationResult | undefined;
      if (options.validate && options.schema) {
        validationResult = await this.validate(data, options.schema);
        if (!validationResult.valid && this.config.validation.strict) {
          throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
        }
      }

      // Transform if requested
      let transformedData = data;
      if (options.transform && options.pipeline) {
        transformedData = await this.transform(data, options.pipeline);
      }

      // Convert output format if specified
      let output = transformedData;
      if (options.outputFormat && options.outputFormat !== detectedFormat) {
        const outputDataFormat = this.formatHandlers.get(options.outputFormat);
        if (outputDataFormat) {
          output = await outputDataFormat.handler.write(transformedData);
        }
      }

      operation.status = 'completed';
      operation.endTime = new Date();
      if (operation.startTime && operation.endTime) {
        operation.duration = operation.endTime.getTime() - operation.startTime.getTime();
      }
      operation.output = output;

      const result: ProcessingResult = {
        operationId,
        success: true,
        data: output,
        metadata: {
          inputFormat: detectedFormat,
          outputFormat: options.outputFormat || undefined,
          recordsProcessed: Array.isArray(output) ? output.length : 1,
          bytesProcessed: JSON.stringify(output).length,
          processingTime: operation.duration || 0,
          transformations: options.pipeline ? [options.pipeline] : [],
          validations: options.schema ? [options.schema] : []
        },
        errors: (validationResult?.errors || []).map(err => ({
          ...err,
          severity: err.severity === 'info' ? 'warning' : err.severity as 'error' | 'warning'
        })),
        warnings: (validationResult?.warnings || []).map(warn => ({
          code: 'VALIDATION_WARNING',
          message: warn.message,
          suggestion: warn.suggestion
        }))
      };

      this.updateMetrics(true, operation.duration!);
      this.emit('operationCompleted', { operationId, result });

      return result;

    } catch (error) {
      operation.status = 'failed';
      operation.endTime = new Date();
      if (operation.startTime && operation.endTime) {
        operation.duration = operation.endTime.getTime() - operation.startTime.getTime();
      }
      operation.error = (error as Error).message;

      const result: ProcessingResult = {
        operationId,
        success: false,
        metadata: {
          inputFormat: options.format || 'unknown',
          recordsProcessed: 0,
          bytesProcessed: 0,
          processingTime: operation.duration!,
          transformations: [],
          validations: []
        },
        errors: [{
          code: 'PROCESSING_ERROR',
          message: (error as Error).message,
          severity: 'error'
        }],
        warnings: []
      };

      this.updateMetrics(false, operation.duration!);
      this.emit('operationFailed', { operationId, error: operation.error });

      return result;
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Stream process large datasets
   */
  async streamProcess(
    input: any,
    options: {
      format?: string;
      pipeline?: string;
      chunkSize?: number;
      onChunk?: (chunk: any, index: number) => void;
      correlationId?: string;
    } = {}
  ): Promise<void> {
    const correlationId = options.correlationId || uuidv4();
    const format = options.format || this.detectFormat(input);
    
    if (!format) {
      throw new Error('Unable to detect input format for streaming');
    }

    const dataFormat = this.formatHandlers.get(format);
    if (!dataFormat || !dataFormat.handler || !dataFormat.handler.read) {
      throw new Error(`Streaming not supported for format: ${format}`);
    }

    this.emit('streamStarted', { correlationId, format });

    try {
      const chunks = this.chunkInput(input, options.chunkSize || this.config.streaming.chunkSize);
      let processedCount = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Process chunk
        let processedChunk = chunk;
        if (options.pipeline) {
          processedChunk = await this.transform(chunk, options.pipeline);
        }

        // Emit chunk result
        if (options.onChunk) {
          options.onChunk(processedChunk, i);
        }

        this.emit('chunkProcessed', {
          correlationId,
          chunkIndex: i,
          data: processedChunk,
          processedCount: ++processedCount
        });

        // Check for backpressure
        if (this.config.streaming.backpressure && processedCount % 1000 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0)); // Allow other operations
        }
      }

      this.emit('streamCompleted', { correlationId, totalChunks: chunks.length });

    } catch (error) {
      this.emit('streamFailed', {
        correlationId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Validate data against schema
   */
  async validate(data: any, schemaName: string): Promise<ValidationResult> {
    const schema = this.validationSchemas.get(schemaName);
    if (!schema) {
      throw new Error(`Validation schema not found: ${schemaName}`);
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Apply validation rules
      for (const rule of schema.rules) {
        const result = this.applyValidationRule(data, rule);
        if (!result.valid) {
          if (rule.severity === 'error') {
            errors.push(result.error!);
          } else {
            warnings.push(result.warning!);
          }
        }
      }

      const valid = errors.length === 0;

      return {
        valid,
        errors,
        warnings,
        metadata: {
          processedAt: new Date(),
          schemaVersion: schemaName,
          recordCount: Array.isArray(data) ? data.length : 1,
          fieldCount: typeof data === 'object' ? Object.keys(data).length : 0
        }
      };

    } catch (error) {
      return {
        valid: false,
        errors: [{
          field: 'schema',
          message: `Validation failed: ${(error as Error).message}`,
          severity: 'error',
          code: 'VALIDATION_ERROR'
        }],
        warnings: [],
        metadata: {
          processedAt: new Date(),
          schemaVersion: schemaName,
          recordCount: 0,
          fieldCount: 0
        }
      };
    }
  }

  /**
   * Transform data using pipeline
   */
  async transform(data: any, pipelineName: string): Promise<any> {
    const pipeline = this.transformationPipelines.get(pipelineName);
    if (!pipeline) {
      throw new Error(`Transformation pipeline not found: ${pipelineName}`);
    }

    let transformedData = data;

    for (const step of pipeline.steps) {
      transformedData = await this.executeTransformationStep(transformedData, step);
    }

    return transformedData;
  }

  /**
   * Read from database
   */
  async readFromDatabase(
    connectionId: string,
    query: string,
    parameters?: Record<string, any>
  ): Promise<any> {
    const connection = this.config.database.connections.get(connectionId);
    if (!connection || !connection.enabled) {
      throw new Error(`Database connection not found or disabled: ${connectionId}`);
    }

    try {
      // Simulate database query (in real implementation, use actual DB client)
      const result = {
        connection: connectionId,
        query,
        parameters: parameters || {},
        result: [
          { id: 1, name: 'Sample Record 1', value: 100 },
          { id: 2, name: 'Sample Record 2', value: 200 }
        ],
        recordCount: 2
      };

      this.emit('databaseRead', { connectionId, query, recordCount: result.recordCount });
      return result;

    } catch (error) {
      this.emit('databaseError', { connectionId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Write to database
   */
  async writeToDatabase(
    connectionId: string,
    table: string,
    data: any[]
  ): Promise<{ success: boolean; inserted: number; errors: any[] }> {
    const connection = this.config.database.connections.get(connectionId);
    if (!connection || !connection.enabled) {
      throw new Error(`Database connection not found or disabled: ${connectionId}`);
    }

    try {
      // Simulate database write (in real implementation, use actual DB client)
      const result = {
        success: true,
        inserted: data.length,
        errors: []
      };

      this.emit('databaseWrite', { connectionId, table, recordCount: data.length });
      return result;

    } catch (error) {
      const errorResult = {
        success: false,
        inserted: 0,
        errors: [(error as Error).message]
      };

      this.emit('databaseError', { connectionId, error: (error as Error).message });
      return errorResult;
    }
  }

  /**
   * Make API request
   */
  async apiRequest(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      headers?: Record<string, string>;
      body?: any;
      timeout?: number;
    } = {}
  ): Promise<any> {
    const method = options.method || 'GET';
    const timeout = options.timeout || this.config.api.timeout;

    try {
      // Simulate API request (in real implementation, use actual HTTP client)
      const response = {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': uuidv4()
        },
        data: {
          message: 'API request successful',
          endpoint,
          method,
          timestamp: new Date().toISOString()
        }
      };

      this.emit('apiRequest', { endpoint, method, status: response.status });
      return response;

    } catch (error) {
      this.emit('apiError', { endpoint, method, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Register custom format handler
   */
  registerFormat(format: DataFormat): void {
    this.formatHandlers.set(format.name, format);
    this.logger.info('Format handler registered', { format: format.name });
  }

  /**
   * Register validation schema
   */
  registerValidationSchema(name: string, schema: ValidationSchema): void {
    this.validationSchemas.set(name, schema);
    this.logger.info('Validation schema registered', { schema: name });
  }

  /**
   * Register transformation pipeline
   */
  registerTransformationPipeline(pipeline: TransformationPipeline): void {
    this.transformationPipelines.set(pipeline.id, pipeline);
    this.logger.info('Transformation pipeline registered', { pipeline: pipeline.id });
  }

  /**
   * Get processor status
   */
  getStatus(): any {
    return {
      activeOperations: this.activeOperations.size,
      registeredFormats: this.formatHandlers.size,
      validationSchemas: this.validationSchemas.size,
      transformationPipelines: this.transformationPipelines.size,
      metrics: { ...this.metrics },
      config: {
        maxFileSize: this.config.maxFileSize,
        maxConcurrentOperations: this.config.maxConcurrentOperations,
        supportedFormats: this.config.supportedFormats.length
      }
    };
  }

  // Private methods

  private createLogger(): winston.Logger {
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: 'logs/multi-format-io-processor.log',
          maxsize: 10000000,
          maxFiles: 10
        })
      ]
    });
  }

  private initializeMetrics() {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      totalBytesProcessed: 0,
      averageProcessingTime: 0,
      operationsPerSecond: 0
    };
  }

  private detectFormat(input: any): string | null {
    // Check by content type
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return 'json';
      } else if (trimmed.startsWith('<')) {
        return 'xml';
      } else if (trimmed.includes(',') && trimmed.includes('\n')) {
        return 'csv';
      }
    }

    // Check by object structure
    if (typeof input === 'object') {
      if (Array.isArray(input)) {
        return 'json';
      } else if (input.root || input.documentElement) {
        return 'xml';
      }
    }

    return null;
  }

  private async initializeFormatHandlers(): Promise<void> {
    // Register built-in format handlers
    this.registerFormat({
      name: 'json',
      extension: '.json',
      mimeType: 'application/json',
      handler: {
        canHandle: (input: any) => typeof input === 'string' && (input.trim().startsWith('{') || input.trim().startsWith('[')),
        read: async (input: any) => JSON.parse(input),
        write: async (data: any) => JSON.stringify(data, null, 2)
      },
      validator: {
        validate: (data: any) => ({ valid: true, errors: [] })
      },
      transformer: {
        transform: (data: any) => data
      }
    });

    this.registerFormat({
      name: 'csv',
      extension: '.csv',
      mimeType: 'text/csv',
      handler: {
        canHandle: (input: any) => typeof input === 'string' && input.includes(',') && input.includes('\n'),
        read: async (input: any) => {
          const lines = input.trim().split('\n');
          const headers = lines[0].split(',');
          return lines.slice(1).map((line: string) => {
            const values = line.split(',');
            const obj: any = {};
            headers.forEach((header: string, index: number) => {
              obj[header.trim()] = values[index]?.trim();
            });
            return obj;
          });
        },
        write: async (data: any) => {
          if (!Array.isArray(data) || data.length === 0) return '';
          const headers = Object.keys(data[0]);
          const lines = [headers.join(',')];
          data.forEach((row: any) => {
            lines.push(headers.map((header: string) => String(row[header] || '')).join(','));
          });
          return lines.join('\n');
        }
      },
      validator: {
        validate: (data: any) => ({ valid: true, errors: [] })
      },
      transformer: {
        transform: (data: any) => data
      }
    });

    // Add more format handlers as needed...
  }

  private async initializeDefaultPipelines(): Promise<void> {
    // Register default transformation pipelines
    const defaultPipeline: TransformationPipeline = {
      id: 'default-cleanup',
      name: 'Default Data Cleanup',
      steps: [
        {
          type: 'map',
          operation: 'trim-fields',
          parameters: { fields: [] },
          conditions: []
        },
        {
          type: 'filter',
          operation: 'remove-empty',
          parameters: {},
          conditions: []
        }
      ],
      inputFormat: 'json',
      outputFormat: 'json',
      options: {
        preserveNulls: false,
        caseSensitive: false,
        trimWhitespace: true,
        failOnError: false,
        batchSize: 1000
      }
    };

    this.registerTransformationPipeline(defaultPipeline);
  }

  private async initializeDatabaseConnections(): Promise<void> {
    // Initialize database connections
    // This would set up actual database connections in a real implementation
    this.logger.info('Database connections initialized');
  }

  private async initializeValidationSchemas(): Promise<void> {
    // Register default validation schemas
    const defaultSchema: ValidationSchema = {
      type: 'json-schema',
      schema: {},
      rules: [
        {
          field: '*',
          type: 'required',
          message: 'Field is required',
          severity: 'error'
        }
      ],
      strict: false
    };

    this.registerValidationSchema('default', defaultSchema);
  }

  private applyValidationRule(data: any, rule: ValidationRule): { valid: boolean; error?: ValidationError; warning?: ValidationWarning } {
    // Simplified validation logic
    const value = this.getNestedValue(data, rule.field);
    
    switch (rule.type) {
      case 'required':
        if (!value && value !== 0) {
          return {
            valid: false,
            error: {
              field: rule.field,
              message: rule.message,
              severity: rule.severity,
              code: 'REQUIRED_FIELD_MISSING'
            }
          };
        }
        break;
      
      case 'type':
        if (rule.params?.type && typeof value !== rule.params.type) {
          return {
            valid: false,
            error: {
              field: rule.field,
              message: rule.message,
              severity: rule.severity,
              code: 'TYPE_MISMATCH'
            }
          };
        }
        break;
    }

    return { valid: true };
  }

  private async executeTransformationStep(data: any, step: TransformationStep): Promise<any> {
    switch (step.type) {
      case 'map':
        return this.applyMapping(data, step.parameters);
      
      case 'filter':
        return this.applyFilter(data, step.parameters);
      
      case 'aggregate':
        return this.applyAggregation(data, step.parameters);
      
      case 'enrich':
        return this.applyEnrichment(data, step.parameters);
      
      default:
        return data;
    }
  }

  private applyMapping(data: any, params: Record<string, any>): any {
    // Simplified mapping logic
    if (Array.isArray(data)) {
      return data.map(item => ({ ...item, ...params }));
    }
    return { ...data, ...params };
  }

  private applyFilter(data: any, params: Record<string, any>): any {
    // Simplified filter logic
    if (Array.isArray(data)) {
      return data.filter(item => item !== null && item !== undefined);
    }
    return data;
  }

  private applyAggregation(data: any, params: Record<string, any>): any {
    // Simplified aggregation logic
    if (Array.isArray(data)) {
      return {
        count: data.length,
        data
      };
    }
    return data;
  }

  private applyEnrichment(data: any, params: Record<string, any>): any {
    // Simplified enrichment logic
    return {
      ...data,
      enriched: true,
      timestamp: new Date().toISOString()
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private chunkInput(input: any, chunkSize: number): any[] {
    if (Array.isArray(input)) {
      const chunks: any[] = [];
      for (let i = 0; i < input.length; i += chunkSize) {
        chunks.push(input.slice(i, i + chunkSize));
      }
      return chunks;
    }
    return [input];
  }

  private updateMetrics(success: boolean, duration: number): void {
    this.metrics.totalOperations++;
    
    if (success) {
      this.metrics.successfulOperations++;
    } else {
      this.metrics.failedOperations++;
    }
    
    // Update average processing time
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.totalOperations - 1);
    this.metrics.averageProcessingTime = (totalTime + duration) / this.metrics.totalOperations;
  }

  private setupEventHandlers(): void {
    this.on('operationCompleted', (data) => {
      this.logger.debug('I/O operation completed', {
        operationId: data.operationId,
        processingTime: data.result.metadata.processingTime
      });
    });

    this.on('operationFailed', (data) => {
      this.logger.error('I/O operation failed', {
        operationId: data.operationId,
        error: data.error
      });
    });
  }
}

export default MultiFormatIOProcessor;