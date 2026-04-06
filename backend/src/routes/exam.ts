import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler, ValidationError, DatabaseError } from '@/middleware/errorHandler';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';
import { checkValidationResult, examValidation } from '@/middleware/requestValidator';
import { examGenerationValidation, answerSubmissionValidation } from '@/middleware/requestValidation';
import { userRequestThrottler, aiGenerationThrottler } from '@/middleware/requestThrottling';
import { generateExam, evaluateAnswer } from '@/services/geminiService';
import { codeBasedExamService } from '@/services/CodeBasedExamService';
import { codeBasedEvaluationService, Question as EvaluationQuestion } from '@/services/CodeBasedEvaluationService';
import { ExamService, QuestionService } from '@/services/supabaseService';
import { ExamService as NewExamService, GeneratedQuestion } from '@/services/examService';
import { DocumentService } from '@/services/documentService';
import { cacheService } from '@/infrastructure/cache';
import { config } from '@/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sanitizeForTable, QUESTIONS_COLUMNS, EXAMS_COLUMNS, validateQuestionRow } from '@/utils/dbUtils';
import winston from 'winston';

const router = Router();

function createUserSupabaseClient(authToken: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${authToken}` } },
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * @route   POST /api/exam/generate
 * @desc    Generate a new exam using AI
 * @access  Private
 */
router.post('/generate',
  aiGenerationThrottler,
  examGenerationValidation,
  examValidation.createExam,
  asyncHandler(async (req: Request, res: Response) => {
    const { title, topics, subject, description, type, difficulty, numQuestions, timeLimit, materials } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
      return;
    }
    const authToken = authHeader.slice(7);
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      return;
    }

    const userSupabase = createUserSupabaseClient(authToken);
    let examId: string | null = null;

    try {
      winston.info(`Generating exam with topics: ${topics} for user ${userId}`);
      
      const examData = {
        title: title || topics.split(',').map((t: string) => t.trim()).slice(0, 3).join(', ') + (topics.split(',').length > 3 ? '...' : ''),
        description: description || `Exam covering ${topics.split(',').map((t: string) => t.trim()).length} topics`,
        type,
        difficulty,
        num_questions: numQuestions,
        time_limit: timeLimit,
        user_id: userId,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const safeExamData = sanitizeForTable(examData, EXAMS_COLUMNS);
      const { data: exam, error: examError } = await userSupabase
        .from('exams').insert([safeExamData]).select().single();

      if (examError) {
        throw new DatabaseError(`Failed to create exam: ${examError.message}`, { error: examError });
      }
      
      examId = exam.id;
      await cacheService.invalidateUserCache(exam.user_id);

      const examConfig = { 
        subject: subject || topics.split(',')[0]?.trim() || 'General',
        type, 
        difficulty, 
        numQuestions,
        timeLimit
      };

      let generatedQuestions;
      try {
        generatedQuestions = await generateExam(examConfig, materials);
      } catch (parseError: any) {
        winston.error('[exam/generate] Parse failed:', parseError);
        
        await userSupabase.from('exams')
          .update({ 
            status: 'failed',
            metadata: { 
              error: parseError.message,
              // rawResponsePreview is handled inside geminiService logging, but we can add more here if needed
            }
          })
          .eq('id', examId);

        return res.status(500).json({
          error: 'Question generation failed',
          detail: parseError.message,
          hint: 'The AI could not generate questions from this material. Try a different file or check that the material has sufficient content.'
        });
      }

      if (!generatedQuestions || generatedQuestions.length === 0) {
        await userSupabase.from('exams').update({ status: 'failed' }).eq('id', examId);
        return res.status(500).json({
          error: 'No questions were generated',
          hint: 'The study material may be too short or not contain enough content for exam generation.'
        });
      }

      // Log what was generated for debugging
      winston.info(
        `[exam/generate] Generated ${generatedQuestions.length} questions. Sample Q1: ` +
        JSON.stringify({
          text:    generatedQuestions[0]?.question_text?.slice(0, 80),
          options: generatedQuestions[0]?.options,
          answer:  generatedQuestions[0]?.correct_answer
        })
      );

      const questionsData = generatedQuestions.map((question: any, index: number) => ({
        exam_id: exam.id,
        user_id: userId,
        question_text: question.question_text,
        question_type: question.question_type || type || 'OBJECTIVE',
        options: question.options ?? [],
        correct_answer: question.correct_answer,
        explanation: question.explanation || null,
        difficulty: question.difficulty || difficulty,
        order_index: typeof question.order_index === 'number'
          ? Math.max(0, question.order_index)
          : index,
        points: question.points || 10,
        topic: question.topic ?? 'General',
        subject: question.subject || examConfig.subject,
        metadata: {
          topic: question.topic ?? 'General',
          subject: question.subject || examConfig.subject
        }
      }));

      const safeQuestionsData = questionsData.map((q: Record<string, unknown>, i: number) =>
        sanitizeForTable(validateQuestionRow(q, i), QUESTIONS_COLUMNS)
      );

      const { data: createdQuestions, error: questionsError } = await userSupabase
        .from('questions').insert(safeQuestionsData).select();

      if (questionsError) {
        winston.error('Failed to create questions:', questionsError);
        await userSupabase.from('exams').update({ status: 'failed' }).eq('id', exam.id);
        res.status(500).json({ error: 'Failed to save questions', message: questionsError.message });
        return;
      }

      // Update exam status to completed
      await userSupabase.from('exams').update({ status: 'completed' }).eq('id', exam.id);

      await cacheService.cacheExamData(exam.id, 'full', async () => ({
        exam: { ...exam, status: 'completed' }, questions: createdQuestions
      }), { ttl: 3600 });

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
        }))
      });
      return;
    } catch (error: any) {
      winston.error('Exam generation error:', error);
      if (examId) {
        await userSupabase.from('exams').update({ status: 'failed' }).eq('id', examId);
      }
      return res.status(500).json({
        error: 'Exam generation failed',
        message: error.message || 'An error occurred while generating the exam'
      });
    }
  })
);

/**
 * @route   POST /api/exam/submit
 * @desc    Submit an exam with all answers
 * @access  Private
 */
router.post('/submit',
  authMiddleware,
  body('examId').isUUID().withMessage('Valid exam ID is required'),
  body('answers').isArray({ min: 1 }).withMessage('At least one answer is required'),
  body('answers.*.questionId').isUUID().withMessage('Valid question ID is required'),
  body('answers.*.selectedOption').notEmpty().withMessage('Selected option is required'),
  checkValidationResult,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { examId, answers } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const result = await NewExamService.submitExam({ examId, answers, userId });
      return res.json({ message: 'Exam submitted successfully', result });
    } catch (error: any) {
      winston.error('Exam submission error:', error);
      return res.status(500).json({ error: 'Exam submission failed', message: error.message });
    }
  })
);

/**
 * @route   POST /api/exam/evaluate
 * @desc    Evaluate exam answers — single question or full exam
 * @access  Private
 */
router.post('/evaluate',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
      return;
    }
    const authToken = authHeader.slice(7);

    try {
      const { examId, answers, questions, question, answer, options, correctAnswer, topic } = req.body;

      // ─── MODE A: Full exam evaluation (examId + answers + questions) ───
      if (examId && answers && questions && Array.isArray(questions)) {
        const evaluationResults = await Promise.all(
          questions.map(async (q: any) => {
            const userAnswer = answers[q.id] ?? '';
            const questionType = (q.question_type || q.type || 'OBJECTIVE').toUpperCase();

            // Direct comparison for objective / true-false — NO API call
            if (questionType === 'OBJECTIVE' || questionType === 'TRUE_FALSE') {
              const isCorrect = userAnswer.trim().toLowerCase() === (q.correct_answer || q.correctAnswer || '').trim().toLowerCase();
              return {
                questionId: q.id,
                isCorrect,
                score: isCorrect ? (q.points ?? 10) : 0,
                userAnswer,
                correctAnswer: q.correct_answer || q.correctAnswer,
                feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${q.correct_answer || q.correctAnswer}`,
                topic: q.topic || 'General'
              };
            }

            // AI evaluation for short-answer / essay
            const evalQuestion: any = {
              question_text: q.question_text || q.question,
              options: q.options || [],
              correct_answer: q.correct_answer || q.correctAnswer,
              topic: q.topic || 'General'
            };
            const evaluation = await evaluateAnswer(evalQuestion, { answer: userAnswer });
            return {
              questionId: q.id,
              ...evaluation,
              userAnswer,
              correctAnswer: q.correct_answer || q.correctAnswer
            };
          })
        );

        const totalScore = evaluationResults.reduce((sum, r) => sum + r.score, 0);
        const maxScore = questions.reduce((sum: number, q: any) => sum + (q.points ?? 10), 0);
        const scorePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        const correctCount = evaluationResults.filter(r => r.isCorrect).length;

        // Save session
        const userSupabase = createUserSupabaseClient(authToken);
        const sessionData = {
          exam_id: examId,
          user_id: userId,
          total_questions: questions.length,
          correct_answers: correctCount,
          score: totalScore,
          percentage: scorePercent,
          answers: answers,
          status: 'graded',
          submitted_at: new Date().toISOString()
        };

        const { data: session, error: sessionError } = await userSupabase
          .from('exam_sessions')
          .insert(sessionData)
          .select()
          .single();

        if (sessionError) {
          winston.error('[evaluate] Session save error:', sessionError);
        }

        // Update exam status
        await userSupabase
          .from('exams')
          .update({ status: 'completed' })
          .eq('id', examId)
          .eq('user_id', userId);

        return res.status(200).json({
          success: true,
          sessionId: session?.id,
          score: totalScore,
          maxScore,
          scorePercent,
          correctCount,
          totalQuestions: questions.length,
          results: evaluationResults,
          grade: scorePercent >= 90 ? 'A' : scorePercent >= 80 ? 'B' : scorePercent >= 70 ? 'C' : scorePercent >= 60 ? 'D' : 'F'
        });
      }

      // ─── MODE B: Single-question evaluation ───
      if (question && answer !== undefined) {
        const evalQuestion: any = {
          question_text: question,
          options: options || [],
          correct_answer: correctAnswer || '',
          topic: topic || 'General'
        };
        const evaluation = await evaluateAnswer(evalQuestion, { answer });
        return res.status(200).json({ evaluation });
      }

      // ─── Neither mode matched ───
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Provide either { examId, answers, questions } for full evaluation or { question, answer, correctAnswer } for single evaluation'
      });

    } catch (err: any) {
      winston.error('[evaluate] Error:', err);
      return res.status(500).json({
        error: 'Evaluation failed',
        message: err.message || 'An error occurred during evaluation'
      });
    }
  })
);

/**
 * @route   GET /api/exam/history
 * @desc    Get user's exam history
 * @access  Private
 */
router.get('/history',
  authMiddleware,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('subject').optional().isString(),
  query('sortBy').optional().isIn(['created_at', 'percentage', 'score']).withMessage('Invalid sort field'),
  checkValidationResult,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const subject = req.query.subject as string || undefined;
    const sortBy = req.query.sortBy as string || 'created_at';

    try {
      const { data, total } = await NewExamService.getExamHistory(userId, page, limit, subject, sortBy);

      return res.json({
        message: 'Exam history retrieved successfully',
        exams: data.map((r: any) => ({
          id: r.id,
          examId: r.exam_id,
          title: r.exams?.title || 'Untitled Exam',
          subject: r.exams?.title?.split(' - ')[0] || 'General',
          score: r.score,
          percentage: r.percentage,
          passed: r.passed,
          timeTaken: r.time_taken,
          correctAnswers: r.correct_answers,
          totalQuestions: r.total_questions,
          dateTaken: r.created_at
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    } catch (error: any) {
      winston.error('Get exam history error:', error);
      return res.status(500).json({ error: 'Failed to retrieve exam history', message: error.message });
    }
  })
);

/**
 * @route   GET /api/exam/:id
 * @desc    Get exam details
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'Exam ID is required' });
    return;
  }

  try {
    const examData = await cacheService.cacheResponse(
      `exam_full:${id}`,
      async () => {
        const exam = await ExamService.findById(id);
        if (!exam) throw new Error('Exam not found');
        const questions = await QuestionService.findByExamId(id);
        return {
          exam: {
            id: exam.id, title: exam.title, description: exam.description,
            type: exam.type, difficulty: exam.difficulty, numQuestions: exam.num_questions,
            timeLimit: exam.time_limit, createdAt: exam.created_at, updatedAt: exam.updated_at
          },
          questions: questions.map(q => ({
            id: q.id, question: q.question_text || q.question, options: q.options, topic: q.topic ?? null
          }))
        };
      },
      { ttl: 1800 }
    );

    return res.json({ message: 'Exam retrieved successfully', ...examData });
  } catch (error: any) {
    if (error.message === 'Exam not found') {
      return res.status(404).json({ error: 'Exam not found', message: 'The requested exam could not be found' });
    }
    winston.error('Get exam error:', error);
    return res.status(500).json({ error: 'Failed to retrieve exam', message: 'An error occurred while retrieving the exam' });
  }
}));

/**
 * @route   GET /api/exam
 * @desc    Get user's exams
 * @access  Private
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { data: exams, total } = await ExamService.findByUserId(userId, page, limit);
    return res.json({
      message: 'Exams retrieved successfully',
      exams: exams.map(exam => ({
        id: exam.id, title: exam.title, description: exam.description,
        type: exam.type, difficulty: exam.difficulty, numQuestions: exam.num_questions,
        timeLimit: exam.time_limit, createdAt: exam.created_at, updatedAt: exam.updated_at
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    winston.error('Get user exams error:', error);
    return res.status(500).json({ error: 'Failed to retrieve exams', message: 'An error occurred while retrieving exams' });
  }
}));

/**
 * @route   POST /api/exam/:id/answer
 * @desc    Submit an answer for a question
 * @access  Private
 */
router.post('/:id/answer',
  answerSubmissionValidation,
  examValidation.submitAnswer,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: examId } = req.params;
    if (!examId) { res.status(400).json({ error: 'Exam ID is required' }); return; }
    const { questionId, answer } = req.body;

    try {
      const exam = await ExamService.findById(examId);
      if (!exam) { res.status(404).json({ error: 'Exam not found' }); return; }

      const questions = await QuestionService.findByExamId(examId);
      const question = questions.find(q => q.id === questionId);
      if (!question) { res.status(404).json({ error: 'Question not found' }); return; }

      const codeQuestion: EvaluationQuestion = {
        question: question.question || question.question_text,
        options: question.options || [],
        correctAnswer: question.correct_answer,
        topic: question.topic ?? 'General'
      };

      const evaluation = await codeBasedEvaluationService.evaluateAnswer(codeQuestion, { answer });
      return res.json({
        message: 'Answer evaluated successfully',
        evaluation: { score: evaluation.score, feedback: evaluation.feedback, isCorrect: evaluation.isCorrect, correctAnswer: question.correct_answer }
      });
    } catch (error: any) {
      winston.error('Answer evaluation error:', error);
      return res.status(500).json({ error: 'Answer evaluation failed', message: 'An error occurred while evaluating the answer' });
    }
  })
);

/**
 * @route   POST /api/exam/:id/complete
 * @desc    Complete an exam with all answers
 * @access  Private
 */
router.post('/:id/complete',
  examValidation.completeExam,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: examId } = req.params;
    if (!examId) { res.status(400).json({ error: 'Exam ID is required' }); return; }
    const { answers } = req.body;

    try {
      const exam = await ExamService.findById(examId);
      if (!exam) { res.status(404).json({ error: 'Exam not found' }); return; }

      const questions = await QuestionService.findByExamId(examId);
      const evaluations = [];
      let totalScore = 0;
      let correctAnswers = 0;

      for (const userAnswer of answers) {
        const question = questions.find(q => q.id === userAnswer.questionId);
        if (!question) continue;

        const codeQuestion: EvaluationQuestion = {
          question: question.question || question.question_text,
          options: question.options || [],
          correctAnswer: question.correct_answer,
          topic: question.topic ?? 'General'
        };

        const evaluation = await codeBasedEvaluationService.evaluateAnswer(codeQuestion, { answer: userAnswer.answer });
        evaluations.push({ questionId: userAnswer.questionId, ...evaluation });
        totalScore += evaluation.score;
        if (evaluation.isCorrect) correctAnswers++;
      }

      const finalScore = Math.round((totalScore / (answers.length * 10)) * 100);
      const percentage = Math.round((correctAnswers / answers.length) * 100);

      winston.info(`User completed exam ${examId} with score: ${finalScore}%`);

      return res.json({
        message: 'Exam completed successfully',
        results: { score: finalScore, percentage, totalQuestions: answers.length, correctAnswers, evaluations }
      });
    } catch (error: any) {
      winston.error('Exam completion error:', error);
      return res.status(500).json({ error: 'Exam completion failed', message: 'An error occurred while completing the exam' });
    }
  })
);

/**
 * @route   DELETE /api/exam/:id
 * @desc    Delete an exam
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (!id) { res.status(400).json({ error: 'Exam ID is required' }); return; }

  try {
    const exam = await ExamService.findById(id);
    if (!exam) { res.status(404).json({ error: 'Exam not found' }); return; }

    await ExamService.delete(id);
    await cacheService.invalidateExamCache(id);
    await cacheService.invalidateUserCache(exam.user_id);

    return res.json({ message: 'Exam deleted successfully' });
  } catch (error: any) {
    winston.error('Exam deletion error:', error);
    return res.status(500).json({ error: 'Exam deletion failed', message: 'An error occurred while deleting the exam' });
  }
}));

export default router;
