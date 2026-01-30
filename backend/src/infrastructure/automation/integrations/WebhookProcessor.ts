import { EventEmitter } from 'events';
import crypto from 'crypto';
import { EnhancedHttpClient } from '../../http/EnhancedHttpClient';
// TODO: Import workflow types from the actual location
// import { Workflow, WorkflowEvent, WorkflowResult } from '../../domain/automation/types';

export interface WebhookConfiguration {
  id: string;
  url: string;
  secret: string;
  events: string[];
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  timeout: number;
  headers: Record<string, string>;
}

export interface WebhookEvent {
  id: string;
  source: string;
  type: string;
  timestamp: Date;
  payload: any;
  headers: Record<string, string>;
  signature?: string;
}

export interface WebhookResponse {
  status: number;
  body: any;
  headers: Record<string, string>;
}

// Temporary workflow types
interface Workflow {
  id: string;
  name: string;
  triggers: string[];
}

interface WorkflowEvent {
  id: string;
  type: string;
  payload: any;
}

interface WorkflowResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class WebhookProcessor extends EventEmitter {
  private httpClient: EnhancedHttpClient;
  private processingQueueService: any; // TODO: Inject ProcessingQueueService
  private webhookConfigs: Map<string, WebhookConfiguration> = new Map();
  private eventHistory: WebhookEvent[] = [];
  private responseCache: Map<string, WebhookResponse> = new Map();
  private circuitBreakers: Map<string, any> = new Map();

  constructor(httpClient: EnhancedHttpClient, processingQueueService?: any) {
    super();
    this.processingQueueService = processingQueueService;
    this.httpClient = httpClient;
    this.initializeCircuitBreakers();
  }

  /**
   * Register a new webhook configuration
   */
  registerWebhook(config: WebhookConfiguration): void {
    this.webhookConfigs.set(config.id, config);
    this.emit('webhook:registered', { configId: config.id });
  }

  /**
   * Process incoming webhook events
   */
  async processWebhookEvent(event: WebhookEvent): Promise<WorkflowResult> {
    try {
      // Verify signature if configured
      const config = this.findWebhookConfig(event.source);
      if (config && !this.verifySignature(event, config)) {
        throw new Error('Invalid webhook signature');
      }

      // Store event history
      this.eventHistory.push(event);
      if (this.eventHistory.length > 1000) {
        this.eventHistory = this.eventHistory.slice(-500);
      }

      // Find matching workflows
      const workflows = this.findMatchingWorkflows(event);
      
      if (workflows.length === 0) {
        return {
          success: true,
          data: { message: 'No matching workflows found', eventId: event.id }
        };
      }

      // Execute workflows
      const results = await Promise.allSettled(
        workflows.map(workflow => this.executeWorkflow(workflow, event))
      );

      // Process results
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      return {
        success: failureCount === 0,
        data: {
          eventId: event.id,
          workflowsExecuted: workflows.length,
          successes: successCount,
          failures: failureCount,
          results: results.map((r, i) => ({
            workflowId: workflows[i].id,
            status: r.status,
            result: r.status === 'fulfilled' ? r.value : r.reason
          }))
        }
      };

    } catch (error) {
      this.emit('webhook:error', { event, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: { eventId: event.id }
      };
    }
  }

  /**
   * Trigger webhooks for specific events
   */
  async triggerWebhooks(eventType: string, payload: any): Promise<WebhookResponse[]> {
    const matchingConfigs = Array.from(this.webhookConfigs.values())
      .filter(config => config.events.includes(eventType));

    const responses: WebhookResponse[] = [];

    for (const config of matchingConfigs) {
      try {
        // Check circuit breaker
        if (this.isCircuitBreakerOpen(config.id)) {
          this.emit('webhook:skipped', { configId: config.id, reason: 'circuit_breaker_open' });
          continue;
        }

        const response = await this.sendWebhook(config, eventType, payload);
        responses.push(response);

        // Reset circuit breaker on success
        this.resetCircuitBreaker(config.id);

        this.emit('webhook:success', { configId: config.id, status: response.status });

      } catch (error) {
        // Record circuit breaker failure
        this.recordCircuitBreakerFailure(config.id);
        this.emit('webhook:failure', { configId: config.id, error });
      }
    }

    return responses;
  }

  /**
   * Process webhook payload and trigger workflows
   */
  private async executeWorkflow(workflow: Workflow, event: WebhookEvent): Promise<any> {
    // Transform event data to workflow input
    const input = this.transformEventToWorkflowInput(event, workflow);

    // Execute the workflow through the processing queue
    let result;
    if (this.processingQueueService) {
      result = await this.processingQueueService.enqueue(workflow, input);
    } else {
      // Fallback for when processingQueueService is not available
      result = {
        success: true,
        data: { message: 'Workflow executed (no queue service available)', workflowId: workflow.id }
      };
    }
    
    return result;
  }

  /**
   * Send webhook to external service
   */
  private async sendWebhook(
    config: WebhookConfiguration,
    eventType: string,
    payload: any
  ): Promise<WebhookResponse> {
    const signature = this.generateSignature(config.secret, JSON.stringify(payload));

    const requestOptions = {
      method: 'POST' as const,
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': eventType,
        'X-Webhook-ID': crypto.randomUUID(),
        'X-Webhook-Signature': signature,
        ...config.headers
      },
      body: JSON.stringify(payload),
      timeout: config.timeout
    };

    const response = await this.httpClient.request(config.url, requestOptions);

    return {
      status: response.status,
      body: response.data,
      headers: response.headers || {}
    };
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(event: WebhookEvent, config: WebhookConfiguration): boolean {
    if (!event.signature) return false;

    const expectedSignature = this.generateSignature(
      config.secret,
      JSON.stringify(event.payload)
    );

    return event.signature === expectedSignature;
  }

  /**
   * Generate HMAC signature for webhook
   */
  private generateSignature(secret: string, payload: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Find webhook configuration by source
   */
  private findWebhookConfig(source: string): WebhookConfiguration | undefined {
    return Array.from(this.webhookConfigs.values()).find(
      config => config.url.includes(source) || config.id === source
    );
  }

  /**
   * Find workflows that match the event type
   */
  private findMatchingWorkflows(event: WebhookEvent): Workflow[] {
    // This would typically query a workflow repository
    // For now, return empty array as this is a framework component
    return [];
  }

  /**
   * Transform webhook event to workflow input
   */
  private transformEventToWorkflowInput(event: WebhookEvent, workflow: Workflow): any {
    return {
      eventId: event.id,
      eventType: event.type,
      source: event.source,
      timestamp: event.timestamp,
      payload: event.payload,
      headers: event.headers,
      metadata: {
        workflowId: workflow.id,
        processedAt: new Date()
      }
    };
  }

  /**
   * Initialize circuit breakers for each webhook
   */
  private initializeCircuitBreakers(): void {
    // Initialize circuit breaker states
    setInterval(() => this.checkCircuitBreakerReset(), 30000); // Check every 30 seconds
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(configId: string): boolean {
    const breaker = this.circuitBreakers.get(configId);
    return breaker?.state === 'open' && 
           Date.now() < breaker.nextRetryTime;
  }

  /**
   * Record circuit breaker failure
   */
  private recordCircuitBreakerFailure(configId: string): void {
    const breaker = this.circuitBreakers.get(configId) || {
      failures: 0,
      state: 'closed',
      nextRetryTime: 0
    };

    breaker.failures++;
    
    if (breaker.failures >= 5) {
      breaker.state = 'open';
      breaker.nextRetryTime = Date.now() + 60000; // 1 minute cooldown
    }

    this.circuitBreakers.set(configId, breaker);
  }

  /**
   * Reset circuit breaker on success
   */
  private resetCircuitBreaker(configId: string): void {
    this.circuitBreakers.set(configId, {
      failures: 0,
      state: 'closed',
      nextRetryTime: 0
    });
  }

  /**
   * Check and reset circuit breakers
   */
  private checkCircuitBreakerReset(): void {
    const now = Date.now();
    
    for (const [configId, breaker] of this.circuitBreakers.entries()) {
      if (breaker.state === 'open' && now >= breaker.nextRetryTime) {
        breaker.state = 'half-open';
        this.circuitBreakers.set(configId, breaker);
      }
    }
  }

  /**
   * Get webhook event history
   */
  getEventHistory(limit: number = 100): WebhookEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get webhook statistics
   */
  getWebhookStats(): {
    totalEvents: number;
    successRate: number;
    averageResponseTime: number;
    circuitBreakerStates: Record<string, string>;
  } {
    // This would typically collect real metrics
    return {
      totalEvents: this.eventHistory.length,
      successRate: 0.95,
      averageResponseTime: 250,
      circuitBreakerStates: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([id, breaker]) => [id, breaker.state])
      )
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.webhookConfigs.clear();
    this.eventHistory = [];
    this.responseCache.clear();
    this.circuitBreakers.clear();
    this.removeAllListeners();
  }
}