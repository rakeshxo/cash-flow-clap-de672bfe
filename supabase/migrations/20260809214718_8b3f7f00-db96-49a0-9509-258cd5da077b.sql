-- 1) Column-level UPDATE restriction on profiles
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;
GRANT UPDATE (
  display_name, avatar_url, background_completed, age_range, gender, country,
  employment_status, job_title, industry, income_range, interests,
  shopping_habits, marital_status, has_kids, education, background_updated_at
) ON public.profiles TO authenticated;

-- 2) Serialize balance-affecting operations per user
CREATE OR REPLACE FUNCTION public.request_withdrawal(_coins integer, _method text, _destination text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _bal int; _id uuid; _dest text; _dupe int; _p record; _kyc text; _devfp int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('coin_balance:' || _uid::text, 0));
  PERFORM public.internal_require_active(_uid);
  PERFORM public.internal_rate_limit(_uid, 'withdrawal_request', 5, interval '1 day');
  SELECT * INTO _p FROM public.profiles WHERE user_id = _uid;
  IF _p.account_status = 'flagged' THEN
    RAISE EXCEPTION 'Your account is under review. Withdrawals are paused until review completes.';
  END IF;
  IF _coins IS NULL OR _coins < 500 THEN RAISE EXCEPTION 'Minimum withdrawal is 500 coins'; END IF;
  IF _method NOT IN ('paypal', 'bank', 'crypto') THEN RAISE EXCEPTION 'Invalid payout method'; END IF;
  _dest := btrim(COALESCE(_destination, ''));
  IF _dest = '' OR length(_dest) > 200 THEN RAISE EXCEPTION 'Invalid payout destination'; END IF;

  IF COALESCE(_p.vpn_flagged, false) AND _p.vpn_checked_at > now() - interval '2 hours' THEN
    PERFORM public.internal_log_security_event(_uid, 'withdrawal_from_anonymized_network', 'high', jsonb_build_object('coins', _coins));
    RAISE EXCEPTION 'Payouts cannot be requested over a VPN, proxy or Tor. Disable it and try again.';
  END IF;

  IF _coins > 5000 THEN
    SELECT status INTO _kyc FROM public.kyc_verifications WHERE user_id = _uid;
    IF COALESCE(_kyc, 'none') <> 'approved' THEN
      RAISE EXCEPTION 'Withdrawals above 5000 coins require identity verification. Complete it from your profile.';
    END IF;
  END IF;

  SELECT count(DISTINCT d2.user_id) INTO _devfp
  FROM public.user_devices d1 JOIN public.user_devices d2 ON d1.fingerprint = d2.fingerprint AND d2.user_id <> _uid
  WHERE d1.user_id = _uid;
  IF _devfp > 0 THEN
    PERFORM public.internal_log_security_event(_uid, 'withdrawal_shared_device', 'high', jsonb_build_object('other_accounts', _devfp));
    RAISE EXCEPTION 'This device is linked to another account. Payouts are paused while we review.';
  END IF;

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
END $function$;

CREATE OR REPLACE FUNCTION public.request_redemption(_reward_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _r record; _bal int; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('coin_balance:' || _uid::text, 0));
  PERFORM public.internal_require_active(_uid);
  PERFORM public.internal_rate_limit(_uid, 'redemption_request', 10, interval '1 day');
  SELECT * INTO _r FROM public.rewards WHERE id = _reward_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reward not found'; END IF;
  _bal := public.user_balance(_uid);
  IF _r.cost_coins > _bal THEN RAISE EXCEPTION 'Not enough coins'; END IF;
  INSERT INTO public.redemptions (user_id, reward_id, cost_coins, status)
  VALUES (_uid, _reward_id, _r.cost_coins, 'pending')
  RETURNING id INTO _id;
  PERFORM public.internal_award_coins(_uid, -_r.cost_coins, 'redeem', 'Redeemed: ' || _r.name, _id);
  PERFORM public.internal_audit('redemption.request', 'redemption', _id, _uid, jsonb_build_object('coins', _r.cost_coins));
  RETURN _id;
END $function$;

REVOKE EXECUTE ON FUNCTION public.request_redemption(uuid) FROM anon, authenticated;

-- 3) Remove browser access to unused privileged functions
REVOKE EXECUTE ON FUNCTION public.admin_create_payout_batch(uuid[], text, timestamptz) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_admin_role(uuid, boolean) FROM anon, authenticated;