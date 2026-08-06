CREATE OR REPLACE FUNCTION public.start_external_survey(_survey_id uuid, _answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _s record; _key jsonb; _q jsonb; _i int := 0; _passed boolean := true; _correct int; _ans text; _track text; _try int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.internal_require_active(_uid);
  PERFORM public.internal_rate_limit(_uid, 'external_survey_start', 40, interval '1 day');
  SELECT * INTO _s FROM public.surveys WHERE id = _survey_id;
  IF NOT FOUND OR _s.external_url IS NULL THEN RAISE EXCEPTION 'Survey not available'; END IF;
  IF EXISTS (SELECT 1 FROM public.survey_claims WHERE user_id = _uid AND survey_id = _survey_id) THEN
    RAISE EXCEPTION 'Already submitted';
  END IF;
  SELECT correct_answers INTO _key FROM public.survey_screener_keys WHERE survey_id = _survey_id;
  FOR _q IN SELECT value FROM jsonb_array_elements(COALESCE(_s.screener_questions, '[]'::jsonb)) LOOP
    _ans := _answers->>(_i::text);
    IF COALESCE(_q->>'type', 'choice') = 'open' THEN
      IF _ans IS NULL OR btrim(_ans) = '' THEN _passed := false; END IF;
    ELSE
      _correct := COALESCE((_key->>_i)::int, 0);
      IF _ans IS DISTINCT FROM (_q->'options'->>_correct) THEN _passed := false; END IF;
    END IF;
    _i := _i + 1;
  END LOOP;
  IF NOT _passed THEN
    PERFORM public.internal_audit('survey.screener_failed', 'survey', _survey_id, _uid);
    RETURN jsonb_build_object('passed', false);
  END IF;

  -- Short 10-char alphanumeric tracking uid (no underscores; panel splits uid on "_")
  LOOP
    _try := _try + 1;
    SELECT string_agg(substr('abcdefghijkmnpqrstuvwxyz23456789', 1 + floor(random() * 32)::int, 1), '')
      INTO _track FROM generate_series(1, 10);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.survey_claims WHERE tracking_uid = _track);
    IF _try > 20 THEN RAISE EXCEPTION 'Could not allocate tracking id'; END IF;
  END LOOP;

  INSERT INTO public.survey_claims (user_id, survey_id, screener_answers, reward_cents, link_opened_at, status, tracking_uid)
  VALUES (_uid, _survey_id, _answers, _s.reward_cents, now(), 'pending', _track);
  PERFORM public.internal_audit('survey.external_start', 'survey', _survey_id, _uid, jsonb_build_object('tracking_uid', _track));
  RETURN jsonb_build_object('passed', true, 'tracking_uid', _track);
END $function$;