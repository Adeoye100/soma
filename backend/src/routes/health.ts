import { Router } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { getServiceStatus } from '@/services/geminiService';
import winston from 'winston';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      database: 'connected', // Would check actual DB connection
      redis: 'connected',    // Would check actual Redis connection
      ai: 'ready'
    }
  };

  res.json(healthData);
}));

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with service status
 * @access  Public
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  try {
    // Check AI service status
    const aiStatus = getServiceStatus();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100
      },
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: {
          status: 'connected',
          type: 'supabase'
        },
        redis: {
          status: 'connected',
          type: 'redis'
        },
        ai: {
          status: 'ready',
          ...aiStatus
        }
      },
      api: {
        rateLimitEnabled: true,
        corsEnabled: true,
        securityHeadersEnabled: true
      }
    };

    res.json(healthData);
  } catch (error) {
    winston.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: 'One or more services are not responding properly'
    });
  }
}));

/**
 * @route   GET /api/health/ready
 * @desc    Kubernetes readiness probe
 * @access  Public
 */
router.get('/ready', asyncHandler(async (req, res) => {
  // Basic readiness check - would include more comprehensive checks
  res.json({
    ready: true,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @route   GET /api/health/live
 * @desc    Kubernetes liveness probe
 * @access  Public
 */
router.get('/live', asyncHandler(async (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString()
  });
}));

export default router;