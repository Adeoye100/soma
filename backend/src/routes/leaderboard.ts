import { Router, Request, Response } from 'express';
import { query } from 'express-validator';
import { asyncHandler } from '@/middleware/errorHandler';
import { checkValidationResult } from '@/middleware/requestValidator';
import { LeaderboardService } from '@/services/leaderboardService';
import winston from 'winston';

const router = Router();

/**
 * @route   GET /api/leaderboard
 * @desc    Get leaderboard
 * @access  Public (or authenticated)
 */
router.get('/',
  query('subject').optional().isString(),
  query('period').optional().isIn(['weekly', 'monthly', 'alltime']).withMessage('Period must be weekly, monthly, or alltime'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  checkValidationResult,
  asyncHandler(async (req: Request, res: Response) => {
    const subject = req.query.subject as string || undefined;
    const period = req.query.period as string || 'alltime';
    const limit = parseInt(req.query.limit as string) || 10;

    try {
      const entries = await LeaderboardService.getLeaderboard(subject, period, limit);

      res.json({
        message: 'Leaderboard retrieved successfully',
        leaderboard: entries,
        meta: { subject: subject || 'all', period, limit }
      });
    } catch (error: any) {
      winston.error('Leaderboard error:', error);
      res.status(500).json({ error: 'Failed to retrieve leaderboard', message: error.message });
    }
  })
);

export default router;
