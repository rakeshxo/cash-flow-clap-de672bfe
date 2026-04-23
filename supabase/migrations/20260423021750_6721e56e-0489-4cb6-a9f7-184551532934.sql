ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS target_age_ranges text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_genders text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_countries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_employment_statuses text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_marital_statuses text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_education text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_income_ranges text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_has_kids text NOT NULL DEFAULT 'any';