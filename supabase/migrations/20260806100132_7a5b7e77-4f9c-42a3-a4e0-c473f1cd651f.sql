-- 1. offer_activations: no direct client writes
DROP POLICY IF EXISTS "Users insert own activations" ON public.offer_activations;
REVOKE INSERT, UPDATE, DELETE ON public.offer_activations FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.award_offer_activation(_offer_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _o record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.internal_require_active(_uid);
  PERFORM public.internal_rate_limit(_uid, 'offer_activation', 30, interval '1 day');
  SELECT * INTO _o FROM public.offers WHERE id = _offer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.offer_activations WHERE user_id = _uid AND offer_id = _offer_id) THEN
    RAISE EXCEPTION 'Offer already activated';
  END IF;
  INSERT INTO public.offer_activations (user_id, offer_id, reward_coins)
  VALUES (_uid, _offer_id, _o.reward_coins);
  PERFORM public.internal_award_coins(_uid, _o.reward_coins, 'offer', 'Activated: ' || _o.title, _offer_id);
  PERFORM public.internal_audit('offer.activate', 'offer', _offer_id, _uid, jsonb_build_object('coins', _o.reward_coins));
  RETURN _o.reward_coins;
END $$;

REVOKE ALL ON FUNCTION public.award_offer_activation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_offer_activation(uuid) TO authenticated;

-- 2. redemptions: no direct client writes
DROP POLICY IF EXISTS "Users insert own redemptions" ON public.redemptions;
REVOKE INSERT, UPDATE, DELETE ON public.redemptions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_redemption(_reward_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _r record; _bal int; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
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
END $$;

REVOKE ALL ON FUNCTION public.request_redemption(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_redemption(uuid) TO authenticated;

-- 3. rate_limits: internal only
REVOKE ALL ON public.rate_limits FROM anon, authenticated;
GRANT ALL ON public.rate_limits TO service_role;