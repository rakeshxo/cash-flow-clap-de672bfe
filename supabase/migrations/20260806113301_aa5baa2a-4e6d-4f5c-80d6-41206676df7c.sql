
CREATE TABLE public.panel_status_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_status text NOT NULL UNIQUE,
  outcome text NOT NULL CHECK (outcome IN ('approve','reject','pending')),
  notify_title text NOT NULL DEFAULT '',
  notify_body text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.panel_status_mappings TO authenticated;
GRANT ALL ON public.panel_status_mappings TO service_role;

ALTER TABLE public.panel_status_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view status mappings" ON public.panel_status_mappings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert status mappings" ON public.panel_status_mappings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update status mappings" ON public.panel_status_mappings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete status mappings" ON public.panel_status_mappings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER panel_status_mappings_updated_at
  BEFORE UPDATE ON public.panel_status_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.panel_status_mappings (panel_status, outcome, notify_title, notify_body) VALUES
  ('complete',   'approve', '', ''),
  ('completed',  'approve', '', ''),
  ('c',          'approve', '', ''),
  ('quotafull',  'reject', 'Survey quota full', 'The quota for {survey} filled up before your response was recorded.'),
  ('terminate',  'reject', 'Survey not completed', 'You did not qualify for {survey}.'),
  ('terminated', 'reject', 'Survey not completed', 'You did not qualify for {survey}.'),
  ('security',   'reject', 'Submission not accepted', 'Your response for {survey} did not pass quality checks.'),
  ('reject',     'reject', 'Survey not completed', 'You did not qualify for {survey}.'),
  ('rejected',   'reject', 'Survey not completed', 'You did not qualify for {survey}.');

CREATE OR REPLACE FUNCTION public.panel_settle_claim(_tracking_uid text, _panel_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _c record; _title text; _norm text; _map record;
BEGIN
  IF _tracking_uid IS NULL OR btrim(_tracking_uid) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_tracking_uid');
  END IF;

  _norm := lower(btrim(COALESCE(_panel_status, '')));

  SELECT * INTO _map FROM public.panel_status_mappings
    WHERE panel_status = _norm AND enabled = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_status', 'status', _norm);
  END IF;
  IF _map.outcome = 'pending' THEN
    RETURN jsonb_build_object('ok', true, 'settled', 'pending', 'status', _norm);
  END IF;

  SELECT * INTO _c FROM public.survey_claims WHERE tracking_uid = btrim(_tracking_uid) FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'claim_not_found');
  END IF;
  IF _c.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', true, 'already_settled', true, 'status', _c.status);
  END IF;

  SELECT title INTO _title FROM public.surveys WHERE id = _c.survey_id;

  UPDATE public.survey_claims
    SET status = CASE WHEN _map.outcome = 'approve' THEN 'approved' ELSE 'rejected' END,
        reviewed_at = now()
  WHERE id = _c.id;

  IF _map.outcome = 'approve' THEN
    PERFORM public.internal_award_coins(_c.user_id, _c.reward_cents, 'survey',
      COALESCE(NULLIF(btrim(_map.notify_body), ''), 'Approved: ' || COALESCE(_title, 'External survey')),
      _c.survey_id);
  ELSE
    INSERT INTO public.notifications (user_id, title, body, icon)
    VALUES (_c.user_id,
      COALESCE(NULLIF(btrim(_map.notify_title), ''), 'Survey not completed'),
      replace(COALESCE(NULLIF(btrim(_map.notify_body), ''), 'You did not qualify for {survey}.'),
              '{survey}', COALESCE(_title, 'this survey')),
      'x');
  END IF;

  PERFORM public.internal_audit(
    CASE WHEN _map.outcome = 'approve' THEN 'claim.panel_approve' ELSE 'claim.panel_reject' END,
    'survey_claim', _c.id, _c.user_id,
    jsonb_build_object('panel_status', _norm, 'coins', CASE WHEN _map.outcome = 'approve' THEN _c.reward_cents ELSE 0 END, 'tracking_uid', _c.tracking_uid));

  RETURN jsonb_build_object('ok', true, 'settled', CASE WHEN _map.outcome = 'approve' THEN 'approved' ELSE 'rejected' END,
    'coins', CASE WHEN _map.outcome = 'approve' THEN _c.reward_cents ELSE 0 END);
END $function$;

REVOKE ALL ON FUNCTION public.panel_settle_claim(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.panel_settle_claim(text, text) TO service_role;
