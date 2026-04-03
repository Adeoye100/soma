BEGIN;

CREATE TABLE IF NOT EXISTS public.feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) 
                 ON DELETE SET NULL,
  user_email   TEXT,
  type         TEXT NOT NULL 
                 CHECK (type IN (
                   'bug_report',
                   'feature_request', 
                   'general_feedback',
                   'performance_issue',
                   'ui_issue'
                 )),
  title        TEXT NOT NULL 
                 CHECK (char_length(title) BETWEEN 5 AND 200),
  description  TEXT NOT NULL 
                 CHECK (char_length(description) >= 20),
  severity     TEXT NOT NULL DEFAULT 'medium'
                 CHECK (severity IN (
                   'low', 'medium', 'high', 'critical'
                 )),
  status       TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN (
                   'open', 'in_review', 
                   'resolved', 'dismissed'
                 )),
  page_url     TEXT,
  browser_info TEXT,
  screenshot   TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  admin_notes  TEXT,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can submit and view their own feedback
CREATE POLICY "feedback_user_insert"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "feedback_user_select_own"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can see and update all feedback
-- (handled via service role in admin routes)

DROP TRIGGER IF EXISTS feedback_updated_at 
  ON public.feedback;
CREATE TRIGGER feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION 
    public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_feedback_type
  ON public.feedback (type);
CREATE INDEX IF NOT EXISTS idx_feedback_status
  ON public.feedback (status);
CREATE INDEX IF NOT EXISTS idx_feedback_severity
  ON public.feedback (severity);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id
  ON public.feedback (user_id);

COMMIT;