import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
}

/**
 * Global Error Handler Middleware
 * Handles all types of errors in the application
 */
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Set default error properties
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  const code = error.code || 'INTERNAL_ERROR';
  const details = error.details;

  // Create error response
  const errorResponse: ErrorResponse = {
    error: getErrorName(statusCode),
    message,
    code,
    details,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // Add request ID if available
  if (req.headers['x-request-id']) {
    errorResponse.requestId = req.headers['x-request-id'] as string;
  }

  // Log error details
  if (statusCode >= 500) {
    // Server errors - log full stack trace
    winston.error('Server Error:', {
      error: error,
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        params: req.params,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      response: errorResponse
    });
  } else if (statusCode >= 400) {
    // Client errors - log basic info
    winston.warn('Client Error:', {
      error: {
        name: error.name,
        message: error.message,
        statusCode,
        code
      },
      request: {
        method: req.method,
        url: req.url,
        ip: req.ip
      },
      response: errorResponse
    });
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors automatically
 * Uses generic types to preserve Express Request, Response, and NextFunction types
 *
 * The handler function return value is discarded since Express only cares that
 * the request is processed. This prevents type errors when handlers return Response objects.
 */
export const asyncHandler = <P = any, ResBody = any, ReqBody = any, ReqQuery = any>(
  fn: (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => Promise<any> | any
): ((req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => void) => {
  return (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create Custom Error
 */
export class CustomError extends Error implements ApiError {
  statusCode: number;
  code: string;
  details?: any;
  isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'CUSTOM_ERROR',
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error
 */
export class ValidationError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends CustomError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends CustomError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends CustomError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends CustomError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

/**
 * External Service Error
 */
export class ExternalServiceError extends CustomError {
  constructor(service: string, message: string, details?: any) {
    super(`${service} service error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

/**
 * Database Error
 */
export class DatabaseError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

/**
 * AI Service Error
 */
export class AIServiceError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 503, 'AI_SERVICE_ERROR', details);
  }
}

/**
 * Get error name based on status code
 */
const getErrorName = (statusCode: number): string => {
  const errorNames: { [key: number]: string } = {
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Range Not Satisfiable',
    417: 'Expectation Failed',
    418: 'I\'m a teapot',
    421: 'Misdirected Request',
    422: 'Unprocessable Entity',
    423: 'Locked',
    424: 'Failed Dependency',
    425: 'Too Early',
    426: 'Upgrade Required',
    428: 'Precondition Required',
    429: 'Too Many Requests',
    431: 'Request Header Fields Too Large',
    451: 'Unavailable For Legal Reasons',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    505: 'HTTP Version Not Supported',
    506: 'Variant Also Negotiates',
    507: 'Insufficient Storage',
    508: 'Loop Detected',
    510: 'Not Extended',
    511: 'Network Authentication Required'
  };

  return errorNames[statusCode] || 'Unknown Error';
};

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    winston.error('Unhandled Rejection:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise
    });

    // Graceful shutdown
    process.exit(1);
  });
};

/**
 * Handle uncaught exceptions
 */
export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (error: Error) => {
    winston.error('Uncaught Exception:', {
      error: error.message,
      stack: error.stack
    });

    // Graceful shutdown
    process.exit(1);
  });
};

export default {
  errorHandler,
  asyncHandler,
  CustomError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  AIServiceError,
  handleUnhandledRejection,
  handleUncaughtException
};