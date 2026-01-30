/**
 * Integration Adapters for Existing Services
 * Provides automation interfaces for existing system services
 */

import { GeminiService } from '../../services/geminiService';
import { SupabaseService } from '../../services/supabaseService';
import { EnhancedHttpClient } from '../http/EnhancedHttpClient';
import { FileValidationService } from '../../services/fileValidationService';
import { DocumentProcessor } from '../../services/documentProcessor';
import { EnhancedPdfConversionService } from '../../services/enhancedPdfConversionService';
import { ProcessingQueue } from '../../services/processingQueue';
import { AutomationEngine } from './AutomationEngine';

export interface AdapterConfig {
  enabled: boolean;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  timeout?: number;
  retries?: {
    attempts: number;
    delay: number;
  };
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeout: number;
  };
}

export interface AdapterResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    executionTime: number;
    adapter: string;
    timestamp: string;
  };
}

export abstract class BaseAdapter {
  protected config: AdapterConfig;
  protected circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  protected failureCount = 0;
  protected lastFailureTime?: Date;

  constructor(config: AdapterConfig) {
    this.config = {
      timeout: 30000,
      retries: { attempts: 3, delay: 1000 },
      circuitBreaker: { failureThreshold: 5, resetTimeout: 60000 },
      ...config
    };
  }

  protected async checkCircuitBreaker(): Promise<void> {
    if (this.circuitBreakerState === 'OPEN') {
      if (this.lastFailureTime && 
          Date.now() - this.lastFailureTime.getTime() > this.config.circuitBreaker!.resetTimeout) {
        this.circuitBreakerState = 'HALF_OPEN';
        this.failureCount = 0;
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.constructor.name}`);
      }
    }
  }

  protected recordSuccess(): void {
    this.circuitBreakerState = 'CLOSED';
    this.failureCount = 0;
  }

  protected recordFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.config.circuitBreaker!.failureThreshold) {
      this.circuitBreakerState = 'OPEN';
      this.lastFailureTime = new Date();
    }
  }

  protected async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retries!.attempts; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout!)
          )
        ]);
        
        this.recordSuccess();
        return result;
      } catch (error) {
        lastError = error as Error;
        if (attempt === this.config.retries!.attempts) {
          this.recordFailure();
          break;
        }
        await new Promise(resolve => setTimeout(resolve, this.config.retries!.delay * attempt));
      }
    }
    
    throw lastError!;
  }
}

/**
 * Gemini AI Service Adapter
 */
export class GeminiAdapter extends BaseAdapter {
  private geminiService: GeminiService;

  constructor(config: AdapterConfig = { enabled: true }) {
    super(config);
    this.geminiService = new GeminiService();
  }

  async generateContent(prompt: string, options?: any): Promise<AdapterResult> {
    return this.withRetry(async () => {
      await this.checkCircuitBreaker();
      
      const startTime = Date.now();
      try {
        const result = await this.geminiService.generateContent(prompt, options);
        
        return {
          success: true,
          data: result,
          metadata: {
            executionTime: Date.now() - startTime,
            adapter: 'GeminiAdapter',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        this.recordFailure();
        throw error;
      }
    }).catch(error => ({
      success: false,
      error: error.message,
      metadata: {
        executionTime: Date.now() - startTime,
        adapter: 'GeminiAdapter',
        timestamp: new Date().toISOString()
      }
    }));
  }

  async analyzeDocument(document: string, analysisType: string): Promise<AdapterResult> {
    return this.generateContent(
      `Analyze this ${analysisType}: ${document}`,
      { task: analysisType }
    );
  }

  async generateQuiz(questions: string[], difficulty: string): Promise<AdapterResult> {
    return this.generateContent(
      `Generate a quiz with difficulty ${difficulty} from these questions: ${questions.join(', ')}`,
      { task: 'quiz_generation' }
    );
  }
}

/**
 * Database Service Adapter
 */
export class SupabaseAdapter extends BaseAdapter {
  private supabaseService: SupabaseService;

  constructor(config: AdapterConfig = { enabled: true }) {
    super(config);
    this.supabaseService = new SupabaseService();
  }

  async query(table: string, filters: any): Promise<AdapterResult> {
    return this.withRetry(async () => {
      await this.checkCircuitBreaker();
      
      const startTime = Date.now();
      try {
        const result = await this.supabaseService.query(table, filters);
        
        return {
          success: true,
          data: result,
          metadata: {
            executionTime: Date.now() - startTime,
            adapter: 'SupabaseAdapter',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        this.recordFailure();
        throw error;
      }
    }).catch(error => ({
      success: false,
      error: error.message,
      metadata: {
        executionTime: Date.now() - startTime,
        adapter: 'SupabaseAdapter',
        timestamp: new Date().toISOString()
      }
    }));
  }

  async insert(table: string, data: any): Promise<AdapterResult> {
    return this.withRetry(async () => {
      await this.checkCircuitBreaker();
      
      const startTime = Date.now();
      try {
        const result = await this.supabaseService.insert(table, data);
        
        return {
          success: true,
          data: result,
          metadata: {
            executionTime: Date.now() - startTime,
            adapter: 'SupabaseAdapter',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        this.recordFailure();
        throw error;
      }
    }).catch(error => ({
      success: false,
      error: error.message,
      metadata: {
        executionTime: Date.now() - startTime,
        adapter: 'SupabaseAdapter',
        timestamp: new Date().toISOString()
      }
    }));
  }

  async update(table: string, filters: any, data: any): Promise<AdapterResult> {
    return this.withRetry(async () => {
      await this.checkCircuitBreaker();
      
      const startTime = Date.now();
      try {
        const result = await this.supabaseService.update(table, filters, data);
        
        return {
          success: true,
          data: result,
          metadata: {
            executionTime: Date.now() - startTime,
            adapter: 'SupabaseAdapter',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        this.recordFailure();
        throw error;
      }
    }).catch(error => ({
      success: false,
      error: error.message,
      metadata: {
        executionTime: Date.now() - startTime,
        adapter: 'SupabaseAdapter',
        timestamp: new Date().toISOString()
      }
    }));
  }
}

/**
 * File Processing Adapter
 */
export class FileProcessingAdapter extends BaseAdapter {
  private fileValidationService: FileValidationService;
  private documentProcessor: DocumentProcessor;
  private pdfConversionService: EnhancedPdfConversionService;

  constructor(config: AdapterConfig = { enabled: true }) {
    super(config);
    this.fileValidationService = new FileValidationService();
    this.documentProcessor = new DocumentProcessor();
    this.pdfConversionService = new EnhancedPdfConversionService();
  }

  async validateFile(file: File, validationType: string): Promise<AdapterResult> {
    return this.withRetry(async () => {
      await this.checkCircuitBreaker();
      
      const startTime = Date.now();
      try {
        const result = await this.fileValidationService.validateFile(file, validationType);
        
        return {
          success: true,
          data: result,
          metadata: {
            executionTime: Date.now() - startTime,
            adapter: 'FileProcessingAdapter',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        this.recordFailure();
        throw error;
      }
    }).catch(error => ({
      success: false,
      error: error.message,
      metadata: {
        executionTime: Date.now() - startTime,
        adapter: 'FileProcessingAdapter',
        timestamp: new Date().toISOString()
      }
    }));
  }

  async processDocument(file: File, processingType: string): Promise<AdapterResult> {
    return this.withRetry(async () => {
      await this.checkCircuitBreaker();
      
      const startTime = Date.now();
      try {
        const result = await this.documentProcessor.process(file, processingType);
        
        return {
          success: true,
          data: result,
          metadata: {
            executionTime: Date.now() - startTime,
            adapter: 'FileProcessingAdapter',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        this.recordFailure();
        throw error;
      }
    }).catch(error => ({
      success: false,
      error: error.message,
      metadata: {
        executionTime: Date.now() - startTime,
        adapter: 'FileProcessingAdapter',
        timestamp: new Date().toISOString()
      }
    }));
  }

  async convertToPdf(file: File, conversionOptions?: any): Promise<AdapterResult> {
    return this.withRetry(async () => {
      await this.checkCircuitBreaker();
      
      const startTime = Date.now();
      try {
        const result = await this.pdfConversionService.convertToPdf(file, conversionOptions);
        
        return {
          success: true,
          data: result,
          metadata: {
            executionTime: Date.now() - startTime,
            adapter: 'FileProcessingAdapter',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        this.recordFailure();
        throw error;
      }
    }).catch(error => ({
      success: false,
      error: error.message,
      metadata: {
        executionTime: Date.now() - startTime,
        adapter: 'FileProcessingAdapter',
        timestamp: new Date().toISOString()
      }
    }));
  }
}

/**
 * HTTP Client Adapter
 */
export class HttpClientAdapter extends BaseAdapter {
  private httpClient: EnhancedHttpClient;

  constructor(config: AdapterConfig = { enabled: true }) {
    super(config);
    this.httpClient = new EnhancedHttpClient();
  }

  async request(options: any): Promise<AdapterResult> {
    return this.withRetry(async () => {
      await this.checkCircuitBreaker();
      
      const startTime = Date.now();
      try {
        const result = await this.httpClient.request(options);
        
        return {
          success: true,
          data: result,
          metadata: {
            executionTime: Date.now() - startTime,
            adapter: 'HttpClientAdapter',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        this.recordFailure();
        throw error;
      }
    }).catch(error => ({
      success: false,
      error: error.message,
      metadata: {
        executionTime: Date.now() - startTime,
        adapter: 'HttpClientAdapter',
        timestamp: new Date().toISOString()
      }
    }));
  }

  async get(url: string, headers?: any): Promise<AdapterResult> {
    return this.request({ method: 'GET', url, headers });
  }

  async post(url: string, data?: any, headers?: any): Promise<AdapterResult> {
    return this.request({ method: 'POST', url, data, headers });
  }

  async put(url: string, data?: any, headers?: any): Promise<AdapterResult> {
    return this.request({ method: 'PUT', url, data, headers });
  }

  async delete(url: string, headers?: any): Promise<AdapterResult> {
    return this.request({ method: 'DELETE', url, headers });
  }
}

/**
 * Processing Queue Adapter
 */
export class QueueAdapter extends BaseAdapter {
  private processingQueue: ProcessingQueue;

  constructor(config: AdapterConfig = { enabled: true }) {
    super(config);
    this.processingQueue = new ProcessingQueue();
  }

  async addTask(task: any, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<AdapterResult> {
    return this.withRetry(async () => {
      await this.checkCircuitBreaker();
      
      const startTime = Date.now();
      try {
        const result = await this.processingQueue.addTask(task, priority);
        
        return {
          success: true,
          data: result,
          metadata: {
            executionTime: Date.now() - startTime,
            adapter: 'QueueAdapter',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        this.recordFailure();
        throw error;
      }
    }).catch(error => ({
      success: false,
      error: error.message,
      metadata: {
        executionTime: Date.now() - startTime,
        adapter: 'QueueAdapter',
        timestamp: new Date().toISOString()
      }
    }));
  }

  async getQueueStatus(): Promise<AdapterResult> {
    return this.withRetry(async () => {
      await this.checkCircuitBreaker();
      
      const startTime = Date.now();
      try {
        const result = await this.processingQueue.getStatus();
        
        return {
          success: true,
          data: result,
          metadata: {
            executionTime: Date.now() - startTime,
            adapter: 'QueueAdapter',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        this.recordFailure();
        throw error;
      }
    }).catch(error => ({
      success: false,
      error: error.message,
      metadata: {
        executionTime: Date.now() - startTime,
        adapter: 'QueueAdapter',
        timestamp: new Date().toISOString()
      }
    }));
  }
}

/**
 * Integration Manager
 * Manages all adapters and provides unified interface
 */
export class IntegrationManager {
  private adapters: Map<string, BaseAdapter> = new Map();
  private config: any;

  constructor(config: any = {}) {
    this.config = config;
    this.initializeAdapters();
  }

  private initializeAdapters(): void {
    // Initialize all available adapters
    this.adapters.set('gemini', new GeminiAdapter(this.config.gemini));
    this.adapters.set('supabase', new SupabaseAdapter(this.config.supabase));
    this.adapters.set('fileProcessing', new FileProcessingAdapter(this.config.fileProcessing));
    this.adapters.set('httpClient', new HttpClientAdapter(this.config.httpClient));
    this.adapters.set('queue', new QueueAdapter(this.config.queue));
  }

  getAdapter(name: string): BaseAdapter | undefined {
    return this.adapters.get(name);
  }

  async executeWorkflow(workflow: any): Promise<AdapterResult> {
    const results: any[] = [];
    
    for (const step of workflow.steps) {
      const adapter = this.getAdapter(step.adapter);
      if (!adapter) {
        throw new Error(`Adapter ${step.adapter} not found`);
      }

      const method = adapter[step.method as keyof typeof adapter] as any;
      if (typeof method !== 'function') {
        throw new Error(`Method ${step.method} not found on adapter ${step.adapter}`);
      }

      const result = await method.call(adapter, ...(step.args || []));
      results.push(result);

      if (!result.success && step.required) {
        throw new Error(`Required step ${step.name} failed: ${result.error}`);
      }
    }

    return {
      success: true,
      data: results,
      metadata: {
        executionTime: Date.now(),
        adapter: 'IntegrationManager',
        timestamp: new Date().toISOString()
      }
    };
  }

  getAdapterStatus(): Map<string, { enabled: boolean; state: string; failures: number }> {
    const status = new Map();
    
    for (const [name, adapter] of this.adapters) {
      status.set(name, {
        enabled: adapter.config.enabled,
        state: adapter.circuitBreakerState,
        failures: adapter.failureCount
      });
    }
    
    return status;
  }

  updateAdapterConfig(name: string, config: AdapterConfig): void {
    const adapter = this.adapters.get(name);
    if (adapter) {
      adapter.config = { ...adapter.config, ...config };
    }
  }
}