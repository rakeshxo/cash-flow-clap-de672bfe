-- Add background-check fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS background_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS age_range text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS employment_status text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS income_range text,
  ADD COLUMN IF NOT EXISTS interests text[],
  ADD COLUMN IF NOT EXISTS shopping_habits text[],
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS has_kids boolean,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS background_updated_at timestamptz;

-- Cache AI recommendations per user
CREATE TABLE IF NOT EXISTS public.survey_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  survey_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, survey_id)
);

ALTER TABLE public.survey_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own recommendations"
  ON public.survey_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own recommendations"
  ON public.survey_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own recommendations"
  ON public.survey_recommendations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all recommendations"
  ON public.survey_recommendations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_survey_recs_user ON public.survey_recommendations(user_id, score DESC);