import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Queue, Worker, Job } from 'bullmq';
import { config } from '@/config';
import { cacheService } from '@/infrastructure/cache';
import { DatabaseError } from '@/middleware/errorHandler';
import { sanitizeForTable, QUESTIONS_COLUMNS, EXAMS_COLUMNS, validateQuestionRow } from '@/utils/dbUtils';
import winston from 'winston';

export interface GenerateExamInput {
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  documentIds?: string[];
  userId: string;
}

export interface GeneratedQuestion {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: string;
  topic: string;
  subject: string;
  order_index?: number;
}

export interface ExamSubmission {
  examId: string;
  answers: { questionId: string; selectedOption: string }[];
  userId: string;
}

export interface ExamResultDetail {
  examId: string;
  userId: string;
  score: number;
  percentage: number;
  passed: boolean;
  timeTakenSeconds: number;
  totalQuestions: number;
  correctAnswers: number;
  answers: {
    questionId: string;
    selectedOption: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

const createSupabaseAdmin = (): SupabaseClient => {
  return createClient(config.supabaseUrl, config.supabaseServiceKey || config.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'soma-exam-service' } }
  });
};

let examCacheQueue: Queue | null = null;

if (config.redisEnabled) {
  try {
    const connection = { url: config.redisUrl };
    examCacheQueue = new Queue('exam-cache', {
      connection,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      }
    });

    const worker = new Worker('exam-cache', async (job: Job) => {
      const { examId, action } = job.data;
      if (action === 'cache') {
        const supabase = createSupabaseAdmin();
        const { data: exam } = await supabase.from('exams').select('*').eq('id', examId).single();
        const { data: questions } = await supabase.from('questions').select('*').eq('exam_id', examId);
        if (exam) {
          await cacheService.cacheExamData(examId, 'full', async () => ({ exam, questions: questions || [] }), { ttl: 3600 });
          winston.info(`[ExamQueue] Cached exam ${examId}`);
        }
      }
    }, { connection });

    worker.on('failed', (job, err) => {
      winston.error(`[ExamQueue] Job ${job?.id} failed:`, err.message);
    });
  } catch (err) {
    winston.warn('[ExamQueue] BullMQ not available, caching will be inline');
  }
}

export class ExamService {
  static async generateAndSave(input: GenerateExamInput, generatedQuestions: GeneratedQuestion[]): Promise<{ exam: any; questions: any[] }> {
    const supabase = createSupabaseAdmin();

    const examTitle = `${input.subject} - ${input.topic}`;
    const safeExamData = sanitizeForTable({
      title: examTitle,
      description: `Exam on ${input.topic} covering ${input.subject}`,
      type: 'OBJECTIVE',
      difficulty: input.difficulty,
      num_questions: input.questionCount,
      user_id: input.userId,
      status: 'completed'
    }, EXAMS_COLUMNS);

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert([safeExamData])
      .select()
      .single();

    if (examError) {
      throw new DatabaseError(`Failed to create exam: ${examError.message}`, { error: examError });
    }

    const questionsData = generatedQuestions.map((q, index) => ({
      exam_id: exam.id,
      user_id: input.userId,
      question_text: q.question_text,
      question_type: 'OBJECTIVE',
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty || input.difficulty,
      order_index: Number.isFinite(Number(q.order_index))
        ? Math.max(0, Number(q.order_index))
        : index,
      points: 10,
      topic: q.topic || input.topic,
      subject: q.subject || input.subject,
      metadata: {
        topic: q.topic || input.topic,
        subject: q.subject || input.subject
      }
    }));

    const safeQuestionsData = questionsData.map((q: Record<string, unknown>, i: number) =>
      sanitizeForTable(validateQuestionRow(q, i), QUESTIONS_COLUMNS)
    );

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .insert(safeQuestionsData)
      .select();

    if (questionsError) {
      await supabase.from('exams').update({ status: 'failed' }).eq('id', exam.id);
      throw new DatabaseError(`Failed to save questions: ${questionsError.message}`, { error: questionsError });
    }

    await cacheService.invalidateUserCache(input.userId);

    if (examCacheQueue) {
      await examCacheQueue.add('cache-exam', { examId: exam.id, action: 'cache' });
    } else {
      await cacheService.cacheExamData(exam.id, 'full', async () => ({ exam, questions }), { ttl: 3600 });
    }

    return { exam, questions: questions || [] };
  }

  static async submitExam(submission: ExamSubmission): Promise<ExamResultDetail> {
    const supabase = createSupabaseAdmin();

    const { data: exam, error: examError } = await supabase
      .from('exams').select('*').eq('id', submission.examId).single();

    if (examError || !exam) {
      throw new DatabaseError('Exam not found');
    }

    if (exam.user_id !== submission.userId) {
      throw new DatabaseError('Unauthorized: exam does not belong to user');
    }

    const { data: questions } = await supabase
      .from('questions').select('*').eq('exam_id', submission.examId);

    if (!questions || questions.length === 0) {
      throw new DatabaseError('No questions found for this exam');
    }

    const questionMap = new Map(questions.map(q => [q.id, q]));
    let correctCount = 0;
    const answerDetails = submission.answers.map(a => {
      const question = questionMap.get(a.questionId);
      const isCorrect = question ? question.correct_answer === a.selectedOption : false;
      if (isCorrect) correctCount++;
      return {
        questionId: a.questionId,
        selectedOption: a.selectedOption,
        correctAnswer: question?.correct_answer || '',
        isCorrect,
        explanation: question?.explanation || ''
      };
    });

    const totalQuestions = submission.answers.length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = percentage >= 50;

    const { data: existingAttempt } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', submission.examId)
      .eq('user_id', submission.userId)
      .eq('status', 'in_progress')
      .single();

    let timeTaken = 0;
    if (existingAttempt) {
      const startTime = new Date(existingAttempt.started_at).getTime();
      timeTaken = Math.round((Date.now() - startTime) / 1000);
      await supabase.from('exam_attempts').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        time_taken: timeTaken,
        answers: answerDetails
      }).eq('id', existingAttempt.id);
    }

    const { data: result, error: resultError } = await supabase
      .from('exam_results')
      .insert([{
        exam_id: submission.examId,
        user_id: submission.userId,
        score: correctCount * 10,
        total_questions: totalQuestions,
        correct_answers: correctCount,
        percentage,
        passed,
        time_taken: timeTaken,
        answers: answerDetails,
        feedback: passed ? 'Well done!' : 'Keep practicing!'
      }])
      .select()
      .single();

    if (resultError) {
      throw new DatabaseError(`Failed to save result: ${resultError.message}`);
    }

    await this.updateUserProfile(submission.userId, percentage);

    await cacheService.invalidateUserCache(submission.userId);
    await cacheService.invalidate('leaderboard:');

    return {
      examId: submission.examId,
      userId: submission.userId,
      score: correctCount * 10,
      percentage,
      passed,
      timeTakenSeconds: timeTaken,
      totalQuestions,
      correctAnswers: correctCount,
      answers: answerDetails
    };
  }

  static async getExamHistory(userId: string, page: number, limit: number, subject?: string, sortBy: string = 'created_at') {
    const cacheKey = `exam:history:${userId}:${page}:${limit}:${subject || 'all'}`;
    return cacheService.cacheResponse(cacheKey, async () => {
      const supabase = createSupabaseAdmin();
      const offset = (page - 1) * limit;

      let query = supabase
        .from('exam_results')
        .select('*, exams!inner(title, subject, type, difficulty)', { count: 'exact' })
        .eq('user_id', userId)
        .order(sortBy === 'created_at' ? 'created_at' : sortBy, { ascending: false })
        .range(offset, offset + limit - 1);

      if (subject) {
        query = query.ilike('exams.title', `%${subject}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new DatabaseError(`Failed to fetch exam history: ${error.message}`);
      }

      return { data: data || [], total: count || 0 };
    }, { ttl: 300 });
  }

  private static async updateUserProfile(userId: string, score: number): Promise<void> {
    const supabase = createSupabaseAdmin();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      const newTotal = profile.total_exams + 1;
      const newAvg = ((profile.average_score * profile.total_exams) + score) / newTotal;
      const newBest = Math.max(profile.best_score, score);
      const newStreak = score >= 50 ? profile.current_streak + 1 : 0;

      await supabase.from('user_profiles').update({
        total_exams: newTotal,
        average_score: Math.round(newAvg * 100) / 100,
        best_score: newBest,
        current_streak: newStreak,
        longest_streak: Math.max(profile.longest_streak, newStreak),
        updated_at: new Date().toISOString()
      }).eq('id', userId);
    } else {
      await supabase.from('user_profiles').upsert({
        id: userId,
        total_exams: 1,
        average_score: score,
        best_score: score,
        current_streak: score >= 50 ? 1 : 0,
        longest_streak: score >= 50 ? 1 : 0
      });
    }
  }
}

export default ExamService;
