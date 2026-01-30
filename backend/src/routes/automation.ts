import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { automationOrchestrator, automationMonitor, checkAutomationHealth } from '@/automation';
import { authMiddleware } from '@/middleware/auth';
import { checkValidationResult } from '@/middleware/requestValidator';
import winston from 'winston';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/automation-routes.log' })
  ]
});

// Apply authentication to all automation routes
router.use(authMiddleware);

/**
 * GET /api/automation/health
 * Get automation system health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await checkAutomationHealth();
    res.json(health);
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(500).json({
      healthy: false,
      error: 'Health check failed',
      timestamp: new Date()
    });
  }
});

/**
 * GET /api/automation/status
 * Get automation system status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = automationOrchestrator.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Status check failed', error);
    res.status(500).json({
      error: 'Status check failed',
      timestamp: new Date()
    });
  }
});

/**
 * POST /api/automation/exam/generate
 * Generate exam using automation workflow
 */
router.post('/exam/generate',
  [
    body('materials').isArray({ min: 1 }).withMessage('Materials array is required'),
    body('config').isObject().withMessage('Configuration object is required'),
    body('options.outputFormat').optional().isIn(['json', 'xml', 'html', 'csv']).withMessage('Invalid output format'),
    body('options.includeValidation').optional().isBoolean().withMessage('Include validation must be boolean'),
    checkValidationResult
  ],
  async (req: Request, res: Response) => {
    try {
      const { materials, config, options = {} } = req.body;
      const user = (req as any).user;

      logger.info('Starting automated exam generation', {
        userId: user?.userId,
        materialCount: materials?.length,
        outputFormat: options.outputFormat
      });

      const result = await automationOrchestrator.generateExam(
        materials,
        config,
        user,
        options
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Exam generation failed', {
        userId: (req as any).user?.userId,
        error: (error as Error).message
      });

      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }
);

/**
 * POST /api/automation/process
 * Process input through automation pipeline
 */
router.post('/process',
  [
    body('input').exists().withMessage('Input is required'),
    body('preferredProcessor').optional().isString().withMessage('Preferred processor must be string'),
    body('validateInput').optional().isBoolean().withMessage('Validate input must be boolean'),
    checkValidationResult
  ],
  async (req: Request, res: Response) => {
    try {
      const { input, options = {} } = req.body;

      const result = await automationOrchestrator.processInput(input, options);

      res.json({
        success: true,
        data: result,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Input processing failed', {
        error: (error as Error).message
      });

      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }
);

/**
 * POST /api/automation/validate
 * Validate configuration using business rules
 */
router.post('/validate',
  [
    body('config').isObject().withMessage('Configuration object is required'),
    body('context').optional().isObject().withMessage('Context must be object'),
    checkValidationResult
  ],
  async (req: Request, res: Response) => {
    try {
      const { config, context = {} } = req.body;

      const result = await automationOrchestrator.validateConfiguration(config, context);

      res.json({
        success: true,
        data: result,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Configuration validation failed', {
        error: (error as Error).message
      });

      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }
);

/**
 * POST /api/automation/output
 * Generate output in specified format
 */
router.post('/output',
  [
    body('data').exists().withMessage('Data is required'),
    body('format').isIn(['json', 'xml', 'html', 'csv', 'pdf']).withMessage('Invalid format'),
    checkValidationResult
  ],
  async (req: Request, res: Response) => {
    try {
      const { data, format, options = {} } = req.body;

      const result = await automationOrchestrator.generateOutput(data, format, options);

      res.json({
        success: true,
        data: result,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Output generation failed', {
        format: req.body.format,
        error: (error as Error).message
      });

      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }
);

/**
 * POST /api/automation/workflow/:workflowId
 * Execute custom workflow
 */
router.post('/workflow/:workflowId',
  [
    param('workflowId').isString().notEmpty().withMessage('Workflow ID is required'),
    body('input').exists().withMessage('Input is required'),
    checkValidationResult
  ],
  async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      const { input, options = {} } = req.body;

      const result = await automationOrchestrator.executeWorkflow(workflowId!, input, options);

      res.json({
        success: true,
        data: result,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Workflow execution failed', {
        workflowId: req.params.workflowId,
        error: (error as Error).message
      });

      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }
);

/**
 * GET /api/automation/metrics
 * Get automation metrics
 */
router.get('/metrics',
  [
    query('startTime').optional().isISO8601().withMessage('Invalid start time'),
    query('endTime').optional().isISO8601().withMessage('Invalid end time'),
    query('componentId').optional().isString().withMessage('Invalid component ID'),
    query('workflowId').optional().isString().withMessage('Invalid workflow ID'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
    checkValidationResult
  ],
  async (req: Request, res: Response) => {
    try {
      const options: {
        startTime?: Date;
        endTime?: Date;
        componentId?: string;
        workflowId?: string;
        limit?: number;
      } = {};
      
      if (req.query.startTime) {
        options.startTime = new Date(req.query.startTime as string);
      }
      if (req.query.endTime) {
        options.endTime = new Date(req.query.endTime as string);
      }
      if (req.query.componentId) {
        options.componentId = req.query.componentId as string;
      }
      if (req.query.workflowId) {
        options.workflowId = req.query.workflowId as string;
      }
      if (req.query.limit) {
        options.limit = parseInt(req.query.limit as string, 10);
      }

      const metrics = automationMonitor.getMetrics(options);

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Metrics retrieval failed', {
        error: (error as Error).message
      });

      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }
);

/**
 * GET /api/automation/statistics
 * Get automation system statistics
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const statistics = automationMonitor.getStatistics();

    res.json({
      success: true,
      data: statistics,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Statistics retrieval failed', {
      error: (error as Error).message
    });

    res.status(500).json({
      success: false,
      error: (error as Error).message,
      timestamp: new Date()
    });
  }
});

/**
 * POST /api/automation/workflow
 * Register custom workflow
 */
router.post('/workflow',
  [
    body('workflow').isObject().withMessage('Workflow definition is required'),
    body('workflow.id').isString().notEmpty().withMessage('Workflow ID is required'),
    body('workflow.name').isString().notEmpty().withMessage('Workflow name is required'),
    body('workflow.steps').isArray({ min: 1 }).withMessage('Workflow steps are required'),
    checkValidationResult
  ],
  async (req: Request, res: Response) => {
    try {
      const { workflow } = req.body;

      automationOrchestrator.registerWorkflow(workflow);

      res.json({
        success: true,
        message: 'Workflow registered successfully',
        workflowId: workflow.id,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Workflow registration failed', {
        error: (error as Error).message
      });

      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }
);

export default router;