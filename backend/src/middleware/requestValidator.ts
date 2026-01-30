import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from './errorHandler';

/**
 * Request Validation Middleware
 * Validates incoming requests using express-validator
 */

/**
 * Check validation result and throw error if validation fails
 */
export const checkValidationResult = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : error.type,
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
      location: error.type === 'field' ? error.location : 'body'
    }));

    throw new ValidationError('Validation failed', {
      errors: formattedErrors,
      totalErrors: errors.array().length
    });
  }
  
  next();
};

/**
 * Common validation rules
 */
export const commonValidations = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  id: param('id')
    .isUUID()
    .withMessage('ID must be a valid UUID'),
  
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  sortBy: query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'name', 'email'])
    .withMessage('sortBy must be one of: createdAt, updatedAt, name, email'),
  
  sortOrder: query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('sortOrder must be either asc or desc')
};

/**
 * Authentication validation rules
 */
export const authValidation = {
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Must be a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match password');
        }
        return true;
      }),
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('role')
      .optional()
      .isIn(['student', 'educator'])
      .withMessage('Role must be either student or educator'),
    checkValidationResult
  ],
  
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Must be a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    checkValidationResult
  ],
  
  refreshToken: [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required'),
    checkValidationResult
  ],
  
  forgotPassword: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Must be a valid email address'),
    checkValidationResult
  ],
  
  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match password');
        }
        return true;
      }),
    checkValidationResult
  ]
};

/**
 * Exam validation rules
 */
export const examValidation = {
  createExam: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('type')
      .isIn(['OBJECTIVE', 'SHORT_ANSWER', 'ESSAY'])
      .withMessage('Type must be one of: OBJECTIVE, SHORT_ANSWER, ESSAY'),
    body('difficulty')
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('Difficulty must be one of: easy, medium, hard'),
    body('numQuestions')
      .isInt({ min: 1, max: 50 })
      .withMessage('Number of questions must be between 1 and 50'),
    body('timeLimit')
      .optional()
      .isInt({ min: 1, max: 300 })
      .withMessage('Time limit must be between 1 and 300 minutes'),
    body('materials')
      .isArray({ min: 1 })
      .withMessage('At least one material is required'),
    body('materials.*.content')
      .notEmpty()
      .withMessage('Material content is required'),
    body('materials.*.mimeType')
      .isIn(['application/pdf', 'text/plain', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
      .withMessage('Unsupported file type'),
    checkValidationResult
  ],
  
  submitAnswer: [
    body('examId')
      .isUUID()
      .withMessage('Valid exam ID is required'),
    body('questionId')
      .isUUID()
      .withMessage('Valid question ID is required'),
    body('answer')
      .notEmpty()
      .withMessage('Answer is required'),
    checkValidationResult
  ],
  
  completeExam: [
    body('examId')
      .isUUID()
      .withMessage('Valid exam ID is required'),
    body('answers')
      .isArray({ min: 1 })
      .withMessage('At least one answer is required'),
    body('answers.*.questionId')
      .isUUID()
      .withMessage('Valid question ID is required'),
    body('answers.*.answer')
      .notEmpty()
      .withMessage('Answer is required'),
    checkValidationResult
  ]
};

/**
 * Material validation rules
 */
export const materialValidation = {
  uploadMaterial: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Title is required and must be less than 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('content')
      .notEmpty()
      .withMessage('Content is required'),
    body('mimeType')
      .isIn(['application/pdf', 'text/plain', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
      .withMessage('Unsupported file type'),
    checkValidationResult
  ]
};

/**
 * Result validation rules
 */
export const resultValidation = {
  getExamResults: [
    param('examId')
      .isUUID()
      .withMessage('Valid exam ID is required'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    checkValidationResult
  ],
  
  getUserResults: [
    param('userId')
      .optional()
      .isUUID()
      .withMessage('Valid user ID is required'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    checkValidationResult
  ]
};

/**
 * Generic validation middleware factory
 */
export const createValidationMiddleware = (validations: any[]) => {
  return [...validations];
};

/**
 * File upload validation
 */
export const fileValidation = {
  singleFile: [
    body('file')
      .custom((value, { req }) => {
        if (!req.file) {
          throw new Error('File is required');
        }
        return true;
      }),
    checkValidationResult
  ],
  
  multipleFiles: [
    body('files')
      .custom((value, { req }) => {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
          throw new Error('At least one file is required');
        }
        return true;
      }),
    checkValidationResult
  ]
};

/**
 * Sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize string inputs to prevent XSS
  const sanitizeString = (str: string): string => {
    return str
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  };

  // Recursively sanitize object properties
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  // Sanitize request body, query, and params
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

export default {
  checkValidationResult,
  commonValidations,
  authValidation,
  examValidation,
  materialValidation,
  resultValidation,
  fileValidation,
  createValidationMiddleware,
  sanitizeInput
};