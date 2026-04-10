import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createClient, RedisClientType } from 'redis';
import winston from 'winston';
import path from 'path';

// Import configuration and validation
import { config, validateConfig } from '@/config';

// Import middleware
import { authMiddleware } from '@/middleware/auth';
import { errorHandler } from '@/middleware/errorHandler';
import { checkValidationResult } from '@/middleware/requestValidator';
import { corsOptions } from '@/middleware/cors';

// Import infrastructure
import { authRateLimiter, examGenerationRateLimiter, generalRateLimiter } from '@/infrastructure/rateLimiter';

// Import routes
import authRoutes from '@/routes/auth';
import examRoutes from '@/routes/exam';
import materialRoutes from '@/routes/material';
import resultRoutes from '@/routes/result';
import healthRoutes from '@/routes/health';
import automationRoutes from '@/routes/automation';
import fileUploadRoutes from '@/routes/fileUpload';
import documentRoutes from '@/routes/documents';
import leaderboardRoutes from '@/routes/leaderboard';
import userRoutes from '@/routes/user';
import adminRoutes from '@/routes/admin';
import feedbackRoutes from '@/routes/feedback';

// Import automation framework
import { initializeAutomationFramework, checkAutomationHealth } from '@/automation';

// Import Supabase client for schema cache reload
import { supabase } from '@/services/supabaseService';

// Create Express application
const app = express();

// Trust proxy for accurate IP addresses in production
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// Track whether Redis unavailable warning was already logged
let redisUnavailableLogged = false;

// Create Redis client for rate limiting
const redisClient: RedisClientType = createClient({
  url: config.redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        return false; // Stop retrying after 3 attempts
      }
      return Math.min(retries * 50, 500);
    }
  }
});

redisClient.on('error', (err) => {
  if (!redisUnavailableLogged) {
    redisUnavailableLogged = true;
    console.warn('⚠️  Redis unavailable, using in-memory store');
  }
});

// Initialize Redis connection
const initializeRedis = async (): Promise<void> => {
  if (!config.redisEnabled) {
    console.log('ℹ️  Redis disabled via REDIS_ENABLED=false, using in-memory store');
    return;
  }

  try {
    await redisClient.connect();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    if (!redisUnavailableLogged) {
      redisUnavailableLogged = true;
    }
    console.warn('⚠️  Redis connection failed, falling back to memory store');
  }
};

// Helper function to convert log size string to bytes
const parseLogSizeToBytes = (logSize: string | undefined): number => {
  if (!logSize) return 10 * 1024 * 1024; // Default to 10MB
  
  const units = { 'b': 1, 'k': 1024, 'm': 1024 * 1024, 'g': 1024 * 1024 * 1024 };
  const normalizedSize = logSize.toLowerCase();
  const match = normalizedSize.match(/^(\d+)([kmg]?)b?$/);
  if (!match) return 10 * 1024 * 1024; // Default to 10MB
  
  const value = parseInt(match[1] || '10', 10);
  const unit = (match[2] || 'm') as keyof typeof units;
  return value * (units[unit] || 1);
};

// Configure Winston logger
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'smart-examination-backend' },
  transports: [
    // Write all logs to files
    new winston.transports.File({
      filename: path.join(process.cwd(), config.logFilePath || 'logs/app.log'),
      maxsize: parseLogSizeToBytes(config.logMaxSize),
      maxFiles: config.logMaxFiles
    }),
    // Write error logs to separate file
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: parseLogSizeToBytes(config.logMaxSize),
      maxFiles: config.logMaxFiles
    })
  ]
});

// Add console logging in development
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Security Middleware
if (config.helmetEnabled) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        styleSrc:       ["'self'", "'unsafe-inline'",
                         "https://fonts.googleapis.com"],
        stylesSrcElem:  ["'self'", "'unsafe-inline'",
                         "https://fonts.googleapis.com"],
        fontSrc:        ["'self'", "https://fonts.gstatic.com"],
        scriptSrc:      ["'self'"],
        imgSrc:         ["'self'", "data:", "blob:",
                         "https://*.supabase.co",
                         "https://lh3.googleusercontent.com"],
        connectSrc:     ["'self'",
                         "https://*.supabase.co",
                         "https://generativelanguage.googleapis.com"],
        frameAncestors: ["'none'"],
        objectSrc:      ["'none'"],
        baseUri:        ["'self'"],
        formAction:     ["'self'"]
      }
    },
    hsts: {
      maxAge: config.hstsMaxAge,
      includeSubDomains: true,
      preload: true
    }
  }));
}

// CORS Configuration
app.use(cors(corsOptions));

// Cookie Parser middleware
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Health check route (no authentication required)
app.use('/api/health', healthRoutes);

// Enhanced rate limiting using the new infrastructure
app.use(generalRateLimiter);

// Strict rate limiting for authentication routes
app.use('/api/auth', authRateLimiter);

// Strict rate limiting for exam generation
app.use('/api/exam/generate', examGenerationRateLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/exam', authMiddleware, examRoutes);
app.use('/api/material', authMiddleware, materialRoutes);
app.use('/api/result', authMiddleware, resultRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/files', authMiddleware, fileUploadRoutes);
app.use('/api/documents', authMiddleware, documentRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);

// Serve static files in production
if (config.nodeEnv === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  
  // Catch all handler: send back React's index.html file in production
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  // If it's a GET request to the root, it might be a redirect from Supabase
  // or a user just hitting the backend URL. In production we serve static files,
  // but in development we can provide a more helpful message or redirect.
  if (req.method === 'GET' && (req.originalUrl === '/' || req.originalUrl === '')) {
    res.status(200).json({
      message: 'Smart Examination Backend API is running',
      status: 'healthy',
      docs: '/api/health'
    });
    return;
  }

  res.status(404).json({
    error: 'Route not found',
    message: `The requested endpoint ${req.originalUrl} does not exist.`
  });
});

// Graceful shutdown function
const gracefulShutdown = (serverInstance: any, signal: string): void => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  serverInstance.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      if (redisClient.isReady) {
        await redisClient.quit();
        logger.info('Redis connection closed');
      }
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force close server after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Start server function
const startServer = async (): Promise<void> => {
  try {
    // Validate configuration
    validateConfig();

    // Initialize Redis connection
    await initializeRedis();

    // Initialize automation framework
    await initializeAutomationFramework();
    logger.info('🤖 Automation framework initialized');

    // Force Supabase schema cache reload
    try {
      await supabase.rpc('pgrst_watch');
      logger.info('🔄 Supabase schema cache reload triggered');
    } catch (schemaErr: any) {
      // Non-critical: schema cache reload is best-effort
      logger.debug('Schema cache reload skipped (non-critical):', schemaErr.message);
    }
    
    // Start the server
    const port = config.port;
    const host = config.host;
    
    const serverInstance = app.listen(port, host, () => {
      logger.info(`🚀 Smart Examination Backend server started on ${host}:${port}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`🔒 JWT Expiration: ${config.jwtExpiresIn}`);
      logger.info(`📁 Upload Path: ${config.fileUpload.uploadPath}`);
      logger.info(`📝 Max File Size: ${config.fileUpload.maxFileSize} bytes`);
    });
    
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown(serverInstance, 'SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown(serverInstance, 'SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown(serverInstance, 'uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown(serverInstance, 'unhandledRejection');
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

// Export for testing and external use
export default app;
export { app, redisClient, logger };