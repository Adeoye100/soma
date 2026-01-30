import { InputProcessor as IInputProcessor } from '../../../shared/types';
import { ServiceResult } from '../../../shared/types';

/**
 * Base class for processing inputs from various sources
 * Handles file uploads, API calls, database queries, and streaming data
 */
export abstract class InputProcessor implements IInputProcessor {
  public readonly id: string;
  public readonly name: string;
  public readonly type: 'file' | 'api' | 'database' | 'stream' | 'manual';
  public readonly config: any;
  public readonly enabled: boolean;

  constructor(processor: IInputProcessor) {
    this.id = processor.id;
    this.name = processor.name;
    this.type = processor.type;
    this.config = processor.config;
    this.enabled = processor.enabled;
  }

  /**
   * Process input data and return formatted output
   */
  abstract process(data: any): Promise<ServiceResult<any>>;

  /**
   * Validate input data before processing
   */
  abstract validate(data: any): Promise<ServiceResult<boolean>>;

  /**
   * Transform input data to required format
   */
  abstract transform(data: any): Promise<ServiceResult<any>>;

  /**
   * Health check for the input processor
   */
  async healthCheck(): Promise<ServiceResult<boolean>> {
    try {
      // Basic health check implementation
      return {
        success: true,
        data: true,
        metadata: { executionTime: 0 }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Health check failed',
          details: error
        }
      };
    }
  }

  /**
   * Get processing statistics
   */
  async getStats(): Promise<ServiceResult<any>> {
    return {
      success: true,
      data: {
        processorId: this.id,
        processorName: this.name,
        type: this.type,
        enabled: this.enabled,
        lastProcessed: null,
        totalProcessed: 0,
        successRate: 100
      },
      metadata: { executionTime: 0 }
    };
  }
}