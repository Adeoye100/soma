-- Migration: Formalize exam_sessions and ensure strict RLS
-- This migration ensures exam_sessions is properly defined and has RLS enabled.

BEGIN;

-- 1. Ensure exam_sessions table exists (if it was created manually or by some other means)
-- Based on backend/src/routes/exam.ts usage:
-- {
--   exam_id: string,
--   user_id: string,
--   total_questions: number,
--   correct_answers: number,
--   score: number,
--   score_percent: number,
--   answers: jsonb,
--   status: string,
--   submitted_at: timestamptz
-- }
CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id          UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_questions  INTEGER NOT NULL DEFAULT 0,
  correct_answers  INTEGER NOT NULL DEFAULT 0,
  score            INTEGER NOT NULL DEFAULT 0,
  score_percent    INTEGER NOT NULL DEFAULT 0,
  answers          JSONB DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'in_progress',
  submitted_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS on exam_sessions
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Add RLS policies for exam_sessions (Owner only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'exam_sessions' AND policyname = 'exam_sessions_owner_all'
  ) THEN
    CREATE POLICY "exam_sessions_owner_all" ON public.exam_sessions
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Audit and Ensure RLS on other tables (Just in case they weren't enabled before)
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedback ENABLE ROW LEVEL SECURITY;

-- 5. Add trigger for updated_at on exam_sessions
DROP TRIGGER IF EXISTS exam_sessions_updated_at ON public.exam_sessions;
CREATE TRIGGER exam_sessions_updated_at
  BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Indices for exam_sessions
CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_id ON public.exam_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam_id ON public.exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_status ON public.exam_sessions(status);

COMMIT;
