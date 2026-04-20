ALTER TABLE public.survey_claims
  ADD COLUMN IF NOT EXISTS tracking_uid text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_claims_tracking_uid
  ON public.survey_claims(tracking_uid)
  WHERE tracking_uid IS NOT NULL;