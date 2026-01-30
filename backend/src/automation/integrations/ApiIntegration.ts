import { Request, Response } from 'express';
import { automationOrchestrator } from '../AutomationOrchestrator';
import { BusinessRuleError, ValidationError } from '../../shared/errors';
import winston from 'winston';

/**
 * API Integration Layer - Provides REST API endpoints for automation features
 * Integrates the automation framework with the existing Express.js application
 */
export class ApiIntegration {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/api-integration.log' })
      ]
    });
  }

  /**
   * Initialize the API integration
   */
  async initialize(): Promise<void> {
    try {
      await automationOrchestrator.initialize();
      this.logger.info('API integration initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize API integration', error);
      throw error;
    }
  }

  /**
   * Generate exam via API endpoint
   */
  async generateExam(req: Request, res: Response): Promise<void> {
    try {
      const { materials, config, user, options } = req.body;

      // Validate request
      this.validateExamGenerationRequest(materials, config);

      this.logger.info('Exam generation request received', {
        materialCount: materials?.length,
        config,
        userId: user?.userId,
        outputFormat: options?.outputFormat
      });

      // Generate exam using automation orchestrator
      const result = await automationOrchestrator.generateExam(
        materials,
        config,
        user,
        options
      );

      this.logger.info('Exam generation completed successfully', {
        examId: result.examId,
        questionCount: result.questionCount,
        processingTime: result.processingTime
      });

      res.json({
        success: true,
        data: result,
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTime: result.processingTime,
          version: '1.0.0'
        }
      });

    } catch (error) {
      this.logger.error('Exam generation failed', {
        error: (error as Error).message,
        stack: (error as Error).stack
      });

      this.handleApiError(res, error as Error);
    }
  }

  /**
   * Process input via API endpoint
   */
  async processInput(req: Request, res: Response): Promise<void> {
    try {
      const { input, options } = req.body;

      // Validate request
      if (!input) {
        throw new ValidationError('Input data is required');
      }

      this.logger.info('Input processing request received', {
        inputType: typeof input,
        processor: options?.preferredProcessor
      });

      // Process input using automation orchestrator
      const result = await automationOrchestrator.processInput(input, options);

      res.json({
        success: true,
        data: result,
        metadata: {
          processedAt: new Date().toISOString(),
          processorId: result.metadata.processorId
        }
      });

    } catch (error) {
      this.logger.error('Input processing failed', {
        error: (error as Error).message
      });

      this.handleApiError(res, error as Error);
    }
  }

  /**
   * Validate configuration via API endpoint
   */
  async validateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { config, context } = req.body;

      // Validate request
      if (!config) {
        throw new ValidationError('Configuration is required');
      }

      this.logger.info('Configuration validation request received', {
        configKeys: Object.keys(config)
      });

      // Validate configuration using automation orchestrator
      const result = await automationOrchestrator.validateConfiguration(config, context);

      res.json({
        success: true,
        data: result,
        metadata: {
          validatedAt: new Date().toISOString(),
          validationTime: result.result?.executionTime
        }
      });

    } catch (error) {
      this.logger.error('Configuration validation failed', {
        error: (error as Error).message
      });

      this.handleApiError(res, error as Error);
    }
  }

  /**
   * Generate output via API endpoint
   */
  async generateOutput(req: Request, res: Response): Promise<void> {
    try {
      const { data, format, options } = req.body;

      // Validate request
      if (!data) {
        throw new ValidationError('Data is required');
      }

      if (!format) {
        throw new ValidationError('Output format is required');
      }

      this.logger.info('Output generation request received', {
        format,
        dataType: typeof data
      });

      // Generate output using automation orchestrator
      const result = await automationOrchestrator.generateOutput(data, format, options);

      // Set appropriate content type based on format
      this.setResponseContentType(res, format);

      res.json({
        success: true,
        data: result,
        metadata: {
          generatedAt: new Date().toISOString(),
          format: result.format,
          size: result.size
        }
      });

    } catch (error) {
      this.logger.error('Output generation failed', {
        format: req.body.format,
        error: (error as Error).message
      });

      this.handleApiError(res, error as Error);
    }
  }

  /**
   * Execute custom workflow via API endpoint
   */
  async executeWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId, input, options } = req.body;

      // Validate request
      if (!workflowId) {
        throw new ValidationError('Workflow ID is required');
      }

      this.logger.info('Workflow execution request received', {
        workflowId,
        inputKeys: input ? Object.keys(input) : []
      });

      // Execute workflow using automation orchestrator
      const result = await automationOrchestrator.executeWorkflow(workflowId, input, options);

      res.json({
        success: result.success,
        data: result.success ? result : undefined,
        error: !result.success ? result.error : undefined,
        metadata: {
          executedAt: new Date().toISOString(),
          workflowId,
          executionTime: result.metadata?.executionTime
        }
      });

    } catch (error) {
      this.logger.error('Workflow execution failed', {
        workflowId: req.body.workflowId,
        error: (error as Error).message
      });

      this.handleApiError(res, error as Error);
    }
  }

  /**
   * Get automation system status via API endpoint
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      this.logger.info('System status request received');

      const status = automationOrchestrator.getStatus();

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to get system status', {
        error: (error as Error).message
      });

      this.handleApiError(res, error as Error);
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await automationOrchestrator.healthCheck();

      const statusCode = health.healthy ? 200 : 503;

      res.status(statusCode).json({
        healthy: health.healthy,
        details: health.details,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Health check failed', {
        error: (error as Error).message
      });

      res.status(503).json({
        healthy: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Register workflow via API endpoint
   */
  async registerWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflow } = req.body;

      // Validate request
      if (!workflow || !workflow.id || !workflow.steps) {
        throw new ValidationError('Valid workflow definition is required');
      }

      this.logger.info('Workflow registration request received', {
        workflowId: workflow.id,
        stepCount: workflow.steps.length
      });

      // Register workflow using automation orchestrator
      automationOrchestrator.registerWorkflow(workflow);

      res.json({
        success: true,
        message: 'Workflow registered successfully',
        data: {
          workflowId: workflow.id,
          stepCount: workflow.steps.length
        },
        metadata: {
          registeredAt: new Date().toISOString()
        }
      });

    } catch (error) {
      this.logger.error('Workflow registration failed', {
        error: (error as Error).message
      });

      this.handleApiError(res, error as Error);
    }
  }

  // Private helper methods

  private validateExamGenerationRequest(materials: any[], config: any): void {
    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      throw new ValidationError('Valid materials array is required');
    }

    if (!config || typeof config !== 'object') {
      throw new ValidationError('Valid configuration object is required');
    }

    if (!config.type || !['OBJECTIVE', 'SHORT_ANSWER', 'ESSAY'].includes(config.type)) {
      throw new ValidationError('Valid exam type is required (OBJECTIVE, SHORT_ANSWER, ESSAY)');
    }

    if (!config.difficulty || !['easy', 'medium', 'hard'].includes(config.difficulty)) {
      throw new ValidationError('Valid difficulty level is required (easy, medium, hard)');
    }

    if (!config.numQuestions || typeof config.numQuestions !== 'number' || config.numQuestions < 1 || config.numQuestions > 100) {
      throw new ValidationError('Number of questions must be between 1 and 100');
    }
  }

  private handleApiError(res: Response, error: Error): void {
    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';

    if (error instanceof ValidationError) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
    } else if (error instanceof BusinessRuleError) {
      statusCode = 422;
      errorCode = 'BUSINESS_RULE_ERROR';
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
    } else if (error.message.includes('timeout')) {
      statusCode = 408;
      errorCode = 'TIMEOUT';
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }

  private setResponseContentType(res: Response, format: string): void {
    const contentTypes: Record<string, string> = {
      'json': 'application/json',
      'html': 'text/html',
      'csv': 'text/csv',
      'xml': 'application/xml'
    };

    const contentType = contentTypes[format.toLowerCase()];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
  }
}

// Export Express.js route handlers
export const createAutomationRoutes = (apiIntegration: ApiIntegration) => {
  return {
    '/api/automation/exam/generate': {
      method: 'POST',
      handler: (req: Request, res: Response) => apiIntegration.generateExam(req, res)
    },
    '/api/automation/input/process': {
      method: 'POST',
      handler: (req: Request, res: Response) => apiIntegration.processInput(req, res)
    },
    '/api/automation/config/validate': {
      method: 'POST',
      handler: (req: Request, res: Response) => apiIntegration.validateConfiguration(req, res)
    },
    '/api/automation/output/generate': {
      method: 'POST',
      handler: (req: Request, res: Response) => apiIntegration.generateOutput(req, res)
    },
    '/api/automation/workflow/execute': {
      method: 'POST',
      handler: (req: Request, res: Response) => apiIntegration.executeWorkflow(req, res)
    },
    '/api/automation/workflow/register': {
      method: 'POST',
      handler: (req: Request, res: Response) => apiIntegration.registerWorkflow(req, res)
    },
    '/api/automation/status': {
      method: 'GET',
      handler: (req: Request, res: Response) => apiIntegration.getStatus(req, res)
    },
    '/api/automation/health': {
      method: 'GET',
      handler: (req: Request, res: Response) => apiIntegration.healthCheck(req, res)
    }
  };
};

// Example usage in Express.js application
export const setupAutomationRoutes = (app: any, apiIntegration: ApiIntegration) => {
  const routes = createAutomationRoutes(apiIntegration);

  Object.entries(routes).forEach(([path, config]) => {
    app[config.method.toLowerCase()](path, (req: Request, res: Response) => {
      config.handler(req, res);
    });
  });
};

export default ApiIntegration;