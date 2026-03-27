import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { examValidation } from '@/middleware/requestValidator';
import { userRequestThrottler, aiGenerationThrottler } from '@/middleware/requestThrottling';
import { examGenerationValidation, answerSubmissionValidation } from '@/middleware/requestValidation';
import { generateExam, evaluateAnswer } from '@/services/geminiService';
import { codeBasedExamService } from '@/services/CodeBasedExamService';
import { codeBasedEvaluationService } from '@/services/CodeBasedEvaluationService';
import { ExamService, QuestionService } from '@/services/supabaseService';
import { cacheService } from '@/infrastructure/cache';
import { config } from '@/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import winston from 'winston';

const router = Router();

function createUserSupabaseClient(authToken: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * @route   POST /api/exam/generate
 * @desc    Generate a new exam using AI
 * @access  Private
 */
router.post('/generate',
  // Apply AI generation throttling (15 seconds between requests)
  aiGenerationThrottler,
  // Validate exam generation request
  examGenerationValidation,
  examValidation.createExam,
  asyncHandler(async (req, res) => {
  const {
    title,
    topics,
    description,
    type,
    difficulty,
    numQuestions,
    timeLimit,
    materials
  } = req.body;

  try {
    // Extract JWT from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
      return;
    }
    const authToken = authHeader.slice(7);

    // Get user ID from JWT (already verified by authMiddleware)
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      return;
    }

    winston.info(`Generating exam with topics: ${topics} for user ${userId}`);

    // Generate questions using code-based logic
    const config = { type, difficulty, numQuestions };
    const generatedQuestions = await codeBasedExamService.generateExam(config, materials, topics);

    // Create user-scoped Supabase client with JWT for RLS
    const userSupabase = createUserSupabaseClient(authToken);

    // Create exam record with verified user_id from JWT
    const examData = {
      title: title || topics.split(',').map((t: string) => t.trim()).slice(0, 3).join(', ') + (topics.split(',').length > 3 ? '...' : ''),
      description: description || `Exam covering ${topics.split(',').map((t: string) => t.trim()).length} topics`,
      type,
      difficulty,
      num_questions: numQuestions,
      time_limit: timeLimit,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert using user-scoped client to satisfy RLS
    const { data: exam, error: examError } = await userSupabase
      .from('exams')
      .insert([examData])
      .select()
      .single();

    if (examError) {
      throw new Error(`Failed to create exam: ${examError.message}`);
    }

    // Invalidate any cached exam lists for this user
    await cacheService.invalidateUserCache(exam.user_id);

    // Create questions in database with schema-compliant column names
    const questionsData = generatedQuestions.map((question, index) => ({
      exam_id: exam.id,
      question_text: question.question,
      question_type: question.type || 'OBJECTIVE',
      options: question.options || null,
      correct_answer: question.correctAnswer,
      explanation: question.explanation || null,
      difficulty: question.difficulty || 'medium',
      order_index: index,
      points: question.points || 10,
      user_id: userId,
      created_at: new Date().toISOString()
    }));

    let createdQuestions;
    try {
      createdQuestions = await QuestionService.createBulk(questionsData as any);
    } catch (err: any) {
      winston.error('Failed to create questions:', err);
      // Clean up the exam since questions failed
      await userSupabase.from('exams').delete().eq('id', exam.id);
      res.status(500).json({ error: 'Failed to save questions', message: err.message });
      return;
    }

    winston.info(`Successfully generated exam ${exam.id} with ${createdQuestions.length} questions`);

    res.status(201).json({
      message: 'Exam generated successfully',
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        type: exam.type,
        difficulty: exam.difficulty,
        numQuestions: exam.num_questions,
        timeLimit: exam.time_limit,
        createdAt: exam.created_at
      },
      questions: createdQuestions.map((q: any) => ({
        id: q.id,
        question: q.question_text,
        questionType: q.question_type,
        options: q.options,
        difficulty: q.difficulty,
        topic: q.topic || null,
        orderIndex: q.order_index,
        points: q.points
        // Don't return correct answers to frontend for security
      }))
    });
    return;

  } catch (error: any) {
    winston.error('Exam generation error:', error);
    res.status(500).json({
      error: 'Exam generation failed',
      message: error.message || 'An error occurred while generating the exam'
    });
    return;
  }
}));

/**
 * @route   GET /api/exam/:id
 * @desc    Get exam details
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'Exam ID is required' });
    return;
  }

  try {
    const cacheKey = `exam_full:${id}`;

    const examData = await cacheService.cacheResponse(
      cacheKey,
      async () => {
        const exam = await ExamService.findById(id);

        if (!exam) {
          throw new Error('Exam not found');
        }

        const questions = await QuestionService.findByExamId(id);

        return {
          exam: {
            id: exam.id,
            title: exam.title,
            description: exam.description,
            type: exam.type,
            difficulty: exam.difficulty,
            numQuestions: exam.num_questions,
            timeLimit: exam.time_limit,
            createdAt: exam.created_at,
            updatedAt: exam.updated_at
          },
          questions: questions.map(q => ({
            id: q.id,
            question: q.question,
            options: q.options,
            topic: q.topic
            // Don't return correct answers for security
          }))
        };
      },
      { ttl: 1800 } // 30 minutes
    );

    res.json({
      message: 'Exam retrieved successfully',
      ...examData
    });

  } catch (error: any) {
    if (error.message === 'Exam not found') {
      res.status(404).json({
        error: 'Exam not found',
        message: 'The requested exam could not be found'
      });
      return;
    }

    winston.error('Get exam error:', error);
    res.status(500).json({
      error: 'Failed to retrieve exam',
      message: 'An error occurred while retrieving the exam'
    });
  }
}));

/**
 * @route   GET /api/exam
 * @desc    Get user's exams
 * @access  Private
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const userId = (req as any).user?.id || 'temp-user-id';
    
    const { data: exams, total } = await ExamService.findByUserId(userId, page, limit);

    res.json({
      message: 'Exams retrieved successfully',
      exams: exams.map(exam => ({
        id: exam.id,
        title: exam.title,
        description: exam.description,
        type: exam.type,
        difficulty: exam.difficulty,
        numQuestions: exam.num_questions,
        timeLimit: exam.time_limit,
        createdAt: exam.created_at,
        updatedAt: exam.updated_at
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    return;

  } catch (error: any) {
    winston.error('Get user exams error:', error);
    res.status(500).json({
      error: 'Failed to retrieve exams',
      message: 'An error occurred while retrieving exams'
    });
  }
}));

/**
 * @route   POST /api/exam/:id/answer
 * @desc    Submit an answer for a question
 * @access  Private
 */
router.post('/:id/answer',
  // Apply user request throttling (10 seconds between requests)
  userRequestThrottler,
  // Validate answer submission
  answerSubmissionValidation,
  examValidation.submitAnswer,
  asyncHandler(async (req, res) => {
  const { id: examId } = req.params;
  if (!examId) {
    res.status(400).json({ error: 'Exam ID is required' });
    return;
  }
  const { questionId, answer } = req.body;

  try {
    // Get exam and question
    const exam = await ExamService.findById(examId);
    if (!exam) {
      res.status(404).json({
        error: 'Exam not found',
        message: 'The requested exam could not be found'
      });
      return;
    }

    const questions = await QuestionService.findByExamId(examId);
    const question = questions.find(q => q.id === questionId);

    if (!question) {
      res.status(404).json({
        error: 'Question not found',
        message: 'The requested question could not be found'
      });
      return;
    }

    // Evaluate answer using code-based logic
    const codeQuestion = {
      question: question.question,
      options: question.options || [],
      correctAnswer: question.correct_answer,
      topic: question.topic
    };

    const userAnswer = { answer };
    const evaluation = await codeBasedEvaluationService.evaluateAnswer(codeQuestion, userAnswer);

    res.json({
      message: 'Answer evaluated successfully',
      evaluation: {
        score: evaluation.score,
        feedback: evaluation.feedback,
        isCorrect: evaluation.isCorrect,
        correctAnswer: question.correct_answer
      }
    });
    return;

  } catch (error: any) {
    winston.error('Answer evaluation error:', error);
    res.status(500).json({
      error: 'Answer evaluation failed',
      message: 'An error occurred while evaluating the answer'
    });
    return;
  }
}));

/**
 * @route   POST /api/exam/:id/complete
 * @desc    Complete an exam with all answers
 * @access  Private
 */
router.post('/:id/complete', examValidation.completeExam, asyncHandler(async (req: Request, res: Response) => {
  const { id: examId } = req.params;
  if (!examId) {
    res.status(400).json({ error: 'Exam ID is required' });
    return;
  }
  const { answers } = req.body;

  try {
    // Get exam
    const exam = await ExamService.findById(examId);
    if (!exam) {
      res.status(404).json({
        error: 'Exam not found',
        message: 'The requested exam could not be found'
      });
      return;
    }

    // Get questions
    const questions = await QuestionService.findByExamId(examId);

    // Evaluate all answers
    const evaluations = [];
    let totalScore = 0;
    let correctAnswers = 0;

    for (const userAnswer of answers) {
      const question = questions.find(q => q.id === userAnswer.questionId);
      if (!question) continue;

      const codeQuestion = {
        question: question.question,
        options: question.options || [],
        correctAnswer: question.correct_answer,
        topic: question.topic
      };

      const evaluation = await codeBasedEvaluationService.evaluateAnswer(codeQuestion, { answer: userAnswer.answer });
      evaluations.push({
        questionId: userAnswer.questionId,
        ...evaluation
      });

      totalScore += evaluation.score;
      if (evaluation.isCorrect) correctAnswers++;
    }

    const finalScore = Math.round((totalScore / (answers.length * 10)) * 100);
    const percentage = Math.round((correctAnswers / answers.length) * 100);

    // TODO: Save exam result to database
    winston.info(`User completed exam ${examId} with score: ${finalScore}%`);

    res.json({
      message: 'Exam completed successfully',
      results: {
        score: finalScore,
        percentage,
        totalQuestions: answers.length,
        correctAnswers,
        evaluations
      }
    });
    return;

  } catch (error: any) {
    winston.error('Exam completion error:', error);
    res.status(500).json({
      error: 'Exam completion failed',
      message: 'An error occurred while completing the exam'
    });
  }
}));

/**
 * @route   POST /api/exam/evaluate
 * @desc    Evaluate a single answer
 * @access  Private
 */
router.post('/evaluate',
  // Apply user request throttling (10 seconds between requests)
  userRequestThrottler,
  asyncHandler(async (req: Request, res: Response) => {
  const { question, answer, options, correctAnswer, topic } = req.body;

  if (!question || !answer || !correctAnswer || !topic) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    const codeQuestion = {
      question,
      options: options || [],
      correctAnswer,
      topic
    };

    const userAnswer = { answer };
    const evaluation = await codeBasedEvaluationService.evaluateAnswer(codeQuestion, userAnswer);

    res.json({
      message: 'Answer evaluated successfully',
      evaluation
    });
    return;

  } catch (error: any) {
    winston.error('Answer evaluation error:', error);
    res.status(500).json({
      error: 'Answer evaluation failed',
      message: 'An error occurred while evaluating the answer'
    });
  }
}));

/**
 * @route   DELETE /api/exam/:id
 * @desc    Delete an exam
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'Exam ID is required' });
    return;
  }

  try {
    // Get exam first to get user_id for cache invalidation
    const exam = await ExamService.findById(id);
    if (!exam) {
      res.status(404).json({
        error: 'Exam not found',
        message: 'The requested exam could not be found'
      });
      return;
    }

    // TODO: Check if user owns this exam
    await ExamService.delete(id);

    // Invalidate caches
    await cacheService.invalidateExamCache(id);
    await cacheService.invalidateUserCache(exam.user_id);

    res.json({
      message: 'Exam deleted successfully'
    });
    return;

  } catch (error: any) {
    winston.error('Exam deletion error:', error);
    res.status(500).json({
      error: 'Exam deletion failed',
      message: 'An error occurred while deleting the exam'
    });
    return;
  }
}));

export default router;
