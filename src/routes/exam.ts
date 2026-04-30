import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import { enforceApiQuota } from '../middleware/apiQuotaMiddleware';
import { analyzeFileForProcessing } from '../services/fileProcessingService';
import { supabase } from '../lib/supabase';
import { File } from 'buffer';

export const examRouter = Router();

examRouter.post(
  '/generate',
  authenticateUser,
  enforceApiQuota,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const userQuota = (req as any).userQuota;
      const file = req.files?.material as UploadedFile;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Analyze file for processing strategy
      const strategy = await analyzeFileForProcessing(
        new File([file.data], file.name),
        userQuota
      );

      let extractedText: string;

      // Path A: Local extraction
      if (strategy.useLocal) {
        extractedText = await extractTextLocally(file.data);
      }
      // Path B: Cached extraction
      else if (strategy.cached) {
        extractedText = strategy.cached;
      }
      // Path C: iLovePDF processing
      else {
        let processedFile = file.data;
        if (strategy.compress) {
          processedFile = await compressPDF(file.data);
        }

        extractedText = await processViaILovePDF(processedFile, file.name, userId);

        // Log API usage and update quota
        await supabase.from('api_usage').insert({
          user_id: userId,
          service: 'ilovepdf',
          operation: 'extract',
          file_size_kb: processedFile.length / 1024,
          credits_used: strategy.estimatedCost,
          status: 'success',
        });

        await supabase
          .from('user_quotas')
          .update({
            daily_uploads_count: userQuota.daily_uploads_count + 1,
            monthly_credits_used: userQuota.monthly_credits_used + strategy.estimatedCost,
          })
          .eq('user_id', userId);
      }

      // Generate exam from extracted text
      if (!extractedText || extractedText.length < 50) {
        return res.status(400).json({
          error: 'File contains insufficient text for exam generation',
        });
      }

      const prompt = buildExamPrompt(extractedText, {
        subject: req.body.subject,
        type: req.body.type,
        difficulty: req.body.difficulty,
        numQuestions: req.body.num_questions,
      });

      const rawText = await generateExamQuestions(prompt);
      const questions = parseGeminiResponse(rawText, {
        type: req.body.type,
        difficulty: req.body.difficulty,
        subject: req.body.subject,
      });

      // Save exam
      const { data: examData } = await supabase
        .from('exams')
        .insert({
          user_id: userId,
          title: req.body.title,
          subject: req.body.subject,
          type: req.body.type,
          difficulty: req.body.difficulty,
          num_questions: questions.length,
          time_limit: req.body.time_limit,
          status: 'completed',
          questions,
        })
        .select()
        .single();

      res.json({
        success: true,
        examId: examData.id,
        questionsCount: questions.length,
        estimatedTime: req.body.time_limit || questions.length * 2,
      });
    } catch (err: any) {
      console.error('[exam/generate] Error:', err);
      res.status(500).json({
        error: err.message,
      });
    }
  }
);