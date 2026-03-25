-- Migration: Create all missing tables for smart-examination-app
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
--
-- Dependencies: requires public.users (from migration 001_create_public_users.sql)
-- Run 001 first, then run this migration.

BEGIN;

-- ─────────────────────────────────────────────
-- TABLE: exams
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 100),
  description     TEXT,
  type            TEXT NOT NULL DEFAULT 'OBJECTIVE'
                  CHECK (type IN ('OBJECTIVE', 'SHORT_ANSWER', 'ESSAY')),
  difficulty      TEXT NOT NULL DEFAULT 'medium'
                  CHECK (difficulty IN ('easy', 'medium', 'hard')),
  num_questions   INTEGER NOT NULL DEFAULT 10 CHECK (num_questions BETWEEN 1 AND 50),
  time_limit      INTEGER,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
  config          JSONB DEFAULT '{}',
  questions       JSONB DEFAULT '[]',
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_user_id     ON public.exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_status     ON public.exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON public.exams(created_at DESC);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exams_owner_all" ON public.exams
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- TABLE: questions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id        UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question        TEXT NOT NULL,
  options         JSONB,
  correct_answer  TEXT NOT NULL,
  topic           TEXT NOT NULL,
  order_index     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON public.questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic  ON public.questions(topic);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questions_owner_all" ON public.questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.exams
      WHERE exams.id = questions.exam_id
        AND exams.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exams
      WHERE exams.id = questions.exam_id
        AND exams.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- TABLE: materials
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.materials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  content     TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  file_name   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_user_id ON public.materials(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON public.materials(created_at DESC);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "materials_owner_all" ON public.materials
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- TABLE: exam_results
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exam_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id        UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score          INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  percentage     INTEGER,
  time_taken     INTEGER,
  answers        JSONB DEFAULT '[]',
  feedback       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_results_exam_id ON public.exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON public.exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_created_at ON public.exam_results(created_at DESC);

ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_results_owner_all" ON public.exam_results
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- TABLE: exam_attempts
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id                 UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status                  TEXT NOT NULL DEFAULT 'in_progress'
                          CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at             TIMESTAMPTZ,
  time_taken              INTEGER,
  current_question_index   INTEGER NOT NULL DEFAULT 0,
  answers                 JSONB DEFAULT '[]',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON public.exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON public.exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status  ON public.exam_attempts(status);

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_attempts_owner_all" ON public.exam_attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Auto-update updated_at triggers
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exams_updated_at ON public.exams;
CREATE TRIGGER exams_updated_at
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS materials_updated_at ON public.materials;
CREATE TRIGGER materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS exam_attempts_updated_at ON public.exam_attempts;
CREATE TRIGGER exam_attempts_updated_at
  BEFORE UPDATE ON public.exam_attempts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ─────────────────────────────────────────────
-- VERIFICATION QUERIES
-- ─────────────────────────────────────────────

-- 1. Confirm all 6 tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'exams', 'questions', 'materials', 'exam_results', 'exam_attempts')
ORDER BY table_name;

-- 2. Confirm RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'exams', 'questions', 'materials', 'exam_results', 'exam_attempts')
ORDER BY tablename;

-- 3. Confirm exams columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'exams'
ORDER BY ordinal_position;
