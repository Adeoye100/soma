import { Context, trace, Span, SpanStatusCode } from '@opentelemetry/api';
import { logger } from '../shared/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Distributed Tracing Service
 * Implements OpenTelemetry-based distributed tracing for automation workflows
 */
export class DistributedTracing {
  private static instance: DistributedTracing;
  private activeSpans: Map<string, Span> = new Map();
  private correlationContext: Map<string, Context> = new Map();

  private constructor() {}

  public static getInstance(): DistributedTracing {
    if (!DistributedTracing.instance) {
      DistributedTracing.instance = new DistributedTracing();
    }
    return DistributedTracing.instance;
  }

  /**
   * Start a new trace span
   */
  public startSpan(
    operationName: string,
    options: {
      traceId?: string;
      spanId?: string;
      parentSpanId?: string;
      attributes?: Record<string, any>;
      kind?: SpanKind;
      links?: SpanLink[];
    } = {}
  ): SpanContext {
    const traceId = options.traceId || uuidv4();
    const spanId = uuidv4();
    const parentSpanId = options.parentSpanId;
    
    const spanContext: SpanContext = {
      traceId,
      spanId,
      parentSpanId,
      attributes: options.attributes || {},
      kind: options.kind || SpanKind.INTERNAL,
      links: options.links || []
    };

    // Create OpenTelemetry span
    const tracer = trace.getTracer('automation-framework');
    const span = tracer.startSpan(operationName, {
      attributes: {
        ...spanContext.attributes,
        'automation.trace.id': traceId,
        'automation.span.id': spanId,
        'automation.operation': operationName,
        'automation.timestamp': new Date().toISOString()
      }
    }, parentSpanId ? trace.setSpanContext(Context.ROOT_CONTEXT, {
      traceId,
      spanId: parentSpanId
    }) : Context.ROOT_CONTEXT);

    this.activeSpans.set(spanId, span);
    this.correlationContext.set(spanId, Context.current());

    logger.info('Started trace span', {
      operationName,
      traceId,
      spanId,
      parentSpanId
    });

    return spanContext;
  }

  /**
   * End a trace span
   */
  public endSpan(spanContext: SpanContext, status: SpanStatusCode, error?: Error): void {
    const span = this.activeSpans.get(spanContext.spanId);
    if (!span) {
      logger.warn('Span not found for ending', { spanContext });
      return;
    }

    try {
      if (status === SpanStatusCode.ERROR && error) {
        span.setStatus({
          code: status,
          message: error.message
        });
        span.recordException(error);
      } else {
        span.setStatus({ code: status });
      }

      span.end();
      this.activeSpans.delete(spanContext.spanId);
      this.correlationContext.delete(spanContext.spanId);

      logger.info('Ended trace span', {
        operationName: span.name,
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        status
      });
    } catch (err) {
      logger.error('Error ending span', { error: err, spanContext });
    }
  }

  /**
   * Add attributes to active span
   */
  public addSpanAttributes(spanId: string, attributes: Record<string, any>): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.setAttributes(attributes);
      logger.debug('Added span attributes', { spanId, attributes });
    }
  }

  /**
   * Create a child span from parent
   */
  public createChildSpan(
    parentSpanId: string,
    operationName: string,
    attributes?: Record<string, any>
  ): SpanContext | null {
    const parentSpan = this.activeSpans.get(parentSpanId);
    if (!parentSpan) {
      logger.warn('Parent span not found for child span', { parentSpanId });
      return null;
    }

    return this.startSpan(operationName, {
      parentSpanId,
      attributes: {
        ...attributes,
        'automation.parent.span': parentSpanId
      }
    });
  }

  /**
   * Get correlation context for logging
   */
  public getCorrelationContext(spanId: string): Record<string, any> {
    const span = this.activeSpans.get(spanId);
    if (!span) return {};

    return {
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      operation: span.name
    };
  }

  /**
   * Trace workflow execution
   */
  public async traceWorkflowExecution<T>(
    workflowId: string,
    operation: () => Promise<T>,
    attributes?: Record<string, any>
  ): Promise<T> {
    const spanContext = this.startSpan('workflow.execution', {
      attributes: {
        'automation.workflow.id': workflowId,
        ...attributes
      }
    });

    try {
      const result = await operation();
      
      this.endSpan(spanContext, SpanStatusCode.OK);
      return result;
    } catch (error) {
      this.endSpan(spanContext, SpanStatusCode.ERROR, error as Error);
      throw error;
    }
  }

  /**
   * Trace queue job processing
   */
  public async traceQueueJob<T>(
    queueName: string,
    jobId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const spanContext = this.startSpan('queue.job.processing', {
      attributes: {
        'automation.queue.name': queueName,
        'automation.job.id': jobId
      }
    });

    try {
      const result = await operation();
      
      this.endSpan(spanContext, SpanStatusCode.OK);
      return result;
    } catch (error) {
      this.endSpan(spanContext, SpanStatusCode.ERROR, error as Error);
      throw error;
    }
  }

  /**
   * Get active spans for monitoring
   */
  public getActiveSpans(): Array<{ spanId: string; operation: string; startTime: string }> {
    return Array.from(this.activeSpans.entries()).map(([spanId, span]) => ({
      spanId,
      operation: span.name,
      startTime: span.startTime
    }));
  }

  /**
   * Cleanup expired spans
   */
  public cleanupExpiredSpans(maxAgeMs: number = 300000): void { // 5 minutes
    const now = Date.now();
    const expiredSpans: string[] = [];

    this.activeSpans.forEach((span, spanId) => {
      const startTime = span.startTime ? new Date(span.startTime).getTime() : 0;
      if (now - startTime > maxAgeMs) {
        expiredSpans.push(spanId);
        span.end();
      }
    });

    expiredSpans.forEach(spanId => {
      this.activeSpans.delete(spanId);
      this.correlationContext.delete(spanId);
    });

    if (expiredSpans.length > 0) {
      logger.info('Cleaned up expired spans', { count: expiredSpans.length });
    }
  }
}

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  attributes: Record<string, any>;
  kind: SpanKind;
  links: SpanLink[];
}

export enum SpanKind {
  INTERNAL = 0,
  SERVER = 1,
  CLIENT = 2,
  PRODUCER = 3,
  CONSUMER = 4
}

export interface SpanLink {
  context: SpanContext;
  attributes?: Record<string, any>;
}

// Export singleton instance
export const distributedTracing = DistributedTracing.getInstance();