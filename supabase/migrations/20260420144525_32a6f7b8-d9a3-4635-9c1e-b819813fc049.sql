-- Add external link + screener support to surveys
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS screener_questions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Track external survey claims awaiting admin approval
CREATE TABLE IF NOT EXISTS public.survey_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  screener_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  link_opened_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE public.survey_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own claims"
  ON public.survey_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own claims"
  ON public.survey_claims FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all claims"
  ON public.survey_claims FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update claims"
  ON public.survey_claims FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_survey_claims_status ON public.survey_claims(status);
CREATE INDEX IF NOT EXISTS idx_survey_claims_user ON public.survey_claims(user_id);