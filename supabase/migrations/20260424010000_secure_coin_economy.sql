-- =========================================================================
-- Secure the coin economy
-- =========================================================================
-- Problem: coin_transactions, video_watches, poll_votes, withdrawals and
-- survey_completions currently allow direct client INSERTs with only an
-- `auth.uid() = user_id` check. That check protects *whose row* it is, but
-- not the amount or whether the underlying action actually happened —
-- anyone can open devtools and mint themselves coins, or bypass the
-- withdrawal minimum/balance check entirely.
--
-- It also breaks two legitimate flows, because the RLS check fails when
-- one user's session needs to credit a DIFFERENT user:
--   1. Referral signup bonus (new user's session tries to pay the referrer)
--   2. Admin approving an external survey claim (admin's session tries to
--      pay the claimant)
--
-- Fix: move every coin-affecting write into SECURITY DEFINER functions that
-- validate everything server-side, and remove the now-unnecessary (and
-- unsafe) direct INSERT policies on the underlying tables.
-- =========================================================================

-- ---------- Balance (single source of truth, reusable everywhere) ----------
CREATE OR REPLACE FUNCTION public.get_user_balance(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::int
  FROM public.coin_transactions
  WHERE user_id = _user_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_balance(uuid) TO authenticated;

-- ---------- In-app survey completion ----------
CREATE OR REPLACE FUNCTION public.claim_survey_reward(p_survey_id uuid, p_answers jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_survey public.surveys%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_survey FROM public.surveys WHERE id = p_survey_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Survey not found';
  END IF;
  IF v_survey.external_url IS NOT NULL THEN
    RAISE EXCEPTION 'This survey must be completed via the external link flow';
  END IF;
  IF EXISTS (SELECT 1 FROM public.survey_completions WHERE user_id = v_uid AND survey_id = p_survey_id) THEN
    RAISE EXCEPTION 'You already completed this survey';
  END IF;

  INSERT INTO public.survey_completions (user_id, survey_id, answers, reward_cents)
  VALUES (v_uid, p_survey_id, COALESCE(p_answers, '{}'::jsonb), v_survey.reward_cents);

  INSERT INTO public.coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (v_uid, v_survey.reward_cents, 'survey', 'Completed: ' || v_survey.title, p_survey_id);

  INSERT INTO public.notifications (user_id, title, body, icon)
  VALUES (v_uid, '+' || v_survey.reward_cents || ' coins', 'Completed: ' || v_survey.title, 'coin');

  RETURN v_survey.reward_cents;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_survey_reward(uuid, jsonb) TO authenticated;

-- ---------- Video watch reward ----------
CREATE OR REPLACE FUNCTION public.claim_video_reward(p_video_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_video public.videos%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_video FROM public.videos WHERE id = p_video_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Video not found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.video_watches WHERE user_id = v_uid AND video_id = p_video_id) THEN
    RAISE EXCEPTION 'You already watched this video';
  END IF;

  INSERT INTO public.video_watches (user_id, video_id, reward_coins)
  VALUES (v_uid, p_video_id, v_video.reward_coins);

  INSERT INTO public.coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (v_uid, v_video.reward_coins, 'video', 'Watched: ' || v_video.title, p_video_id);

  INSERT INTO public.notifications (user_id, title, body, icon)
  VALUES (v_uid, '+' || v_video.reward_coins || ' coins', 'Watched: ' || v_video.title, 'coin');

  RETURN v_video.reward_coins;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_video_reward(uuid) TO authenticated;

-- ---------- Daily poll vote ----------
CREATE OR REPLACE FUNCTION public.claim_poll_vote(p_poll_id uuid, p_option_index integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_poll public.daily_polls%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_poll FROM public.daily_polls WHERE id = p_poll_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found';
  END IF;
  IF v_poll.poll_date <> CURRENT_DATE THEN
    RAISE EXCEPTION 'This poll is no longer active';
  END IF;
  IF p_option_index < 0 OR p_option_index >= jsonb_array_length(v_poll.options) THEN
    RAISE EXCEPTION 'Invalid option';
  END IF;

  BEGIN
    INSERT INTO public.poll_votes (user_id, poll_id, option_index)
    VALUES (v_uid, p_poll_id, p_option_index);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'You already voted in today''s poll';
  END;

  INSERT INTO public.coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (v_uid, v_poll.reward_coins, 'poll', 'Daily poll', p_poll_id);

  RETURN v_poll.reward_coins;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_poll_vote(uuid, integer) TO authenticated;

-- ---------- Daily login streak (idempotent per calendar day) ----------
CREATE OR REPLACE FUNCTION public.bump_daily_streak()
RETURNS TABLE(streak integer, bonus_awarded integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_last_active date;
  v_current_streak integer;
  v_new_streak integer;
  v_bonus integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT last_active_date, daily_streak INTO v_last_active, v_current_streak
  FROM public.profiles WHERE user_id = v_uid FOR UPDATE;

  IF v_last_active = CURRENT_DATE THEN
    RETURN QUERY SELECT COALESCE(v_current_streak, 0), 0;
    RETURN;
  END IF;

  v_new_streak := CASE WHEN v_last_active = CURRENT_DATE - 1 THEN COALESCE(v_current_streak, 0) + 1 ELSE 1 END;

  UPDATE public.profiles
  SET daily_streak = v_new_streak, last_active_date = CURRENT_DATE
  WHERE user_id = v_uid;

  IF v_new_streak > 1 THEN
    v_bonus := LEAST(v_new_streak * 2, 20);
    INSERT INTO public.coin_transactions (user_id, amount, type, description)
    VALUES (v_uid, v_bonus, 'streak', v_new_streak || '-day login streak bonus');
  END IF;

  RETURN QUERY SELECT v_new_streak, v_bonus;
END;
$$;
GRANT EXECUTE ON FUNCTION public.bump_daily_streak() TO authenticated;

-- ---------- Withdrawal request (server-validated balance & minimum) ----------
CREATE OR REPLACE FUNCTION public.request_withdrawal(p_method text, p_destination text, p_amount integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_balance integer;
  v_id uuid;
  v_min CONSTANT integer := 500;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_method NOT IN ('paypal', 'bank', 'crypto') THEN
    RAISE EXCEPTION 'Invalid payout method';
  END IF;
  IF p_destination IS NULL OR length(trim(p_destination)) = 0 THEN
    RAISE EXCEPTION 'Enter your payout destination';
  END IF;
  IF p_amount IS NULL OR p_amount < v_min THEN
    RAISE EXCEPTION 'Minimum withdrawal is % coins', v_min;
  END IF;

  v_balance := public.get_user_balance(v_uid);
  IF p_amount > v_balance THEN
    RAISE EXCEPTION 'Not enough coins';
  END IF;

  INSERT INTO public.withdrawals (user_id, coins_amount, cash_value_cents, method, destination)
  VALUES (v_uid, p_amount, p_amount, p_method, trim(p_destination))
  RETURNING id INTO v_id;

  INSERT INTO public.coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (v_uid, -p_amount, 'redeem', 'Withdrawal via ' || p_method, v_id);

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(text, text, integer) TO authenticated;

-- ---------- Admin approving an external survey claim ----------
CREATE OR REPLACE FUNCTION public.admin_approve_survey_claim(p_claim_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim public.survey_claims%ROWTYPE;
  v_title text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_claim FROM public.survey_claims WHERE id = p_claim_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;
  IF v_claim.status <> 'pending' THEN
    RAISE EXCEPTION 'Claim already reviewed';
  END IF;

  SELECT title INTO v_title FROM public.surveys WHERE id = v_claim.survey_id;

  UPDATE public.survey_claims
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_claim_id;

  INSERT INTO public.coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (v_claim.user_id, v_claim.reward_cents, 'survey', 'Approved: ' || COALESCE(v_title, 'External survey'), v_claim.survey_id);

  INSERT INTO public.notifications (user_id, title, body, icon)
  VALUES (v_claim.user_id, '+' || v_claim.reward_cents || ' coins', 'Approved: ' || COALESCE(v_title, 'External survey'), 'coin');

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_approve_survey_claim(uuid) TO authenticated;

-- ---------- Referral bonus ----------
CREATE OR REPLACE FUNCTION public.apply_referral_bonus(p_ref_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_referrer uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_ref_code IS NULL OR length(trim(p_ref_code)) = 0 THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_uid) THEN
    RETURN false;
  END IF;

  SELECT user_id INTO v_referrer FROM public.profiles WHERE referral_code = trim(p_ref_code);
  IF v_referrer IS NULL OR v_referrer = v_uid THEN
    RETURN false;
  END IF;

  UPDATE public.profiles SET referred_by = v_referrer WHERE user_id = v_uid;

  INSERT INTO public.referrals (referrer_id, referred_id, bonus_paid)
  VALUES (v_referrer, v_uid, true)
  ON CONFLICT (referred_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.coin_transactions (user_id, amount, type, description)
  VALUES (v_referrer, 250, 'referral', 'Friend joined via your link');

  INSERT INTO public.coin_transactions (user_id, amount, type, description)
  VALUES (v_uid, 100, 'bonus', 'Welcome bonus from referral');

  INSERT INTO public.notifications (user_id, title, body, icon)
  VALUES (v_referrer, '+250 coins', 'Friend joined via your link', 'coin');

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.apply_referral_bonus(text) TO authenticated;

-- ---------- Lock down direct client writes now that functions cover them ----------
DROP POLICY IF EXISTS "Users insert own transactions" ON public.coin_transactions;
DROP POLICY IF EXISTS "Users insert own watches" ON public.video_watches;
DROP POLICY IF EXISTS "Users insert own votes" ON public.poll_votes;
DROP POLICY IF EXISTS "Users insert own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users insert own completions" ON public.survey_completions;
