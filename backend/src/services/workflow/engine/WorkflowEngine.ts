import { WorkflowDefinition, WorkflowExecution, WorkflowStep, WorkflowStepResult, WorkflowState } from '../../../shared/types';
import { InputProcessor } from '../processors/InputProcessor';
import { BusinessRulesEngine } from '../rules/BusinessRulesEngine';
import { OutputGenerator } from '../generators/OutputGenerator';
import { IntegrationComponent } from '../integrations/IntegrationComponent';
import { WorkflowExecutionEngine } from '../execution/WorkflowExecutionEngine';
import { EventEmitter } from 'events';

export class WorkflowEngine extends EventEmitter {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private inputProcessor: InputProcessor;
  private rulesEngine: BusinessRulesEngine;
  private outputGenerator: OutputGenerator;
  private executionEngine: WorkflowExecutionEngine;

  constructor() {
    super();
    this.inputProcessor = new InputProcessor();
    this.rulesEngine = new BusinessRulesEngine();
    this.outputGenerator = new OutputGenerator();
    this.executionEngine = new WorkflowExecutionEngine();
    
    this.setupEventHandlers();
  }

  /**
   * Register a new workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.id || !workflow.steps || workflow.steps.length === 0) {
      throw new Error('Invalid workflow definition: missing required fields');
    }

    this.workflows.set(workflow.id, workflow);
    this.emit('workflow:registered', { workflowId: workflow.id, name: workflow.name });
  }

  /**
   * Execute a workflow with the provided inputs
   */
  async executeWorkflow(
    workflowId: string, 
    inputs: Record<string, any>, 
    context?: Record<string, any>
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = this.generateExecutionId();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      startTime: new Date(),
      endTime: null,
      currentStep: 0,
      inputs,
      context: context || {},
      results: [],
      errors: [],
      metadata: {
        version: workflow.version,
        createdAt: new Date(),
        lastModified: new Date()
      }
    };

    this.executions.set(executionId, execution);
    this.emit('workflow:started', { executionId, workflowId });

    try {
      await this.runWorkflow(execution, workflow);
      execution.status = 'completed';
      execution.endTime = new Date();
      this.emit('workflow:completed', { executionId, workflowId });
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.errors.push({
        stepIndex: execution.currentStep,
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        recoverable: this.isRecoverableError(error)
      });
      this.emit('workflow:failed', { executionId, workflowId, error });
    }

    return execution;
  }

  /**
   * Get the current status of a workflow execution
   */
  getExecution(executionId: string): WorkflowExecution | null {
    return this.executions.get(executionId) || null;
  }

  /**
   * Get all executions for a specific workflow
   */
  getWorkflowExecutions(workflowId: string): WorkflowExecution[] {
    return Array.from(this.executions.values())
      .filter(execution => execution.workflowId === workflowId);
  }

  /**
   * Pause a running workflow execution
   */
  async pauseExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'paused';
    this.emit('workflow:paused', { executionId });
    return true;
  }

  /**
   * Resume a paused workflow execution
   */
  async resumeExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'paused') {
      return false;
    }

    execution.status = 'running';
    this.emit('workflow:resumed', { executionId });
    
    // Continue execution from where it left off
    const workflow = this.workflows.get(execution.workflowId);
    if (workflow) {
      await this.runWorkflow(execution, workflow);
    }
    
    return true;
  }

  /**
   * Cancel a workflow execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || (execution.status !== 'running' && execution.status !== 'paused')) {
      return false;
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();
    this.emit('workflow:cancelled', { executionId });
    return true;
  }

  /**
   * Get all registered workflows
   */
  getRegisteredWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Remove a workflow definition
   */
  unregisterWorkflow(workflowId: string): boolean {
    const removed = this.workflows.delete(workflowId);
    if (removed) {
      this.emit('workflow:unregistered', { workflowId });
    }
    return removed;
  }

  /**
   * Execute the workflow steps sequentially
   */
  private async runWorkflow(execution: WorkflowExecution, workflow: WorkflowDefinition): Promise<void> {
    for (let i = execution.currentStep; i < workflow.steps.length; i++) {
      execution.currentStep = i;
      const step = workflow.steps[i];
      
      this.emit('workflow:step:started', { 
        executionId: execution.id, 
        stepIndex: i, 
        stepType: step.type 
      });

      try {
        const result = await this.executeStep(step, execution);
        execution.results.push(result);
        this.emit('workflow:step:completed', { 
          executionId: execution.id, 
          stepIndex: i, 
          result 
        });
      } catch (error) {
        execution.errors.push({
          stepIndex: i,
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          recoverable: this.isRecoverableError(error)
        });

        if (!this.isRecoverableError(error)) {
          throw error;
        }

        this.emit('workflow:step:failed', { 
          executionId: execution.id, 
          stepIndex: i, 
          error 
        });
      }
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<WorkflowStepResult> {
    const startTime = new Date();
    
    let result: any;
    
    switch (step.type) {
      case 'input_processing':
        result = await this.inputProcessor.process(step.config, execution.inputs, execution.context);
        break;
        
      case 'business_rule':
        result = await this.rulesEngine.execute(step.config, execution.inputs, execution.context);
        break;
        
      case 'output_generation':
        result = await this.outputGenerator.generate(step.config, execution.inputs, execution.context);
        break;
        
      case 'integration':
        result = await this.executeIntegrationStep(step.config, execution);
        break;
        
      case 'conditional':
        result = await this.executeConditionalStep(step.config, execution);
        break;
        
      case 'loop':
        result = await this.executeLoopStep(step.config, execution);
        break;
        
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }

    return {
      stepId: step.id,
      stepType: step.type,
      success: true,
      data: result,
      executionTime: Date.now() - startTime.getTime(),
      timestamp: new Date()
    };
  }

  /**
   * Execute an integration step
   */
  private async executeIntegrationStep(config: any, execution: WorkflowExecution): Promise<any> {
    const integration = new IntegrationComponent(config.integrationType, config.config);
    return await integration.execute(execution.inputs, execution.context);
  }

  /**
   * Execute a conditional step
   */
  private async executeConditionalStep(config: any, execution: WorkflowExecution): Promise<any> {
    const condition = config.condition;
    const shouldExecute = await this.evaluateCondition(condition, execution);
    
    if (shouldExecute && config.then) {
      const results = [];
      for (const stepConfig of config.then) {
        const tempStep: WorkflowStep = {
          id: `conditional_${Date.now()}`,
          type: stepConfig.type,
          config: stepConfig.config
        };
        results.push(await this.executeStep(tempStep, execution));
      }
      return results;
    }
    
    return { skipped: true, reason: 'condition_not_met' };
  }

  /**
   * Execute a loop step
   */
  private async executeLoopStep(config: any, execution: WorkflowExecution): Promise<any> {
    const iterations = config.iterations || [];
    const results = [];
    
    for (const iteration of iterations) {
      const iterationContext = { ...execution.context, iteration };
      const tempExecution = { ...execution, context: iterationContext };
      
      const stepResults = [];
      for (const stepConfig of config.steps) {
        const tempStep: WorkflowStep = {
          id: `loop_${Date.now()}_${Math.random()}`,
          type: stepConfig.type,
          config: stepConfig.config
        };
        stepResults.push(await this.executeStep(tempStep, tempExecution));
      }
      
      results.push({ iteration, results: stepResults });
    }
    
    return results;
  }

  /**
   * Evaluate a condition for conditional steps
   */
  private async evaluateCondition(condition: any, execution: WorkflowExecution): Promise<boolean> {
    // Simple condition evaluation - can be extended for more complex logic
    if (typeof condition === 'function') {
      return await condition(execution.inputs, execution.context);
    }
    
    if (typeof condition === 'object') {
      // Evaluate JSON-based conditions
      const { field, operator, value } = condition;
      const fieldValue = this.getNestedValue(execution.inputs, field);
      
      switch (operator) {
        case 'equals': return fieldValue === value;
        case 'not_equals': return fieldValue !== value;
        case 'greater_than': return fieldValue > value;
        case 'less_than': return fieldValue < value;
        case 'contains': return String(fieldValue).includes(String(value));
        case 'exists': return fieldValue !== undefined && fieldValue !== null;
        default: return false;
      }
    }
    
    return Boolean(condition);
  }

  /**
   * Get nested object value by path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Check if an error is recoverable
   */
  private isRecoverableError(error: any): boolean {
    // Define recoverable error patterns
    const recoverablePatterns = [
      'timeout',
      'rate_limit',
      'temporary_failure',
      'network_error'
    ];
    
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return recoverablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup event handlers for workflow lifecycle
   */
  private setupEventHandlers(): void {
    this.on('workflow:started', (data) => {
      console.log(`Workflow started: ${data.executionId}`);
    });
    
    this.on('workflow:completed', (data) => {
      console.log(`Workflow completed: ${data.executionId}`);
    });
    
    this.on('workflow:failed', (data) => {
      console.error(`Workflow failed: ${data.executionId}`, data.error);
    });
  }
}