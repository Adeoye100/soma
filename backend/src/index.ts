import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { logger } from '@/shared/utils/logger';
import { errorHandler, asyncHandler } from '@/middleware/errorHandler';
import { authMiddleware } from '@/middleware/auth';
import documentsRouter from '@/routes/documents-free';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://*.supabase.co'],
      connectSrc: ["'self'", 'https://*.supabase.co']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS Configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 600,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limit for health checks
    return req.path === '/health' || req.path === '/api/documents/health';
  }
});

app.use(limiter);

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ============================================
// DEBUG MIDDLEWARE
// ============================================

app.use((req: Request, res: Response, next: NextFunction) => {
  logger.debug(`${req.method} ${req.path}`, {
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']
  });
  next();
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'healthy',
    service: 'smart-examination-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API health
app.get('/api/health', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'healthy',
    service: 'api',
    timestamp: new Date().toISOString(),
    features: {
      document_extraction: 'free-ocr',
      auth: 'supabase',
      database: 'supabase-postgres'
    }
  });
});

// Document routes (FREE OCR VERSION)
app.use('/api/documents', documentsRouter);

// ============================================
// 404 HANDLER
// ============================================

app.use((req: Request, res: Response) => {
  logger.warn(`[404] Route not found: ${req.method} ${req.path}`);
  return res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`✅ Document extraction: FREE OCR (Tesseract + pdf-parse + Mammoth)`);
  logger.info(`✅ CORS enabled for: http://localhost:5173`);
  logger.info(`📊 Health check: GET /health`);
  logger.info(`📤 Document upload: POST /api/documents/extract-text`);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
