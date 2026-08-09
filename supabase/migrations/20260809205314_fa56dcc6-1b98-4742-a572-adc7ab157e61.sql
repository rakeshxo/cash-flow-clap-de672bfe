
-- ============ Devices ============
CREATE TABLE public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fingerprint text NOT NULL,
  user_agent text NOT NULL DEFAULT '',
  platform text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT '',
  ip_hash text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fingerprint)
);
GRANT SELECT ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own devices" ON public.user_devices FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all devices" ON public.user_devices FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_user_devices_fingerprint ON public.user_devices (fingerprint);

-- ============ KYC ============
CREATE TABLE public.kyc_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  country text NOT NULL,
  document_type text NOT NULL,
  document_reference text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
GRANT SELECT ON public.kyc_verifications TO authenticated;
GRANT ALL ON public.kyc_verifications TO service_role;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own kyc" ON public.kyc_verifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all kyc" ON public.kyc_verifications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ Network signals ============
CREATE TABLE public.network_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_hash text NOT NULL,
  country text,
  is_vpn boolean NOT NULL DEFAULT false,
  is_proxy boolean NOT NULL DEFAULT false,
  is_tor boolean NOT NULL DEFAULT false,
  is_hosting boolean NOT NULL DEFAULT false,
  context text NOT NULL DEFAULT 'signup',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.network_signals TO authenticated;
GRANT ALL ON public.network_signals TO service_role;
ALTER TABLE public.network_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view network signals" ON public.network_signals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ Profile risk fields ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_ip_hash text,
  ADD COLUMN IF NOT EXISTS vpn_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vpn_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'none';

-- ============ Automatic risk thresholds ============
CREATE OR REPLACE FUNCTION public.enforce_risk_thresholds()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.risk_score IS DISTINCT FROM OLD.risk_score THEN
    IF NEW.risk_score >= 80 AND NEW.account_status <> 'suspended' THEN
      NEW.account_status := 'suspended';
      NEW.suspended_reason := COALESCE(NEW.suspended_reason, 'Automatically suspended: fraud risk score reached ' || NEW.risk_score || '.');
    ELSIF NEW.risk_score >= 50 AND NEW.account_status = 'active' THEN
      NEW.account_status := 'flagged';
      NEW.suspended_reason := COALESCE(NEW.suspended_reason, 'Automatically flagged for review: fraud risk score reached ' || NEW.risk_score || '.');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_enforce_risk ON public.profiles;
CREATE TRIGGER profiles_enforce_risk BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_risk_thresholds();

-- ============ Device registration + duplicate account detection ============
CREATE OR REPLACE FUNCTION public.register_device(_fingerprint text, _user_agent text DEFAULT '', _platform text DEFAULT '', _timezone text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _others int; _fp text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _fp := btrim(COALESCE(_fingerprint, ''));
  IF _fp = '' OR length(_fp) > 128 THEN RAISE EXCEPTION 'Invalid device signature'; END IF;

  INSERT INTO public.user_devices (user_id, fingerprint, user_agent, platform, timezone)
  VALUES (_uid, _fp, left(COALESCE(_user_agent, ''), 400), left(COALESCE(_platform, ''), 100), left(COALESCE(_timezone, ''), 100))
  ON CONFLICT (user_id, fingerprint) DO UPDATE SET last_seen_at = now();

  SELECT count(DISTINCT user_id) INTO _others FROM public.user_devices WHERE fingerprint = _fp AND user_id <> _uid;

  IF _others >= 2 THEN
    PERFORM public.internal_log_security_event(_uid, 'duplicate_account_device', 'high',
      jsonb_build_object('fingerprint', _fp, 'other_accounts', _others));
  ELSIF _others = 1 THEN
    PERFORM public.internal_log_security_event(_uid, 'shared_device', 'medium',
      jsonb_build_object('fingerprint', _fp, 'other_accounts', _others));
  END IF;

  RETURN jsonb_build_object('other_accounts', _others);
END $$;
REVOKE ALL ON FUNCTION public.register_device(text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.register_device(text, text, text, text) TO authenticated;

-- ============ Network signal recording (called by edge function w/ service role) ============
CREATE OR REPLACE FUNCTION public.internal_record_network_signal(
  _user_id uuid, _ip_hash text, _country text, _is_vpn boolean, _is_proxy boolean, _is_tor boolean, _is_hosting boolean, _context text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _bad boolean := COALESCE(_is_vpn,false) OR COALESCE(_is_proxy,false) OR COALESCE(_is_tor,false) OR COALESCE(_is_hosting,false);
        _shared int;
BEGIN
  INSERT INTO public.network_signals (user_id, ip_hash, country, is_vpn, is_proxy, is_tor, is_hosting, context)
  VALUES (_user_id, _ip_hash, _country, COALESCE(_is_vpn,false), COALESCE(_is_proxy,false), COALESCE(_is_tor,false), COALESCE(_is_hosting,false), COALESCE(_context,'signup'));

  IF _user_id IS NOT NULL THEN
    UPDATE public.profiles
      SET last_ip_hash = _ip_hash, vpn_flagged = _bad, vpn_checked_at = now()
    WHERE user_id = _user_id;

    IF _bad THEN
      PERFORM public.internal_log_security_event(_user_id,
        CASE WHEN COALESCE(_is_tor,false) THEN 'tor_connection' WHEN COALESCE(_is_proxy,false) THEN 'proxy_connection' ELSE 'vpn_connection' END,
        CASE WHEN COALESCE(_context,'') = 'withdrawal' THEN 'high' ELSE 'medium' END,
        jsonb_build_object('country', _country, 'context', _context));
    END IF;

    SELECT count(DISTINCT user_id) INTO _shared FROM public.network_signals
      WHERE ip_hash = _ip_hash AND user_id IS NOT NULL AND user_id <> _user_id;
    IF _shared >= 3 THEN
      PERFORM public.internal_log_security_event(_user_id, 'shared_network_cluster', 'high',
        jsonb_build_object('other_accounts', _shared));
    END IF;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.internal_record_network_signal(uuid, text, text, boolean, boolean, boolean, boolean, text) FROM public, anon, authenticated;

-- ============ KYC submission + review ============
CREATE OR REPLACE FUNCTION public.submit_kyc(_full_name text, _dob date, _country text, _doc_type text, _doc_reference text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _cur text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.internal_require_active(_uid);
  PERFORM public.internal_rate_limit(_uid, 'kyc_submit', 5, interval '1 day');
  IF btrim(COALESCE(_full_name,'')) = '' OR length(_full_name) > 120 THEN RAISE EXCEPTION 'Enter your full legal name'; END IF;
  IF _dob IS NULL OR _dob > (now() - interval '18 years')::date THEN RAISE EXCEPTION 'You must be at least 18 years old'; END IF;
  IF btrim(COALESCE(_country,'')) = '' OR length(_country) > 60 THEN RAISE EXCEPTION 'Select your country'; END IF;
  IF _doc_type NOT IN ('passport', 'national_id', 'drivers_license') THEN RAISE EXCEPTION 'Invalid document type'; END IF;
  IF length(btrim(COALESCE(_doc_reference,''))) < 4 OR length(_doc_reference) > 60 THEN RAISE EXCEPTION 'Enter a valid document number'; END IF;

  SELECT status INTO _cur FROM public.kyc_verifications WHERE user_id = _uid;
  IF _cur = 'approved' THEN RAISE EXCEPTION 'Your identity is already verified'; END IF;
  IF _cur = 'pending' THEN RAISE EXCEPTION 'Your verification is already under review'; END IF;

  INSERT INTO public.kyc_verifications (user_id, full_name, date_of_birth, country, document_type, document_reference, status, submitted_at, reviewed_at, reviewed_by, admin_note)
  VALUES (_uid, btrim(_full_name), _dob, btrim(_country), _doc_type, btrim(_doc_reference), 'pending', now(), NULL, NULL, NULL)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name, date_of_birth = EXCLUDED.date_of_birth, country = EXCLUDED.country,
    document_type = EXCLUDED.document_type, document_reference = EXCLUDED.document_reference,
    status = 'pending', submitted_at = now(), reviewed_at = NULL, reviewed_by = NULL, admin_note = NULL;

  UPDATE public.profiles SET kyc_status = 'pending' WHERE user_id = _uid;
  PERFORM public.internal_audit('kyc.submit', 'kyc', NULL, _uid);
END $$;
REVOKE ALL ON FUNCTION public.submit_kyc(text, date, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_kyc(text, date, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_kyc(_kyc_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _admin uuid := public.internal_require_admin(); _k record;
BEGIN
  SELECT * INTO _k FROM public.kyc_verifications WHERE id = _kyc_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Verification not found'; END IF;
  IF _k.status <> 'pending' THEN RAISE EXCEPTION 'Verification already reviewed'; END IF;

  UPDATE public.kyc_verifications
    SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
        reviewed_at = now(), reviewed_by = _admin, admin_note = _note
  WHERE id = _kyc_id;

  UPDATE public.profiles SET kyc_status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END WHERE user_id = _k.user_id;

  INSERT INTO public.notifications (user_id, title, body, icon)
  VALUES (_k.user_id,
    CASE WHEN _approve THEN 'Identity verified' ELSE 'Verification rejected' END,
    COALESCE(NULLIF(btrim(_note), ''), CASE WHEN _approve THEN 'You can now request large payouts.' ELSE 'Please resubmit your identity documents.' END),
    CASE WHEN _approve THEN 'coin' ELSE 'x' END);

  PERFORM public.internal_audit(CASE WHEN _approve THEN 'kyc.approve' ELSE 'kyc.reject' END, 'kyc', _kyc_id, _k.user_id);
END $$;
REVOKE ALL ON FUNCTION public.admin_review_kyc(uuid, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_kyc(uuid, boolean, text) TO authenticated;

-- ============ Withdrawal gating: KYC threshold + VPN block ============
CREATE OR REPLACE FUNCTION public.request_withdrawal(_coins integer, _method text, _destination text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _bal int; _id uuid; _dest text; _dupe int; _p record; _kyc text; _devfp int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
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

  -- VPN / proxy / Tor block (signal must be fresh)
  IF COALESCE(_p.vpn_flagged, false) AND _p.vpn_checked_at > now() - interval '2 hours' THEN
    PERFORM public.internal_log_security_event(_uid, 'withdrawal_from_anonymized_network', 'high', jsonb_build_object('coins', _coins));
    RAISE EXCEPTION 'Payouts cannot be requested over a VPN, proxy or Tor. Disable it and try again.';
  END IF;

  -- Identity verification above threshold
  IF _coins > 5000 THEN
    SELECT status INTO _kyc FROM public.kyc_verifications WHERE user_id = _uid;
    IF COALESCE(_kyc, 'none') <> 'approved' THEN
      RAISE EXCEPTION 'Withdrawals above 5000 coins require identity verification. Complete it from your profile.';
    END IF;
  END IF;

  -- Duplicate-account device sharing
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
END $$;
