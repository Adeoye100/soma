import { Context, trace, Span, SpanStatusCode, SpanContext as OTSpanContext, SpanKind as OTSpanKind, context as contextAPI } from '@opentelemetry/api';
import { logger } from '../../shared/utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Distributed Tracing Service
 * Implements OpenTelemetry-based distributed tracing for automation workflows
 */
export class DistributedTracing {
  private static instance: DistributedTracing;
  private activeSpans: Map<string, Span> = new Map();
  private correlationContext: Map<string, Context> = new Map();
  private spanData: Map<string, { name: string; startTime: number }> = new Map();

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
    const traceId = options.traceId || uuidv4().replace(/-/g, '');
    const spanId = uuidv4().replace(/-/g, '').substring(0, 16);
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
    
    const otSpanContext: OTSpanContext = {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      traceFlags: 1 // Sampled
    };

    const parentContext = parentSpanId ? trace.setSpanContext(contextAPI.active(), {
      traceId,
      spanId: parentSpanId,
      traceFlags: 1
    }) : contextAPI.active();

    const span = tracer.startSpan(operationName, {
      attributes: {
        ...spanContext.attributes,
        'automation.trace.id': traceId,
        'automation.span.id': spanId,
        'automation.operation': operationName,
        'automation.timestamp': new Date().toISOString()
      },
      kind: options.kind as unknown as OTSpanKind
    }, parentContext);

    const startTime = Date.now();
    this.activeSpans.set(spanId, span);
    this.correlationContext.set(spanId, contextAPI.active());
    this.spanData.set(spanId, { name: operationName, startTime });

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
    const data = this.spanData.get(spanContext.spanId);
    
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
      this.spanData.delete(spanContext.spanId);

      logger.info('Ended trace span', {
        operationName: data?.name || 'unknown',
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
    const data = this.spanData.get(spanId);
    if (!span) return {};

    return {
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      operation: data?.name
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
  public getActiveSpans(): Array<{ spanId: string; operation: string; startTime: number }> {
    return Array.from(this.activeSpans.keys()).map(spanId => {
      const data = this.spanData.get(spanId);
      return {
        spanId,
        operation: data?.name || 'unknown',
        startTime: data?.startTime || 0
      };
    });
  }

  /**
   * Cleanup expired spans
   */
  public cleanupExpiredSpans(maxAgeMs: number = 300000): void { // 5 minutes
    const now = Date.now();
    const expiredSpans: string[] = [];

    this.spanData.forEach((data, spanId) => {
      if (now - data.startTime > maxAgeMs) {
        expiredSpans.push(spanId);
        const span = this.activeSpans.get(spanId);
        span?.end();
      }
    });

    expiredSpans.forEach(spanId => {
      this.activeSpans.delete(spanId);
      this.correlationContext.delete(spanId);
      this.spanData.delete(spanId);
    });

    if (expiredSpans.length > 0) {
      logger.info('Cleaned up expired spans', { count: expiredSpans.length });
    }
  }
}

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string | undefined;
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