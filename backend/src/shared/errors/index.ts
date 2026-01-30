import { ServiceError } from '../types';

/**
 * HTTP-specific error class
 */
export class HttpError extends Error {
  public readonly status: number;
  public readonly response: string | undefined;

  constructor(message: string, status: number, response?: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.response = response;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Base error class for the application
 */
export abstract class BaseError extends Error {
  public readonly code: string;
  public readonly details?: any;
  public readonly cause: Error | undefined;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    details?: any,
    cause?: Error,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.cause = cause;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toServiceError(): ServiceError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      ...(this.cause && { cause: this.cause }),
      isOperational: this.isOperational
    };
  }
}

/**
 * Domain-specific errors
 */
export class DomainError extends BaseError {
  constructor(message: string, details?: any, cause?: Error) {
    super(message, 'DOMAIN_ERROR', details, cause);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(message, 'AUTHENTICATION_ERROR', details);
  }
}

/**
 * Authorization errors
 */
export class AuthorizationError extends BaseError {
  constructor(message: string = 'Insufficient permissions', details?: any) {
    super(message, 'AUTHORIZATION_ERROR', details);
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends BaseError {
  constructor(resource: string, details?: any) {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', details);
  }
}

/**
 * Conflict errors
 */
export class ConflictError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT_ERROR', details);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends BaseError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(message, 'RATE_LIMIT_ERROR', details);
  }
}

/**
 * External service errors
 */
export class ExternalServiceError extends BaseError {
  constructor(service: string, message: string, details?: any, cause?: Error) {
    super(`${service} service error: ${message}`, 'EXTERNAL_SERVICE_ERROR', details, cause);
  }
}

/**
 * Database errors
 */
export class DatabaseError extends BaseError {
  constructor(message: string, details?: any, cause?: Error) {
    super(message, 'DATABASE_ERROR', details, cause);
  }
}

/**
 * AI service errors
 */
export class AIServiceError extends BaseError {
  constructor(message: string, details?: any, cause?: Error) {
    super(message, 'AI_SERVICE_ERROR', details, cause);
  }
}

/**
 * Cache errors
 */
export class CacheError extends BaseError {
  constructor(message: string, details?: any, cause?: Error) {
    super(message, 'CACHE_ERROR', details, cause);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIGURATION_ERROR', details);
  }
}

/**
 * Business rule violation errors
 */
export class BusinessRuleError extends BaseError {
  constructor(rule: string, message: string, details?: any) {
    super(`Business rule violation: ${rule} - ${message}`, 'BUSINESS_RULE_ERROR', details);
  }
}

/**
 * Request timeout errors
 */
export class TimeoutError extends BaseError {
  constructor(operation: string, timeoutMs: number) {
    super(`${operation} timed out after ${timeoutMs}ms`, 'TIMEOUT_ERROR', { operation, timeoutMs });
  }
}

/**
 * Network errors
 */
export class NetworkError extends BaseError {
  constructor(message: string, details?: any, cause?: Error) {
    super(message, 'NETWORK_ERROR', details, cause);
  }
}

/**
 * Unknown errors
 */
export class UnknownError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'UNKNOWN_ERROR', undefined, cause, false);
  }
}

