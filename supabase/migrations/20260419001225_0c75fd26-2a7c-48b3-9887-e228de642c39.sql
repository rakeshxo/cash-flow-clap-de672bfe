ALTER TABLE public.surveys ADD COLUMN created_by uuid;
ALTER TABLE public.videos ADD COLUMN created_by uuid;
ALTER TABLE public.offers ADD COLUMN created_by uuid;
ALTER TABLE public.rewards ADD COLUMN created_by uuid;