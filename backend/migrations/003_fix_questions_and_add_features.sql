-- Migration: Fix questions table schema and add missing tables/columns
-- Run this in Supabase SQL Editor after migrations 001 and 002.
--
-- This migration:
--   1. Ensures the 'questions' table has all required columns
--   2. Adds 'documents' table for file uploads
--   3. Adds 'user_profiles' table for leaderboard/profile features
--   4. Adds 'passed' and 'percentage' columns to exam_results

BEGIN;

-- ─────────────────────────────────────────────
-- FIX: questions table — add missing columns
-- ─────────────────────────────────────────────

-- Rename 'question' to 'question_text' if it exists and 'question_text' doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'question'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'question_text'
  ) THEN
    ALTER TABLE public.questions RENAME COLUMN question TO question_text;
  END IF;
END $$;

-- Ensure 'question_text' column exists (if table was created without it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'question_text'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN question_text TEXT NOT NULL DEFAULT 'Untitled Question';
  END IF;
END $$;

-- Add 'explanation' column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'explanation'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN explanation TEXT;
  END IF;
END $$;

-- Add 'difficulty' column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'difficulty'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN difficulty TEXT DEFAULT 'medium'
      CHECK (difficulty IN ('easy', 'medium', 'hard'));
  END IF;
END $$;

-- Add 'subject' column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'subject'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN subject TEXT DEFAULT 'General';
  END IF;
END $$;

-- Add 'question_type' column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'question_type'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN question_type TEXT DEFAULT 'OBJECTIVE'
      CHECK (question_type IN ('OBJECTIVE', 'SHORT_ANSWER', 'ESSAY', 'TRUE_FALSE'));
  END IF;
END $$;

-- Add 'points' column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'points'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN points INTEGER DEFAULT 10;
  END IF;
END $$;

-- Add 'user_id' column to questions for direct user association
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- FIX: exam_results — add missing columns
-- ─────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exam_results' AND column_name = 'passed'
  ) THEN
    ALTER TABLE public.exam_results ADD COLUMN passed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- TABLE: documents (for document upload feature)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_type   TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL DEFAULT 0,
  preview     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'documents_owner_all'
  ) THEN
    CREATE POLICY "documents_owner_all" ON public.documents
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- TABLE: user_profiles (for leaderboard + profile)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id              UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE,
  display_name    TEXT,
  avatar_url      TEXT,
  country         TEXT,
  total_exams     INTEGER NOT NULL DEFAULT 0,
  average_score   NUMERIC(5,2) NOT NULL DEFAULT 0,
  best_score      NUMERIC(5,2) NOT NULL DEFAULT 0,
  current_streak  INTEGER NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON public.user_profiles(country);
CREATE INDEX IF NOT EXISTS idx_user_profiles_avg_score ON public.user_profiles(average_score DESC);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'user_profiles_select_all'
  ) THEN
    CREATE POLICY "user_profiles_select_all" ON public.user_profiles
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'user_profiles_update_own'
  ) THEN
    CREATE POLICY "user_profiles_update_own" ON public.user_profiles
      FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'user_profiles_insert_own'
  ) THEN
    CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Trigger to auto-create user_profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
          COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Auto-update updated_at for user_profiles
DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- SUPABASE SCHEMA CACHE RELOAD
-- ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ─────────────────────────────────────────────
-- VERIFICATION
-- ─────────────────────────────────────────────
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'questions'
ORDER BY ordinal_position;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'exams', 'questions', 'materials', 'exam_results', 'exam_attempts', 'documents', 'user_profiles')
ORDER BY table_name;
