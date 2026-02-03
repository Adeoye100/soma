/**
 * Core automation engine that executes workflows autonomously
 * Processes inputs, applies business rules, and generates outputs
 * Reduces human intervention while maintaining reliability and scalability
 */

import { ActionRegistry } from './action-registry';
import { WorkflowDefinition, WorkflowContext, TaskResult, AutomationError, WorkflowState } from './types';
import { MonitoringService } from '../../infrastructure/monitoring/MonitoringService';

export class AutomationEngine {
  private actionRegistry: ActionRegistry;
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executionHistory: Map<string, WorkflowContext[]> = new Map();
  private monitoringService: MonitoringService;

  constructor() {
    this.actionRegistry = ActionRegistry.getInstance();
    this.monitoringService = new MonitoringService();
    this.initializeDefaultWorkflows();
  }

  private generateExecutionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private sanitizeInputs(inputs: any): any {
    return inputs; // Simple passthrough for now
  }

  private sanitizeOutputs(outputs: any): any {
    return outputs; // Simple passthrough for now
  }

  private addToHistory(workflowId: string, context: WorkflowContext): void {
    const history = this.executionHistory.get(workflowId) || [];
    history.push(context);
    this.executionHistory.set(workflowId, history);
  }

  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.id || !workflow.steps || workflow.steps.length === 0) {
      throw new Error('Invalid workflow definition');
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createAutomationError(message: string, code: string): AutomationError {
    const error = new Error(message) as AutomationError;
    error.code = code;
    error.timestamp = new Date();
    return error;
  }

  /**
   * Execute a workflow autonomously with given inputs
   */
  async executeWorkflow(
    workflowId: string,
    inputs: Record<string, any>,
    context?: Partial<WorkflowContext>
  ): Promise<TaskResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw this.createAutomationError(`Workflow ${workflowId} not found`, 'WORKFLOW_NOT_FOUND');
    }

    const executionId = this.generateExecutionId();
    const workflowContext: WorkflowContext = {
      executionId,
      workflowId,
      startTime: new Date(),
      inputs: { ...inputs },
      currentStep: 0,
      state: {
        status: 'pending',
        currentStep: 0,
        progress: 0,
        errors: [],
        variables: {}
      },
      ...context
    };

    try {
      // Log workflow start
      await this.monitoringService.emit({
        type: 'workflow_started',
        timestamp: new Date(),
        executionId,
        workflowId,
        data: this.sanitizeInputs(inputs)
      });

      const result = await this.processWorkflow(workflow, workflowContext);
      
      // Log workflow completion
      await this.monitoringService.emit({
        type: 'workflow_completed',
        timestamp: new Date(),
        executionId,
        workflowId,
        data: {
          output: this.sanitizeOutputs(result.output),
          duration: Date.now() - workflowContext.startTime.getTime()
        }
      });

      // Store execution history
      this.addToHistory(workflowId, workflowContext);

      return result;

    } catch (error) {
      const automationError = error as AutomationError;
      
      // Log workflow failure
      await this.monitoringService.emit({
        type: 'workflow_failed',
        timestamp: new Date(),
        executionId,
        workflowId,
        data: {
          error: automationError.message,
          step: workflowContext.currentStep,
          duration: Date.now() - workflowContext.startTime.getTime()
        }
      });

      // Attempt error recovery if configured
      if (workflow.errorHandling?.recoveryStrategy) {
        const recoveryResult = await this.attemptRecovery(workflow, workflowContext, automationError);
        if (recoveryResult.success) {
          return recoveryResult;
        }
      }

      throw automationError;
    }
  }

  /**
   * Register a new workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.validateWorkflow(workflow);
    this.workflows.set(workflow.id, workflow);
    
    // Register any custom actions required by this workflow
    workflow.requiredActions?.forEach(actionId => {
      if (!this.actionRegistry.getAction(actionId)) {
        console.warn(`Required action ${actionId} not registered for workflow ${workflow.id}`);
      }
    });
  }

  /**
   * Get workflow execution history
   */
  getExecutionHistory(workflowId?: string): WorkflowContext[] {
    if (workflowId) {
      return this.executionHistory.get(workflowId) || [];
    }
    
    const allHistory: WorkflowContext[] = [];
    this.executionHistory.forEach(history => {
      allHistory.push(...history);
    });
    
    return allHistory.sort((a, b) => 
      b.startTime.getTime() - a.startTime.getTime()
    );
  }

  /**
   * Process workflow steps autonomously
   */
  private async processWorkflow(
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<TaskResult> {
    let currentStep = 0;
    
    try {
      // Pre-processing hooks
      if (workflow.preProcessing) {
        await this.executeHook(workflow.preProcessing, context);
      }

      // Process each step in the workflow
      for (const step of workflow.steps) {
        context.currentStep = currentStep;
        
        // Check preconditions
        if (step.preconditions) {
          const conditionsMet = await this.evaluatePreconditions(step.preconditions, context);
          if (!conditionsMet) {
            throw this.createAutomationError(
              `Preconditions not met for step ${currentStep}`,
              'PRECONDITIONS_FAILED'
            );
          }
        }

        // Execute the step
        const stepResult = await this.executeStep(step, context);
        
        // Update context state
        context.state = { ...context.state, ...stepResult.state };
        
        // Update inputs for next step
        context.inputs = { ...context.inputs, ...stepResult.output };
        
        currentStep++;
      }

      // Post-processing hooks
      if (workflow.postProcessing) {
        await this.executeHook(workflow.postProcessing, context);
      }

      return {
        success: true,
        output: context.inputs,
        state: context.state,
        executionId: context.executionId,
        duration: Date.now() - context.startTime.getTime()
      };

    } catch (error) {
      context.currentStep = currentStep;
      throw error;
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: any,
    context: WorkflowContext
  ): Promise<TaskResult> {
    const action = this.actionRegistry.getAction(step.actionId);
    if (!action) {
      throw this.createAutomationError(
        `Action ${step.actionId} not found`,
        'ACTION_NOT_FOUND'
      );
    }

    // Prepare action inputs
    const actionInputs = this.prepareActionInputs(step.inputs, context);
    
    // Execute action with timeout and retry logic
    return await this.executeWithRetry(action, actionInputs, context, step.retryConfig);

  }

  /**
   * Execute action with retry logic
   */
  private async executeWithRetry(
    action: any,
    inputs: Record<string, any>,
    context: WorkflowContext,
    retryConfig?: any
  ): Promise<TaskResult> {
    const maxRetries = retryConfig?.maxRetries || 1;
    const retryDelay = retryConfig?.delay || 1000;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const result = await action.execute(inputs, context);
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt <= maxRetries) {
          await this.delay(retryDelay * attempt);
          continue;
        }
        
        throw this.createAutomationError(
          `Action failed after ${maxRetries} retries: ${lastError.message}`,
          'ACTION_EXECUTION_FAILED'
        );
      }
    }

    throw lastError!;
  }

  /**
   * Evaluate workflow preconditions
   */
  private async evaluatePreconditions(
    preconditions: any[],
    context: WorkflowContext
  ): Promise<boolean> {
    for (const condition of preconditions) {
      const conditionEvaluator = this.actionRegistry.getAction(condition.type);
      if (!conditionEvaluator) {
        console.warn(`Condition evaluator ${condition.type} not found`);
        return false;
      }

      const result = await conditionEvaluator.execute({
        ...condition.params
      }, context);

      if (!result.success) {
        return false;
      }
    }

    return true;
  }

  /**
   * Attempt error recovery
   */
  private async attemptRecovery(
    workflow: WorkflowDefinition,
    context: WorkflowContext,
    error: AutomationError
  ): Promise<TaskResult> {
    if (!workflow.errorHandling?.recoveryStrategy) {
      throw error;
    }

    const recoveryAction = this.actionRegistry.getAction(workflow.errorHandling.recoveryStrategy.actionId);
    if (!recoveryAction) {
      throw error;
    }

    try {
      const recoveryResult = await recoveryAction.execute({
        ...workflow.errorHandling.recoveryStrategy.params,
        error
      }, context);

      if (recoveryResult.success && workflow.errorHandling.retryOnRecovery) {
        // Retry the workflow from the failed step
        context.currentStep = 0;
        context.state = {
          status: 'pending',
          currentStep: 0,
          progress: 0,
          errors: [],
          variables: {}
        };
        return await this.processWorkflow(workflow, context);
      }

      return recoveryResult;
    } catch (recoveryError) {
      throw error; // Original error if recovery fails
    }
  }

  /**
   * Prepare action inputs by resolving variables and expressions
   */
  private prepareActionInputs(
    inputs: Record<string, any>,
    context: WorkflowContext
  ): Record<string, any> {
    const prepared: Record<string, any> = {};

    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        // Variable reference - resolve from context
        const variablePath = value.slice(2, -1);
        prepared[key] = this.resolveVariable(variablePath, context);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        prepared[key] = this.prepareActionInputs(value, context);
      } else {
        prepared[key] = value;
      }
    }

    return prepared;
  }

  /**
   * Resolve variable from context
   */
  private resolveVariable(path: string, context: WorkflowContext): any {
    const parts = path.split('.');
    let current: any = { ...context.state, ...context.inputs };

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Execute a hook function
   */
  private async executeHook(hook: any, context: WorkflowContext): Promise<void> {
    const hookAction = this.actionRegistry.getAction(hook.actionId);
    if (hookAction) {
      await hookAction.execute(hook.params || {}, context);
    }
  }

  /**
   * Initialize default workflows
   */
  private initializeDefaultWorkflows(): void {
    // Add built-in workflows here
    this.registerDefaultExamProcessingWorkflow();
    this.registerDefaultReportGenerationWorkflow();
    this.registerDefaultDataValidationWorkflow();
  }

  /**
   * Register default exam processing workflow
   */
  private registerDefaultExamProcessingWorkflow(): void {
    const examWorkflow: WorkflowDefinition = {
      id: 'exam_processing_default',
      name: 'Default Exam Processing',
      description: 'Process exam data with validation and grading',
      version: '1.0.0',
      triggers: ['exam_submission'],
      steps: [
        {
          actionId: 'validate_exam_data',
          name: 'Validate Exam Data',
          inputs: {
            examData: '${inputs.examData}'
          }
        }
      ]
    };
    this.registerWorkflow(examWorkflow);
  }

  private registerDefaultReportGenerationWorkflow(): void {
    // Implementation here
  }

  private registerDefaultDataValidationWorkflow(): void {
    // Implementation here
  }
}