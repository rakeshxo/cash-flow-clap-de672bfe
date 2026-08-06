
-- ============ 1. Screener answer key moved out of client-readable data ============
CREATE TABLE IF NOT EXISTS public.survey_screener_keys (
  survey_id uuid PRIMARY KEY REFERENCES public.surveys(id) ON DELETE CASCADE,
  correct_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_screener_keys TO authenticated;
GRANT ALL ON public.survey_screener_keys TO service_role;
ALTER TABLE public.survey_screener_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage screener keys" ON public.survey_screener_keys;
CREATE POLICY "Admins manage screener keys" ON public.survey_screener_keys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.survey_screener_keys (survey_id, correct_answers)
SELECT s.id,
  COALESCE((SELECT jsonb_agg(COALESCE(t.q->'correct', to_jsonb(0)) ORDER BY t.ord)
            FROM jsonb_array_elements(s.screener_questions) WITH ORDINALITY AS t(q, ord)), '[]'::jsonb)
FROM public.surveys s
WHERE jsonb_typeof(s.screener_questions) = 'array' AND jsonb_array_length(s.screener_questions) > 0
ON CONFLICT (survey_id) DO NOTHING;

UPDATE public.surveys s
SET screener_questions = COALESCE((
  SELECT jsonb_agg((t.q - 'correct') ORDER BY t.ord)
  FROM jsonb_array_elements(s.screener_questions) WITH ORDINALITY AS t(q, ord)), '[]'::jsonb)
WHERE jsonb_typeof(s.screener_questions) = 'array' AND jsonb_array_length(s.screener_questions) > 0;

CREATE OR REPLACE FUNCTION public.strip_screener_answers()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF jsonb_typeof(NEW.screener_questions) = 'array' THEN
    NEW.screener_questions := COALESCE((
      SELECT jsonb_agg((t.q - 'correct') ORDER BY t.ord)
      FROM jsonb_array_elements(NEW.screener_questions) WITH ORDINALITY AS t(q, ord)), '[]'::jsonb);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.strip_screener_answers() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS surveys_strip_screener ON public.surveys;
CREATE TRIGGER surveys_strip_screener BEFORE INSERT OR UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.strip_screener_answers();

-- ============ 2. Trusted server-side coin economy ============
CREATE OR REPLACE FUNCTION public.user_balance(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(amount), 0)::int FROM public.coin_transactions WHERE user_id = _user_id;
$$;
REVOKE ALL ON FUNCTION public.user_balance(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.internal_award_coins(_user_id uuid, _amount int, _type text, _description text, _reference_id uuid DEFAULT NULL, _notify boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (_user_id, _amount, _type, _description, _reference_id);
  IF _notify THEN
    INSERT INTO public.notifications (user_id, title, body, icon)
    VALUES (_user_id, CASE WHEN _amount >= 0 THEN '+' || _amount || ' coins' ELSE _amount || ' coins' END, _description, 'coin');
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.internal_award_coins(uuid, int, text, text, uuid, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.award_video_watch(_video_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _v record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _v FROM public.videos WHERE id = _video_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Video not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.video_watches WHERE user_id = _uid AND video_id = _video_id) THEN
    RAISE EXCEPTION 'Already rewarded for this video';
  END IF;
  INSERT INTO public.video_watches (user_id, video_id, reward_coins) VALUES (_uid, _video_id, _v.reward_coins);
  PERFORM public.internal_award_coins(_uid, _v.reward_coins, 'video', 'Watched: ' || _v.title, _video_id);
  RETURN _v.reward_coins;
END $$;
REVOKE ALL ON FUNCTION public.award_video_watch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_video_watch(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.vote_daily_poll(_poll_id uuid, _option_index int)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _p record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
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
  RETURN _p.reward_coins;
END $$;
REVOKE ALL ON FUNCTION public.vote_daily_poll(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vote_daily_poll(uuid, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_in_app_survey(_survey_id uuid, _answers jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _s record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
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
  RETURN _s.reward_cents;
END $$;
REVOKE ALL ON FUNCTION public.complete_in_app_survey(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_in_app_survey(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_daily_streak()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _p record; _today date := (now() AT TIME ZONE 'utc')::date; _new int; _coins int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
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
REVOKE ALL ON FUNCTION public.claim_daily_streak() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_streak() TO authenticated;

CREATE OR REPLACE FUNCTION public.start_external_survey(_survey_id uuid, _answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _s record; _key jsonb; _q jsonb; _i int := 0; _passed boolean := true; _correct int; _ans text; _track text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
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
  IF NOT _passed THEN RETURN jsonb_build_object('passed', false); END IF;
  _track := replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.survey_claims (user_id, survey_id, screener_answers, reward_cents, link_opened_at, status, tracking_uid)
  VALUES (_uid, _survey_id, _answers, _s.reward_cents, now(), 'pending', _track);
  RETURN jsonb_build_object('passed', true, 'tracking_uid', _track);
END $$;
REVOKE ALL ON FUNCTION public.start_external_survey(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_external_survey(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_withdrawal(_coins int, _method text, _destination text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _bal int; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _coins IS NULL OR _coins < 500 THEN RAISE EXCEPTION 'Minimum withdrawal is 500 coins'; END IF;
  IF _method NOT IN ('paypal', 'bank', 'crypto') THEN RAISE EXCEPTION 'Invalid payout method'; END IF;
  IF _destination IS NULL OR btrim(_destination) = '' OR length(_destination) > 200 THEN
    RAISE EXCEPTION 'Invalid payout destination';
  END IF;
  _bal := public.user_balance(_uid);
  IF _coins > _bal THEN RAISE EXCEPTION 'Not enough coins'; END IF;
  INSERT INTO public.withdrawals (user_id, coins_amount, cash_value_cents, method, destination)
  VALUES (_uid, _coins, _coins, _method, btrim(_destination))
  RETURNING id INTO _id;
  PERFORM public.internal_award_coins(_uid, -_coins, 'redeem', 'Withdrawal via ' || _method, _id);
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.request_withdrawal(int, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(int, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_referral(_ref_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _referrer uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _ref_code IS NULL OR btrim(_ref_code) = '' THEN RETURN false; END IF;
  SELECT user_id INTO _referrer FROM public.profiles WHERE referral_code = btrim(_ref_code);
  IF _referrer IS NULL OR _referrer = _uid THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = _uid) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.coin_transactions WHERE user_id = _uid) THEN RETURN false; END IF;
  UPDATE public.profiles SET referred_by = _referrer WHERE user_id = _uid;
  INSERT INTO public.referrals (referrer_id, referred_id, bonus_paid) VALUES (_referrer, _uid, true);
  PERFORM public.internal_award_coins(_referrer, 250, 'referral', 'Friend joined via your link');
  PERFORM public.internal_award_coins(_uid, 100, 'bonus', 'Welcome bonus from referral');
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.claim_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_survey_claim(_claim_id uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _c record; _title text;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin'::app_role) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO _c FROM public.survey_claims WHERE id = _claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim not found'; END IF;
  IF _c.status <> 'pending' THEN RAISE EXCEPTION 'Claim already reviewed'; END IF;
  SELECT title INTO _title FROM public.surveys WHERE id = _c.survey_id;
  UPDATE public.survey_claims
    SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
        reviewed_at = now(), reviewed_by = _uid
  WHERE id = _claim_id;
  IF _approve THEN
    PERFORM public.internal_award_coins(_c.user_id, _c.reward_cents, 'survey', 'Approved: ' || COALESCE(_title, 'External survey'), _c.survey_id);
  ELSE
    INSERT INTO public.notifications (user_id, title, body, icon)
    VALUES (_c.user_id, 'Submission rejected', 'Your submission for ' || COALESCE(_title, 'a survey') || ' was not approved.', 'x');
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_review_survey_claim(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_survey_claim(uuid, boolean) TO authenticated;

-- ============ 3. Remove direct client write access to reward-bearing tables ============
DROP POLICY IF EXISTS "Users insert own transactions" ON public.coin_transactions;
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users insert own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users insert own watches" ON public.video_watches;
DROP POLICY IF EXISTS "Users insert own votes" ON public.poll_votes;
DROP POLICY IF EXISTS "Users insert their own completions" ON public.survey_completions;
DROP POLICY IF EXISTS "Users insert own claims" ON public.survey_claims;
DROP POLICY IF EXISTS "Users insert referrals where they are referred" ON public.referrals;

REVOKE INSERT, UPDATE, DELETE ON public.coin_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.withdrawals FROM anon;
REVOKE INSERT, DELETE ON public.withdrawals FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.video_watches FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.poll_votes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.survey_completions FROM anon, authenticated;
REVOKE INSERT, DELETE ON public.survey_claims FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.referrals FROM anon, authenticated;
REVOKE INSERT, DELETE ON public.notifications FROM anon, authenticated;

-- ============ 4. Profiles: no cross-user reads ============
DROP POLICY IF EXISTS "Profiles display info viewable by all authed" ON public.profiles;

-- ============ 5. Tighten SECURITY DEFINER function exposure ============
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_admin_on_signup() FROM PUBLIC, anon, authenticated;

-- admin policies on publicly readable tables must not require has_role for anon
DROP POLICY IF EXISTS "Admins manage offers" ON public.offers;
CREATE POLICY "Admins manage offers" ON public.offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins manage rewards" ON public.rewards;
CREATE POLICY "Admins manage rewards" ON public.rewards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins manage surveys" ON public.surveys;
CREATE POLICY "Admins manage surveys" ON public.surveys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins manage videos" ON public.videos;
CREATE POLICY "Admins manage videos" ON public.videos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
