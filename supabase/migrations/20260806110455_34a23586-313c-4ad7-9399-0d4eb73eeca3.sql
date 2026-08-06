CREATE OR REPLACE FUNCTION public.panel_settle_claim(_tracking_uid text, _panel_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _c record; _title text; _norm text; _approve boolean;
BEGIN
  IF _tracking_uid IS NULL OR btrim(_tracking_uid) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_tracking_uid');
  END IF;

  _norm := lower(btrim(COALESCE(_panel_status, '')));
  IF _norm IN ('complete', 'completed', 'c') THEN
    _approve := true;
  ELSIF _norm IN ('quotafull', 'terminate', 'terminated', 'security', 'reject', 'rejected') THEN
    _approve := false;
  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_status', 'status', _norm);
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
    SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
        reviewed_at = now()
  WHERE id = _c.id;

  IF _approve THEN
    PERFORM public.internal_award_coins(_c.user_id, _c.reward_cents, 'survey',
      'Approved: ' || COALESCE(_title, 'External survey'), _c.survey_id);
  ELSE
    INSERT INTO public.notifications (user_id, title, body, icon)
    VALUES (_c.user_id,
      CASE _norm
        WHEN 'quotafull' THEN 'Survey quota full'
        WHEN 'security' THEN 'Submission not accepted'
        ELSE 'Survey not completed' END,
      CASE _norm
        WHEN 'quotafull' THEN 'The quota for ' || COALESCE(_title, 'this survey') || ' filled up before your response was recorded.'
        WHEN 'security' THEN 'Your response for ' || COALESCE(_title, 'this survey') || ' did not pass quality checks.'
        ELSE 'You did not qualify for ' || COALESCE(_title, 'this survey') || '.' END,
      'x');
  END IF;

  PERFORM public.internal_audit(
    CASE WHEN _approve THEN 'claim.panel_approve' ELSE 'claim.panel_reject' END,
    'survey_claim', _c.id, _c.user_id,
    jsonb_build_object('panel_status', _norm, 'coins', CASE WHEN _approve THEN _c.reward_cents ELSE 0 END, 'tracking_uid', _c.tracking_uid));

  RETURN jsonb_build_object('ok', true, 'settled', CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
    'coins', CASE WHEN _approve THEN _c.reward_cents ELSE 0 END);
END $$;

REVOKE ALL ON FUNCTION public.panel_settle_claim(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.panel_settle_claim(text, text) TO service_role;