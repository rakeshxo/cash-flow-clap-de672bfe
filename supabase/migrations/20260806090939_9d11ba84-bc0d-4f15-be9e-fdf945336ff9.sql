-- ============ profiles: account safety ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS risk_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- ============ withdrawals: review metadata ============
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_note text;

-- ============ audit_logs ============
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_is_admin boolean NOT NULL DEFAULT false,
  action text NOT NULL,
  entity_type text NOT NULL DEFAULT '',
  entity_id uuid,
  target_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view audit logs" ON public.audit_logs;
CREATE POLICY "Admins view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_target_idx ON public.audit_logs (target_user_id);

-- ============ security_events ============
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view security events" ON public.security_events;
CREATE POLICY "Admins view security events" ON public.security_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS security_events_created_idx ON public.security_events (created_at DESC);

-- ============ rate_limits (system only) ============
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, action, window_start)
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- ============ internal helpers ============
CREATE OR REPLACE FUNCTION public.internal_audit(
  _action text, _entity_type text DEFAULT '', _entity_id uuid DEFAULT NULL,
  _target_user_id uuid DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  INSERT INTO public.audit_logs (actor_id, actor_is_admin, action, entity_type, entity_id, target_user_id, metadata)
  VALUES (_uid, COALESCE(public.has_role(_uid, 'admin'::app_role), false), _action, COALESCE(_entity_type, ''), _entity_id, COALESCE(_target_user_id, _uid), COALESCE(_metadata, '{}'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.internal_audit(text, text, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.internal_log_security_event(
  _user_id uuid, _event_type text, _severity text DEFAULT 'low', _detail jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.security_events (user_id, event_type, severity, detail)
  VALUES (_user_id, _event_type, _severity, COALESCE(_detail, '{}'::jsonb));
  IF _severity IN ('high', 'critical') THEN
    UPDATE public.profiles SET risk_score = LEAST(risk_score + 25, 100),
      account_status = CASE WHEN account_status = 'active' THEN 'flagged' ELSE account_status END
    WHERE user_id = _user_id;
  ELSIF _severity = 'medium' THEN
    UPDATE public.profiles SET risk_score = LEAST(risk_score + 10, 100) WHERE user_id = _user_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.internal_log_security_event(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.internal_require_active(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _st text;
BEGIN
  SELECT account_status INTO _st FROM public.profiles WHERE user_id = _user_id;
  IF _st = 'suspended' THEN
    RAISE EXCEPTION 'Your account is suspended. Contact support.';
  END IF;
  UPDATE public.profiles SET last_seen_at = now() WHERE user_id = _user_id;
END $$;
REVOKE ALL ON FUNCTION public.internal_require_active(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.internal_rate_limit(_user_id uuid, _action text, _max integer, _window interval)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _bucket timestamptz; _c integer;
BEGIN
  _bucket := to_timestamp(floor(extract(epoch FROM now()) / GREATEST(extract(epoch FROM _window), 1)) * GREATEST(extract(epoch FROM _window), 1));
  INSERT INTO public.rate_limits (user_id, action, window_start, count)
  VALUES (_user_id, _action, _bucket, 1)
  ON CONFLICT (user_id, action, window_start) DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO _c;
  IF _c > _max THEN
    IF _c = _max + 1 THEN
      PERFORM public.internal_log_security_event(_user_id, 'rate_limit_exceeded', 'medium', jsonb_build_object('action', _action, 'max', _max));
    END IF;
    RAISE EXCEPTION 'Too many attempts. Please slow down and try again later.';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.internal_rate_limit(uuid, text, integer, interval) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.internal_require_admin()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN _uid;
END $$;
REVOKE ALL ON FUNCTION public.internal_require_admin() FROM PUBLIC, anon, authenticated;

-- ============ hardened earning RPCs ============
CREATE OR REPLACE FUNCTION public.award_video_watch(_video_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _v record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.internal_require_active(_uid);
  PERFORM public.internal_rate_limit(_uid, 'video_watch', 60, interval '1 day');
  SELECT * INTO _v FROM public.videos WHERE id = _video_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Video not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.video_watches WHERE user_id = _uid AND video_id = _video_id) THEN
    RAISE EXCEPTION 'Already rewarded for this video';
  END IF;
  INSERT INTO public.video_watches (user_id, video_id, reward_coins) VALUES (_uid, _video_id, _v.reward_coins);
  PERFORM public.internal_award_coins(_uid, _v.reward_coins, 'video', 'Watched: ' || _v.title, _video_id);
  PERFORM public.internal_audit('video.watch', 'video', _video_id, _uid, jsonb_build_object('coins', _v.reward_coins));
  RETURN _v.reward_coins;
END $$;

CREATE OR REPLACE FUNCTION public.vote_daily_poll(_poll_id uuid, _option_index integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _p record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.internal_require_active(_uid);
  PERFORM public.internal_rate_limit(_uid, 'poll_vote', 20, interval '1 day');
  SELECT * INTO _p FROM public.daily_polls WHERE id = _poll_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Poll not found'; END IF;
  IF _option_index < 0 OR _option_index >= jsonb_array_length(COALESCE(_p.options, '[]'::jsonb)) THEN
    RAISE EXCEPTION 'Invalid option';
  END IF;
  IF EXISTS (SELECT 1 FROM public.poll_votes WHERE user_id = _uid AND poll_id = _poll_id) THEN
    RAISE EXCEPTION 'Already voted';
  END IF;
  INSERT INTO public.poll_votes (user_id, poll_id, option_index) VALUES (_uid, _poll_id, _option_index);
  PERFORM public.internal_award_coins(_uid, _p.reward_coins, 'poll', 'Daily poll', _poll_id);
  PERFORM public.internal_audit('poll.vote', 'poll', _poll_id, _uid, jsonb_build_object('coins', _p.reward_coins));
  RETURN _p.reward_coins;
END $$;

CREATE OR REPLACE FUNCTION public.complete_in_app_survey(_survey_id uuid, _answers jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _s record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.internal_require_active(_uid);
  PERFORM public.internal_rate_limit(_uid, 'survey_complete', 40, interval '1 day');
  SELECT * INTO _s FROM public.surveys WHERE id = _survey_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Survey not found'; END IF;
  IF _s.external_url IS NOT NULL THEN RAISE EXCEPTION 'This survey is completed externally'; END IF;
  IF jsonb_typeof(_answers) <> 'object' THEN RAISE EXCEPTION 'Invalid answers'; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(_answers)) < jsonb_array_length(COALESCE(_s.questions, '[]'::jsonb)) THEN
    RAISE EXCEPTION 'Please answer all questions';
  END IF;
  IF EXISTS (SELECT 1 FROM public.survey_completions WHERE user_id = _uid AND survey_id = _survey_id) THEN
    RAISE EXCEPTION 'Already completed';
  END IF;
  INSERT INTO public.survey_completions (user_id, survey_id, answers, reward_cents)
  VALUES (_uid, _survey_id, _answers, _s.reward_cents);
  PERFORM public.internal_award_coins(_uid, _s.reward_cents, 'survey', 'Completed: ' || _s.title, _survey_id);
  PERFORM public.internal_audit('survey.complete', 'survey', _survey_id, _uid, jsonb_build_object('coins', _s.reward_cents));
  RETURN _s.reward_cents;
END $$;

CREATE OR REPLACE FUNCTION public.start_external_survey(_survey_id uuid, _answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _s record; _key jsonb; _q jsonb; _i int := 0; _passed boolean := true; _correct int; _ans text; _track text;
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
  _track := replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.survey_claims (user_id, survey_id, screener_answers, reward_cents, link_opened_at, status, tracking_uid)
  VALUES (_uid, _survey_id, _answers, _s.reward_cents, now(), 'pending', _track);
  PERFORM public.internal_audit('survey.external_start', 'survey', _survey_id, _uid, jsonb_build_object('tracking_uid', _track));
  RETURN jsonb_build_object('passed', true, 'tracking_uid', _track);
END $$;

CREATE OR REPLACE FUNCTION public.claim_daily_streak()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _p record; _today date := (now() AT TIME ZONE 'utc')::date; _new int; _coins int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.internal_require_active(_uid);
  SELECT * INTO _p FROM public.profiles WHERE user_id = _uid;
  IF NOT FOUND THEN RETURN jsonb_build_object('streak', 0, 'coins', 0); END IF;
  IF _p.last_active_date = _today THEN
    RETURN jsonb_build_object('streak', _p.daily_streak, 'coins', 0);
  END IF;
  _new := CASE WHEN _p.last_active_date = _today - 1 THEN COALESCE(_p.daily_streak, 0) + 1 ELSE 1 END;
  UPDATE public.profiles SET daily_streak = _new, last_active_date = _today WHERE user_id = _uid;
  IF _new > 1 THEN
    _coins := LEAST(_new * 2, 20);
    PERFORM public.internal_award_coins(_uid, _coins, 'streak', _new || '-day login streak bonus');
  END IF;
  RETURN jsonb_build_object('streak', _new, 'coins', _coins);
END $$;

-- ============ hardened withdrawals ============
CREATE OR REPLACE FUNCTION public.request_withdrawal(_coins integer, _method text, _destination text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _bal int; _id uuid; _dest text; _dupe int; _st text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.internal_require_active(_uid);
  PERFORM public.internal_rate_limit(_uid, 'withdrawal_request', 5, interval '1 day');
  SELECT account_status INTO _st FROM public.profiles WHERE user_id = _uid;
  IF _st = 'flagged' THEN
    RAISE EXCEPTION 'Your account is under review. Withdrawals are paused until review completes.';
  END IF;
  IF _coins IS NULL OR _coins < 500 THEN RAISE EXCEPTION 'Minimum withdrawal is 500 coins'; END IF;
  IF _method NOT IN ('paypal', 'bank', 'crypto') THEN RAISE EXCEPTION 'Invalid payout method'; END IF;
  _dest := btrim(COALESCE(_destination, ''));
  IF _dest = '' OR length(_dest) > 200 THEN RAISE EXCEPTION 'Invalid payout destination'; END IF;
  IF EXISTS (SELECT 1 FROM public.withdrawals WHERE user_id = _uid AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have a pending withdrawal. Please wait for it to be processed.';
  END IF;
  _bal := public.user_balance(_uid);
  IF _coins > _bal THEN RAISE EXCEPTION 'Not enough coins'; END IF;

  SELECT count(DISTINCT user_id) INTO _dupe FROM public.withdrawals
    WHERE lower(destination) = lower(_dest) AND user_id <> _uid;
  IF _dupe > 0 THEN
    PERFORM public.internal_log_security_event(_uid, 'shared_payout_destination', 'high',
      jsonb_build_object('destination', _dest, 'other_accounts', _dupe));
    RAISE EXCEPTION 'This payout destination is already linked to another account.';
  END IF;

  INSERT INTO public.withdrawals (user_id, coins_amount, cash_value_cents, method, destination)
  VALUES (_uid, _coins, _coins, _method, _dest)
  RETURNING id INTO _id;
  PERFORM public.internal_award_coins(_uid, -_coins, 'redeem', 'Withdrawal via ' || _method, _id);
  PERFORM public.internal_audit('withdrawal.request', 'withdrawal', _id, _uid, jsonb_build_object('coins', _coins, 'method', _method));
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_withdrawal_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _admin uuid := public.internal_require_admin(); _w record;
BEGIN
  SELECT * INTO _w FROM public.withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF _w.status <> 'pending' THEN RAISE EXCEPTION 'Withdrawal already processed'; END IF;
  UPDATE public.withdrawals
    SET status = CASE WHEN _approve THEN 'paid' ELSE 'rejected' END,
        processed_at = now(), reviewed_at = now(), reviewed_by = _admin, admin_note = _note
  WHERE id = _withdrawal_id;
  IF _approve THEN
    INSERT INTO public.notifications (user_id, title, body, icon)
    VALUES (_w.user_id, 'Withdrawal paid', 'Your ' || _w.coins_amount || ' coin payout via ' || _w.method || ' has been sent.', 'coin');
  ELSE
    PERFORM public.internal_award_coins(_w.user_id, _w.coins_amount, 'refund', 'Withdrawal rejected - coins returned', _withdrawal_id);
    INSERT INTO public.notifications (user_id, title, body, icon)
    VALUES (_w.user_id, 'Withdrawal rejected', COALESCE(NULLIF(btrim(_note), ''), 'Your withdrawal request was rejected and your coins were returned.'), 'x');
  END IF;
  PERFORM public.internal_audit(CASE WHEN _approve THEN 'withdrawal.approve' ELSE 'withdrawal.reject' END,
    'withdrawal', _withdrawal_id, _w.user_id, jsonb_build_object('coins', _w.coins_amount, 'note', _note));
END $$;

-- ============ admin operations ============
CREATE OR REPLACE FUNCTION public.admin_review_survey_claim(_claim_id uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _admin uuid := public.internal_require_admin(); _c record; _title text;
BEGIN
  SELECT * INTO _c FROM public.survey_claims WHERE id = _claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim not found'; END IF;
  IF _c.status <> 'pending' THEN RAISE EXCEPTION 'Claim already reviewed'; END IF;
  SELECT title INTO _title FROM public.surveys WHERE id = _c.survey_id;
  UPDATE public.survey_claims
    SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
        reviewed_at = now(), reviewed_by = _admin
  WHERE id = _claim_id;
  IF _approve THEN
    PERFORM public.internal_award_coins(_c.user_id, _c.reward_cents, 'survey', 'Approved: ' || COALESCE(_title, 'External survey'), _c.survey_id);
  ELSE
    INSERT INTO public.notifications (user_id, title, body, icon)
    VALUES (_c.user_id, 'Submission rejected', 'Your submission for ' || COALESCE(_title, 'a survey') || ' was not approved.', 'x');
  END IF;
  PERFORM public.internal_audit(CASE WHEN _approve THEN 'claim.approve' ELSE 'claim.reject' END,
    'survey_claim', _claim_id, _c.user_id, jsonb_build_object('coins', _c.reward_cents, 'survey', _title));
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_account_status(_user_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _admin uuid := public.internal_require_admin();
BEGIN
  IF _status NOT IN ('active', 'flagged', 'suspended') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF _user_id = _admin AND _status <> 'active' THEN RAISE EXCEPTION 'You cannot restrict your own account'; END IF;
  UPDATE public.profiles
    SET account_status = _status,
        suspended_reason = CASE WHEN _status = 'active' THEN NULL ELSE _reason END,
        risk_score = CASE WHEN _status = 'active' THEN 0 ELSE risk_score END
  WHERE user_id = _user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  INSERT INTO public.notifications (user_id, title, body, icon)
  VALUES (_user_id,
    CASE _status WHEN 'suspended' THEN 'Account suspended' WHEN 'flagged' THEN 'Account under review' ELSE 'Account restored' END,
    COALESCE(NULLIF(btrim(_reason), ''), 'Your account status was updated by an administrator.'), 'x');
  PERFORM public.internal_audit('user.status_change', 'profile', NULL, _user_id, jsonb_build_object('status', _status, 'reason', _reason));
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_admin_role(_user_id uuid, _grant boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _admin uuid := public.internal_require_admin();
BEGIN
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin'::app_role) ON CONFLICT DO NOTHING;
  ELSE
    IF _user_id = _admin THEN RAISE EXCEPTION 'You cannot revoke your own admin access'; END IF;
    IF (SELECT count(*) FROM public.user_roles WHERE role = 'admin'::app_role) <= 1 THEN
      RAISE EXCEPTION 'At least one admin must remain';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'::app_role;
  END IF;
  PERFORM public.internal_audit(CASE WHEN _grant THEN 'role.grant_admin' ELSE 'role.revoke_admin' END, 'user_role', NULL, _user_id);
END $$;

CREATE OR REPLACE FUNCTION public.admin_adjust_coins(_user_id uuid, _amount integer, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _admin uuid := public.internal_require_admin();
BEGIN
  IF _amount = 0 OR _amount IS NULL THEN RAISE EXCEPTION 'Amount must not be zero'; END IF;
  IF abs(_amount) > 100000 THEN RAISE EXCEPTION 'Adjustment too large'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  IF _amount < 0 AND public.user_balance(_user_id) + _amount < 0 THEN
    RAISE EXCEPTION 'Adjustment would make the balance negative';
  END IF;
  PERFORM public.internal_award_coins(_user_id, _amount, 'adjustment', btrim(_reason));
  PERFORM public.internal_audit('coins.adjust', 'profile', NULL, _user_id, jsonb_build_object('amount', _amount, 'reason', btrim(_reason)));
END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_security_event(_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _admin uuid := public.internal_require_admin();
BEGIN
  UPDATE public.security_events SET resolved = true, resolved_by = _admin, resolved_at = now()
  WHERE id = _event_id AND resolved = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found or already resolved'; END IF;
  PERFORM public.internal_audit('security_event.resolve', 'security_event', _event_id);
END $$;

CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.internal_require_admin();
  RETURN jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'active_7d', (SELECT count(*) FROM public.profiles WHERE last_seen_at > now() - interval '7 days'),
    'flagged_users', (SELECT count(*) FROM public.profiles WHERE account_status <> 'active'),
    'coins_outstanding', (SELECT COALESCE(sum(amount), 0) FROM public.coin_transactions),
    'coins_awarded_7d', (SELECT COALESCE(sum(amount), 0) FROM public.coin_transactions WHERE amount > 0 AND created_at > now() - interval '7 days'),
    'pending_claims', (SELECT count(*) FROM public.survey_claims WHERE status = 'pending'),
    'pending_withdrawals', (SELECT count(*) FROM public.withdrawals WHERE status = 'pending'),
    'open_security_events', (SELECT count(*) FROM public.security_events WHERE resolved = false)
  );
END $$;

-- lock down execute surface for new admin RPCs
REVOKE ALL ON FUNCTION public.admin_review_withdrawal(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_account_status(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_admin_role(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_adjust_coins(uuid, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_resolve_security_event(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_platform_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_withdrawal(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_admin_role(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_coins(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_security_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_platform_stats() TO authenticated;