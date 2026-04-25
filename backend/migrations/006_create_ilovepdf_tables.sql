-- Table: public.extraction_cache
CREATE TABLE IF NOT EXISTS public.extraction_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_hash TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  extracted_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: public.user_quotas
CREATE TABLE IF NOT EXISTS public.user_quotas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_uploads_count INTEGER DEFAULT 0,
  daily_uploads_limit INTEGER DEFAULT 5,
  monthly_credits_used INTEGER DEFAULT 0,
  monthly_credits_limit INTEGER DEFAULT 50,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  UNIQUE(user_id)
);

-- Table: public.api_usage
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL, -- e.g., 'ilovepdf'
  operation TEXT NOT NULL, -- e.g., 'extract'
  file_size_kb INTEGER,
  credits_used INTEGER,
  status TEXT NOT NULL, -- e.g., 'success', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);