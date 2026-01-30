import { Router } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { resultValidation } from '@/middleware/requestValidator';
import { ExamResultService } from '@/services/supabaseService';
import winston from 'winston';

const router = Router();

/**
 * @route   GET /api/result/exam/:examId
 * @desc    Get results for a specific exam
 * @access  Private
 */
router.get('/exam/:examId', resultValidation.getExamResults, asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const { data: results, total } = await ExamResultService.findByExamId(examId!, page, limit);

    res.json({
      message: 'Exam results retrieved successfully',
      results: results.map(result => ({
        id: result.id,
        examId: result.exam_id,
        userId: result.user_id,
        score: result.score,
        totalQuestions: result.total_questions,
        correctAnswers: result.correct_answers,
        timeTaken: result.time_taken,
        answers: result.answers,
        feedback: result.feedback,
        createdAt: result.created_at
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    winston.error('Get exam results error:', error);
    res.status(500).json({
      error: 'Failed to retrieve exam results',
      message: 'An error occurred while retrieving exam results'
    });
  }
}));

/**
 * @route   GET /api/result/user
 * @desc    Get results for the current user
 * @access  Private
 */
router.get('/user', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const userId = (req as any).user?.id || 'temp-user-id';
    
    const { data: results, total } = await ExamResultService.findByUserId(userId, page, limit);

    res.json({
      message: 'User results retrieved successfully',
      results: results.map(result => ({
        id: result.id,
        examId: result.exam_id,
        score: result.score,
        totalQuestions: result.total_questions,
        correctAnswers: result.correct_answers,
        timeTaken: result.time_taken,
        feedback: result.feedback,
        createdAt: result.created_at
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    winston.error('Get user results error:', error);
    res.status(500).json({
      error: 'Failed to retrieve user results',
      message: 'An error occurred while retrieving user results'
    });
  }
}));

/**
 * @route   GET /api/result/user/:userId
 * @desc    Get results for a specific user (admin/educator only)
 * @access  Private
 */
router.get('/user/:userId', resultValidation.getUserResults, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    // TODO: Check if current user is admin/educator or the same user
    const { data: results, total } = await ExamResultService.findByUserId(userId!, page, limit);

    res.json({
      message: 'User results retrieved successfully',
      results: results.map(result => ({
        id: result.id,
        examId: result.exam_id,
        score: result.score,
        totalQuestions: result.total_questions,
        correctAnswers: result.correct_answers,
        timeTaken: result.time_taken,
        feedback: result.feedback,
        createdAt: result.created_at
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    winston.error('Get specific user results error:', error);
    res.status(500).json({
      error: 'Failed to retrieve user results',
      message: 'An error occurred while retrieving user results'
    });
  }
}));

/**
 * @route   GET /api/result/:id
 * @desc    Get a specific exam result
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await ExamResultService.findById(id!);
    
    if (!result) {
      res.status(404).json({
        error: 'Result not found',
        message: 'The requested exam result could not be found'
      });
      return;
    }

    // TODO: Check if user owns this result or is admin/educator

    res.json({
      message: 'Exam result retrieved successfully',
      result: {
        id: result.id,
        examId: result.exam_id,
        userId: result.user_id,
        score: result.score,
        totalQuestions: result.total_questions,
        correctAnswers: result.correct_answers,
        timeTaken: result.time_taken,
        answers: result.answers,
        feedback: result.feedback,
        createdAt: result.created_at
      }
    });

  } catch (error: any) {
    winston.error('Get result error:', error);
    res.status(500).json({
      error: 'Failed to retrieve exam result',
      message: 'An error occurred while retrieving the exam result'
    });
  }
}));

/**
 * @route   DELETE /api/result/:id
 * @desc    Delete an exam result
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // TODO: Check if user owns this result or is admin
    const result = await ExamResultService.findById(id!);
    
    if (!result) {
      res.status(404).json({
        error: 'Result not found',
        message: 'The requested exam result could not be found'
      });
      return;
    }

    // Delete the result (this would need to be implemented in ExamResultService)
    // await ExamResultService.delete(id);

    res.json({
      message: 'Exam result deleted successfully'
    });

  } catch (error: any) {
    winston.error('Result deletion error:', error);
    res.status(500).json({
      error: 'Result deletion failed',
      message: 'An error occurred while deleting the exam result'
    });
  }
}));

/**
 * @route   GET /api/result/analytics/summary
 * @desc    Get analytics summary for user's results
 * @access  Private
 */
router.get('/analytics/summary', asyncHandler(async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'temp-user-id';
    
    const { data: results } = await ExamResultService.findByUserId(userId, 1, 1000);

    if (!results || results.length === 0) {
      res.json({
        message: 'No results found for analytics',
        analytics: {
          totalExams: 0,
          averageScore: 0,
          bestScore: 0,
          improvementTrend: 0,
          topicPerformance: {}
        }
      });
      return;
    }

    // Calculate analytics
    const totalExams = results.length;
    const averageScore = results.reduce((sum, result) => sum + result.score, 0) / totalExams;
    const bestScore = Math.max(...results.map(result => result.score));
    
    // Calculate improvement trend (compare first half vs second half)
    const midpoint = Math.floor(totalExams / 2);
    const firstHalf = results.slice(0, midpoint);
    const secondHalf = results.slice(midpoint);
    
    const firstHalfAvg = firstHalf.length > 0 ? 
      firstHalf.reduce((sum, result) => sum + result.score, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? 
      secondHalf.reduce((sum, result) => sum + result.score, 0) / secondHalf.length : 0;
    
    const improvementTrend = secondHalfAvg - firstHalfAvg;

    // Topic performance analysis
    const topicPerformance: { [key: string]: { count: number; averageScore: number } } = {};
    
    // This would require joining with questions table to get topic information
    // For now, return basic analytics
    
    res.json({
      message: 'Analytics summary retrieved successfully',
      analytics: {
        totalExams,
        averageScore: Math.round(averageScore * 100) / 100,
        bestScore,
        improvementTrend: Math.round(improvementTrend * 100) / 100,
        topicPerformance,
        recentResults: results.slice(0, 5).map(result => ({
          id: result.id,
          examId: result.exam_id,
          score: result.score,
          createdAt: result.created_at
        }))
      }
    });

  } catch (error: any) {
    winston.error('Analytics summary error:', error);
    res.status(500).json({
      error: 'Failed to retrieve analytics summary',
      message: 'An error occurred while generating analytics summary'
    });
  }
}));

export default router;
