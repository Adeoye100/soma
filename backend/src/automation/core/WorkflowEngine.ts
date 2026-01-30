import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { BusinessRuleError } from '../../shared/errors';
import { WorkflowDefinition, WorkflowContext, WorkflowStep, StepResult, WorkflowStatus } from '../types';

/**
 * Core Workflow Engine - Orchestrates automated workflows
 * Handles workflow execution, state management, error handling, and monitoring
 */
export class WorkflowEngine extends EventEmitter {
  private logger: winston.Logger;
  private activeWorkflows = new Map<string, WorkflowContext>();
  private workflowDefinitions = new Map<string, WorkflowDefinition>();

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
        new winston.transports.File({ filename: 'logs/workflows.log' })
      ]
    });

    // Set up event listeners for monitoring
    this.setupEventHandlers();
  }

  /**
   * Register a workflow definition
   */
  registerWorkflow(definition: WorkflowDefinition): void {
    this.workflowDefinitions.set(definition.id, definition);
    this.logger.info(`Workflow definition registered: ${definition.id}`, {
      steps: definition.steps.length,
      description: definition.description
    });
  }

  /**
   * Execute a workflow with given input
   */
  async executeWorkflow(
    workflowId: string,
    input: any,
    options: {
      correlationId?: string;
      priority?: 'low' | 'normal' | 'high';
      timeout?: number;
      retryCount?: number;
    } = {}
  ): Promise<StepResult> {
    const definition = this.workflowDefinitions.get(workflowId);
    if (!definition) {
      throw new BusinessRuleError('WORKFLOW_DEFINITION_NOT_FOUND', `Workflow definition not found: ${workflowId}`);
    }

    const workflowId_new = options.correlationId || uuidv4();
    const context: WorkflowContext = {
      id: workflowId_new,
      workflowId,
      status: WorkflowStatus.PENDING,
      input,
      currentStep: 0,
      results: [],
      startTime: new Date(),
      retryCount: 0,
      maxRetries: options.retryCount || definition.retryPolicy?.maxRetries || 3,
      timeout: options.timeout || definition.timeout || 300000, // 5 minutes default
      metadata: {
        priority: options.priority || 'normal',
        source: 'manual'
      }
    };

    this.activeWorkflows.set(workflowId_new, context);
    this.emit('workflowStarted', { workflowId: workflowId_new, definition });

    try {
      const result = await this.executeWorkflowSteps(context, definition);
      
      context.status = WorkflowStatus.COMPLETED;
      context.endTime = new Date();
      context.duration = context.endTime.getTime() - context.startTime.getTime();
      
      this.emit('workflowCompleted', { 
        workflowId: workflowId_new, 
        result,
        duration: context.duration 
      });

      return {
        success: true,
        data: result,
        metadata: {
          workflowId: workflowId_new,
          duration: context.duration,
          stepsExecuted: context.currentStep
        }
      };
    } catch (error) {
      return await this.handleWorkflowError(context, error as Error);
    } finally {
      this.activeWorkflows.delete(workflowId_new);
    }
  }

  /**
   * Execute workflow steps sequentially
   */
  private async executeWorkflowSteps(
    context: WorkflowContext, 
    definition: WorkflowDefinition
  ): Promise<any> {
    const results: any = {};

    for (let i = 0; i < definition.steps.length; i++) {
      const step = definition.steps[i];
      context.currentStep = i;
      
      this.emit('stepStarted', { 
        workflowId: context.id, 
        stepIndex: i, 
        stepName: step.name 
      });

      try {
        const stepResult = await this.executeStep(step, context, results);
        
        context.results.push({
          stepIndex: i,
          stepName: step!.name,
          success: stepResult.success,
          data: stepResult.data,
          error: stepResult.error,
          duration: stepResult.duration,
          timestamp: new Date()
        });

        results[step.name] = stepResult;

        if (!stepResult.success) {
          throw new BusinessRuleError(
            'STEP_EXECUTION_FAILED',
            `Step failed: ${step!.name}`,
            { stepIndex: i, stepName: step!.name, error: stepResult.error }
          );
        }

        this.emit('stepCompleted', { 
          workflowId: context.id, 
          stepIndex: i, 
          stepName: step!.name,
          duration: stepResult.duration
        });

        // Apply step results to context for next steps
        Object.assign(context, stepResult.data);

      } catch (error) {
        const stepError = error as Error;
        this.emit('stepFailed', { 
          workflowId: context.id, 
          stepIndex: i, 
          stepName: step!.name,
          error: stepError.message 
        });

        if (step.onError === 'continue') {
          this.logger.warn(`Step ${step!.name} failed but continuing workflow`, {
            workflowId: context.id,
            stepIndex: i,
            error: stepError.message
          });
          
          context.results.push({
            stepIndex: i,
            stepName: step!.name,
            success: false,
            error: stepError.message,
            duration: 0,
            timestamp: new Date()
          });
          
          continue;
        } else {
          throw stepError;
        }
      }
    }

    return results;
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    context: WorkflowContext,
    previousResults: any
  ): Promise<StepResult> {
    const startTime = Date.now();

    try {
      // Validate step prerequisites
      await this.validateStepPrerequisites(step, context, previousResults);

      // Execute the step logic
      const result = await step!.handler({
        input: context.input,
        context,
        previousResults,
        step
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: result,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const stepError = error as Error;

      this.logger.error(`Step execution failed: ${step.name}`, {
        workflowId: context.id,
        stepIndex: context.currentStep,
        error: stepError.message,
        stack: stepError.stack
      });

      return {
        success: false,
        error: stepError.message,
        duration
      };
    }
  }

  /**
   * Validate step prerequisites before execution
   */
  private async validateStepPrerequisites(
    step: WorkflowStep,
    context: WorkflowContext,
    previousResults: any
  ): Promise<void> {
    if (step.requires && step.requires.length > 0) {
      for (const requirement of step.requires) {
        const isAvailable = 
          context.input.hasOwnProperty(requirement) ||
          context.hasOwnProperty(requirement) ||
          previousResults.hasOwnProperty(requirement);

        if (!isAvailable) {
          throw new BusinessRuleError(
            'STEP_PREREQUISITE_NOT_MET',
            `Step ${step.name} prerequisite not met: ${requirement}`,
            { step: step.name, missingRequirement: requirement }
          );
        }
      }
    }
  }

  /**
   * Handle workflow errors with retry logic
   */
  private async handleWorkflowError(
    context: WorkflowContext,
    error: Error
  ): Promise<StepResult> {
    context.status = WorkflowStatus.FAILED;
    context.endTime = new Date();
    context.duration = context.endTime.getTime() - context.startTime.getTime();

    this.emit('workflowFailed', { 
      workflowId: context.id, 
      error: error.message,
      duration: context.duration,
      retryCount: context.retryCount
    });

    // Implement retry logic
    if (context.retryCount < context.maxRetries) {
      context.retryCount++;
      this.logger.warn(`Retrying workflow ${context.id} (attempt ${context.retryCount + 1}/${context.maxRetries + 1})`, {
        workflowId: context.id,
        retryCount: context.retryCount,
        maxRetries: context.maxRetries,
        error: error.message
      });

      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, context.retryCount), 30000);
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        const definition = this.workflowDefinitions.get(context.workflowId)!;
        return await this.executeWorkflowSteps(context, definition);
      } catch (retryError) {
        // If retry also fails, return the original error
        this.logger.error(`Workflow retry failed: ${context.id}`, {
          workflowId: context.id,
          retryCount: context.retryCount,
          originalError: error.message,
          retryError: (retryError as Error).message
        });
      }
    }

    this.logger.error(`Workflow permanently failed: ${context.id}`, {
      workflowId: context.id,
      finalRetryCount: context.retryCount,
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message,
      metadata: {
        workflowId: context.id,
        finalRetryCount: context.retryCount,
        duration: context.duration
      }
    };
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(workflowId: string): WorkflowContext | undefined {
    return this.activeWorkflows.get(workflowId);
  }

  /**
   * Cancel active workflow
   */
  cancelWorkflow(workflowId: string): boolean {
    const context = this.activeWorkflows.get(workflowId);
    if (context) {
      context.status = WorkflowStatus.CANCELLED;
      context.endTime = new Date();
      context.duration = context.endTime.getTime() - context.startTime.getTime();
      
      this.emit('workflowCancelled', { workflowId });
      this.activeWorkflows.delete(workflowId);
      
      this.logger.info(`Workflow cancelled: ${workflowId}`);
      return true;
    }
    return false;
  }

  /**
   * Get workflow engine statistics
   */
  getStats() {
    const stats = {
      activeWorkflows: this.activeWorkflows.size,
      registeredWorkflows: this.workflowDefinitions.size,
      workflowsByStatus: {} as Record<string, number>
    };

    // Count workflows by status
    for (const context of this.activeWorkflows.values()) {
      stats.workflowsByStatus[context.status] = 
        (stats.workflowsByStatus[context.status] || 0) + 1;
    }

    return stats;
  }

  /**
   * Set up event handlers for monitoring
   */
  private setupEventHandlers(): void {
    this.on('workflowStarted', (data) => {
      this.logger.info(`Workflow started: ${data.workflowId}`, data);
    });

    this.on('stepCompleted', (data) => {
      this.logger.debug(`Step completed: ${data.stepName}`, data);
    });

    this.on('workflowCompleted', (data) => {
      this.logger.info(`Workflow completed: ${data.workflowId}`, {
        duration: data.duration,
        stepsExecuted: data.result?.metadata?.stepsExecuted
      });
    });

    this.on('workflowFailed', (data) => {
      this.logger.error(`Workflow failed: ${data.workflowId}`, data);
    });
  }

  /**
   * Clean up resources
   */
  shutdown(): void {
    this.removeAllListeners();
    this.activeWorkflows.clear();
    this.workflowDefinitions.clear();
    this.logger.info('Workflow engine shutdown complete');
  }
}

export default WorkflowEngine;