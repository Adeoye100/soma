import { EventEmitter } from 'events';
import { WorkflowEngine } from './core/WorkflowEngine';
import { WorkflowDefinition } from './core/types';
import { inputProcessorRegistry } from './processors/InputProcessor';
import { BusinessRulesEngine } from './rules/BusinessRulesEngine';
import { createExamBusinessRules } from './rules/ExamBusinessRules';
import { outputGeneratorRegistry } from './output/OutputGenerator';
import { BusinessRuleError, ValidationError } from '../shared/errors';
import winston from 'winston';

/**
 * Automation Orchestrator - Main interface for workflow automation
 * Coordinates input processing, business rules, workflow execution, and output generation
 */
export class AutomationOrchestrator extends EventEmitter {
  private logger: winston.Logger;
  private workflowEngine: WorkflowEngine;
  private rulesEngine: BusinessRulesEngine;
  private initialized = false;

  constructor() {
    super();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/automation.log' })
      ]
    });

    this.workflowEngine = new WorkflowEngine();
    this.rulesEngine = new BusinessRulesEngine();

    this.setupEventHandlers();
  }

  /**
   * Initialize the automation system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.logger.info('Initializing automation orchestrator...');

      // Register default workflows
      this.registerDefaultWorkflows();

      // Register business rules
      this.registerBusinessRules();

      // Setup event handlers
      this.setupOrchestrationEventHandlers();

      this.initialized = true;
      this.logger.info('Automation orchestrator initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize automation orchestrator', error);
      throw new BusinessRuleError('ORCHESTRATOR_INIT_FAILED',
        `Failed to initialize automation system: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Execute automated exam generation workflow
   */
  async generateExam(
    materials: any[],
    config: any,
    user?: any,
    options: {
      outputFormat?: string;
      includeValidation?: boolean;
      outputOptions?: any;
    } = {}
  ): Promise<any> {
    const workflowId = 'exam-generation-workflow';
    
    const input = {
      materials,
      config,
      user,
      options
    };

    this.logger.info('Starting exam generation workflow', {
      materialCount: materials?.length,
      config,
      userId: user?.userId,
      outputFormat: options.outputFormat
    });

    try {
      // Execute the workflow
      const result = await this.workflowEngine.executeWorkflow(workflowId, input, {
        correlationId: `exam-${Date.now()}`,
        priority: 'normal',
        timeout: 300000 // 5 minutes
      });

      if (!result.success) {
        throw new BusinessRuleError('WORKFLOW_EXECUTION_FAILED',
          `Exam generation failed: ${result.error}`,
          { workflowResult: result }
        );
      }

      this.logger.info('Exam generation workflow completed successfully', {
        workflowId,
        executionTime: result.metadata?.duration
      });

      return result.data;

    } catch (error) {
      this.logger.error('Exam generation workflow failed', {
        workflowId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Process input through the automation pipeline
   */
  async processInput(
    input: any,
    options: {
      preferredProcessor?: string;
      validateInput?: boolean;
    } = {}
  ): Promise<any> {
    this.ensureInitialized();

    try {
      this.logger.info('Processing input through automation pipeline', {
        inputType: typeof input,
        preferredProcessor: options.preferredProcessor
      });

      // Process input
      const processedInput = await inputProcessorRegistry.processInput(
        input,
        options.preferredProcessor
      );

      this.logger.info('Input processing completed', {
        processorId: processedInput.metadata.processorId,
        processingTime: processedInput.metadata.processingTime
      });

      return processedInput;

    } catch (error) {
      this.logger.error('Input processing failed', {
        error: (error as Error).message,
        inputType: typeof input
      });
      throw error;
    }
  }

  /**
   * Validate configuration using business rules
   */
  async validateConfiguration(
    config: any,
    context: any = {}
  ): Promise<any> {
    this.ensureInitialized();

    try {
      this.logger.info('Validating configuration', {
        configKeys: Object.keys(config),
        contextKeys: Object.keys(context)
      });

      const ruleContext = {
        input: { config, ...context },
        workflowContext: undefined,
        previousResults: undefined,
        metadata: {
          source: 'validation',
          timestamp: new Date().toISOString()
        }
      };

      const validationResult = await this.rulesEngine.evaluateRuleChain(
        'exam-validation-chain',
        ruleContext
      );

      this.logger.info('Configuration validation completed', {
        passed: validationResult.overallPassed,
        checkCount: validationResult.summary.totalRules,
        criticalFailures: validationResult.summary.criticalFailures
      });

      return {
        valid: validationResult.overallPassed,
        result: validationResult,
        summary: validationResult.summary
      };

    } catch (error) {
      this.logger.error('Configuration validation failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Generate output in specified format
   */
  async generateOutput(
    data: any,
    format: string,
    options: any = {}
  ): Promise<any> {
    this.ensureInitialized();

    try {
      this.logger.info('Generating output', {
        format,
        dataType: typeof data,
        dataKeys: data ? Object.keys(data) : []
      });

      const output = await outputGeneratorRegistry.generateOutput(data, format, options);

      this.logger.info('Output generation completed', {
        format: output.format,
        size: output.size,
        generationTime: output.metadata.generationTime
      });

      return output;

    } catch (error) {
      this.logger.error('Output generation failed', {
        format,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Execute custom workflow
   */
  async executeWorkflow(
    workflowId: string,
    input: any,
    options: any = {}
  ): Promise<any> {
    this.ensureInitialized();

    return this.workflowEngine.executeWorkflow(workflowId, input, options);
  }

  /**
   * Register custom workflow
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflowEngine.registerWorkflow(workflow);
    this.logger.info('Custom workflow registered', {
      workflowId: workflow.id,
      stepCount: workflow.steps.length
    });
  }

  /**
   * Get system status
   */
  getStatus() {
    this.ensureInitialized();

    return {
      initialized: this.initialized,
      workflowEngine: this.workflowEngine.getStats(),
      rulesEngine: this.rulesEngine.getStats(),
      inputProcessors: inputProcessorRegistry.getStats(),
      outputGenerators: outputGeneratorRegistry.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      this.ensureInitialized();

      const status = this.getStatus();
      
      const healthy = 
        status.initialized &&
        status.workflowEngine.registeredWorkflows > 0 &&
        status.rulesEngine.enabledRules > 0 &&
        status.inputProcessors.totalProcessors > 0 &&
        status.outputGenerators.totalGenerators > 0;

      return {
        healthy,
        details: status
      };

    } catch (error) {
      return {
        healthy: false,
        details: {
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down automation orchestrator...');

    this.workflowEngine.shutdown();
    this.rulesEngine.shutdown();
    
    this.removeAllListeners();
    this.initialized = false;

    this.logger.info('Automation orchestrator shutdown complete');
  }

  // Private methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new BusinessRuleError('ORCHESTRATOR_NOT_INITIALIZED',
        'Automation orchestrator must be initialized before use');
    }
  }

  private registerDefaultWorkflows(): void {
    const examGenerationWorkflow: WorkflowDefinition = {
      id: 'exam-generation-workflow',
      name: 'Exam Generation Workflow',
      description: 'Complete workflow for automated exam generation from materials',
      version: '1.0.0',
      timeout: 300000, // 5 minutes
      retryPolicy: {
        maxRetries: 2,
        backoffMultiplier: 2,
        maxDelay: 30000
      },
      steps: [
        {
          name: 'validate-input',
          description: 'Validate input materials and configuration',
          handler: this.createInputValidationStep(),
          requires: ['materials', 'config'],
          onError: 'stop'
        },
        {
          name: 'process-materials',
          description: 'Process and normalize study materials',
          handler: this.createMaterialProcessingStep(),
          requires: ['materials'],
          onError: 'stop'
        },
        {
          name: 'validate-configuration',
          description: 'Validate exam configuration using business rules',
          handler: this.createConfigurationValidationStep(),
          requires: ['config', 'user'],
          onError: 'continue'
        },
        {
          name: 'generate-questions',
          description: 'Generate exam questions using AI',
          handler: this.createQuestionGenerationStep(),
          requires: ['processedMaterials', 'validatedConfig'],
          onError: 'stop'
        },
        {
          name: 'format-output',
          description: 'Format and structure the generated exam',
          handler: this.createOutputFormattingStep(),
          requires: ['generatedQuestions'],
          onError: 'continue'
        }
      ]
    };

    this.workflowEngine.registerWorkflow(examGenerationWorkflow);
  }

  private registerBusinessRules(): void {
    const examRules = createExamBusinessRules();
    this.rulesEngine.registerRules(examRules);

    // Create rule chains
    this.rulesEngine.createRuleChain(
      'exam-validation-chain',
      examRules.map(rule => rule.id),
      'Chain for comprehensive exam validation'
    );
  }

  private setupEventHandlers(): void {
    this.workflowEngine.on('workflowCompleted', (data) => {
      this.emit('workflowCompleted', data);
    });

    this.workflowEngine.on('workflowFailed', (data) => {
      this.emit('workflowFailed', data);
    });

    this.rulesEngine.on('rulesEvaluated', (data) => {
      this.emit('rulesEvaluated', data);
    });
  }

  private setupOrchestrationEventHandlers(): void {
    this.on('workflowCompleted', (data) => {
      this.logger.info('Orchestrator workflow completed', {
        workflowId: data.workflowId,
        duration: data.duration
      });
    });

    this.on('workflowFailed', (data) => {
      this.logger.error('Orchestrator workflow failed', {
        workflowId: data.workflowId,
        error: data.error
      });
    });
  }

  private createInputValidationStep() {
    return async (context: any) => {
      const { input } = context;
      
      // Validate materials
      if (!input.materials || !Array.isArray(input.materials) || input.materials.length === 0) {
        throw new ValidationError('Valid materials array is required');
      }

      // Validate config
      if (!input.config || typeof input.config !== 'object') {
        throw new ValidationError('Valid configuration object is required');
      }

      return {
        success: true,
        data: {
          inputValidationPassed: true,
          materialCount: input.materials.length,
          configType: input.config.type
        }
      };
    };
  }

  private createMaterialProcessingStep() {
    return async (context: any) => {
      const { input } = context;
      
      const processedMaterials = await Promise.all(
        input.materials.map(async (material: any) => {
          const processed = await inputProcessorRegistry.processInput(material, 'material-processor');
          return processed.data;
        })
      );

      return {
        success: true,
        data: {
          processedMaterials,
          totalProcessed: processedMaterials.length
        }
      };
    };
  }

  private createConfigurationValidationStep() {
    return async (context: any) => {
      const { input } = context;
      
      const ruleContext = {
        input: {
          config: input.config,
          materials: input.materials,
          user: input.user
        },
        metadata: {
          source: 'workflow',
          step: 'configuration-validation'
        }
      };

      const validationResult = await this.rulesEngine.evaluateRuleChain(
        'exam-validation-chain',
        ruleContext
      );

      return {
        success: true,
        data: {
          validationResult,
          configurationValid: validationResult.overallPassed
        }
      };
    };
  }

  private createQuestionGenerationStep() {
    return async (context: any) => {
      const { previousResults } = context;

      // Use the existing CodeBasedExamService for question generation
      const codeBasedExamService = require('../../services/CodeBasedExamService').codeBasedExamService;

      const config = previousResults['validate-configuration'].data.validationResult?.data?.processedConfig || context.input.config;
      const materials = previousResults['process-materials'].data.processedMaterials;

      // Convert materials to the expected format
      const formattedMaterials = materials.map((material: any) => ({
        content: typeof material === 'string' ? material : material.content || JSON.stringify(material),
        mimeType: 'text/plain',
        title: material.title || 'Study Material'
      }));

      const questions = await codeBasedExamService.generateExam(config, formattedMaterials);

      return {
        success: true,
        data: {
          generatedQuestions: questions,
          questionCount: questions.length
        }
      };
    };
  }

  private createOutputFormattingStep() {
    return async (context: any) => {
      const { previousResults, input, options } = context;
      
      const examData = {
        config: input.config,
        materials: input.materials,
        questions: previousResults['generate-questions'].data.generatedQuestions,
        metadata: {
          generatedAt: new Date().toISOString(),
          workflowId: context.context.id,
          processingTime: context.context.duration
        }
      };

      // Generate output in requested format
      let formattedOutput = examData;
      
      if (options.outputFormat && options.outputFormat !== 'json') {
        const output = await outputGeneratorRegistry.generateOutput(
          examData,
          options.outputFormat,
          options.outputOptions
        );
        formattedOutput = output.content;
      }

      return {
        success: true,
        data: {
          formattedOutput,
          outputFormat: options.outputFormat || 'json'
        }
      };
    };
  }
}

// Export singleton instance
export const automationOrchestrator = new AutomationOrchestrator();

export default AutomationOrchestrator;