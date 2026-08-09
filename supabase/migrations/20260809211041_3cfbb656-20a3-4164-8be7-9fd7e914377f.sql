-- ============ Staff role helpers ============
CREATE OR REPLACE FUNCTION public.has_staff_role(_user_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = 'admin'::app_role OR role::text = ANY(_roles))
  )
$$;

CREATE OR REPLACE FUNCTION public.internal_require_staff(_roles text[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.has_staff_role(_uid, _roles) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN _uid;
END $$;

CREATE OR REPLACE FUNCTION public.my_roles()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(role::text ORDER BY role::text), ARRAY[]::text[])
  FROM public.user_roles WHERE user_id = auth.uid()
$$;

-- ============ Role management (admin only, any role) ============
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role text, _grant boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _admin uuid := public.internal_require_admin();
BEGIN
  IF _role NOT IN ('admin','moderator','support','finance','reviewer','user') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role::app_role) ON CONFLICT DO NOTHING;
  ELSE
    IF _role = 'admin' THEN
      IF _user_id = _admin THEN RAISE EXCEPTION 'You cannot revoke your own admin access'; END IF;
      IF (SELECT count(*) FROM public.user_roles WHERE role = 'admin'::app_role) <= 1 THEN
        RAISE EXCEPTION 'At least one admin must remain';
      END IF;
    END IF;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role::app_role;
  END IF;
  PERFORM public.internal_audit(CASE WHEN _grant THEN 'role.grant' ELSE 'role.revoke' END,
    'user_role', NULL, _user_id, jsonb_build_object('role', _role));
END $$;

-- ============ Widen existing admin RPCs to the right staff roles ============
CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.internal_require_staff(ARRAY['moderator','support','finance','reviewer']);
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

CREATE OR REPLACE FUNCTION public.admin_adjust_coins(_user_id uuid, _amount integer, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _admin uuid := public.internal_require_staff(ARRAY['finance']);
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

CREATE OR REPLACE FUNCTION public.admin_set_account_status(_user_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _admin uuid := public.internal_require_staff(ARRAY['moderator','support']);
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

CREATE OR REPLACE FUNCTION public.admin_resolve_security_event(_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _admin uuid := public.internal_require_staff(ARRAY['moderator']);
BEGIN
  UPDATE public.security_events SET resolved = true, resolved_by = _admin, resolved_at = now()
  WHERE id = _event_id AND resolved = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found or already resolved'; END IF;
  PERFORM public.internal_audit('security_event.resolve', 'security_event', _event_id);
END $$;

CREATE OR REPLACE FUNCTION public.admin_review_kyc(_kyc_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _admin uuid := public.internal_require_staff(ARRAY['reviewer']); _k record;
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

-- ============ Shared review internals ============
CREATE OR REPLACE FUNCTION public.internal_settle_withdrawal(_withdrawal_id uuid, _approve boolean, _note text, _actor uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _w record;
BEGIN
  SELECT * INTO _w FROM public.withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF _w.status <> 'pending' THEN RAISE EXCEPTION 'Withdrawal already processed'; END IF;
  UPDATE public.withdrawals
    SET status = CASE WHEN _approve THEN 'paid' ELSE 'rejected' END,
        processed_at = now(), reviewed_at = now(), reviewed_by = _actor, admin_note = _note
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

CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_withdrawal_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid := public.internal_require_staff(ARRAY['finance']);
BEGIN
  PERFORM public.internal_settle_withdrawal(_withdrawal_id, _approve, _note, _actor);
END $$;

CREATE OR REPLACE FUNCTION public.internal_settle_survey_claim(_claim_id uuid, _approve boolean, _actor uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c record; _title text;
BEGIN
  SELECT * INTO _c FROM public.survey_claims WHERE id = _claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim not found'; END IF;
  IF _c.status <> 'pending' THEN RAISE EXCEPTION 'Claim already reviewed'; END IF;
  SELECT title INTO _title FROM public.surveys WHERE id = _c.survey_id;
  UPDATE public.survey_claims
    SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
        reviewed_at = now(), reviewed_by = _actor
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

CREATE OR REPLACE FUNCTION public.admin_review_survey_claim(_claim_id uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid := public.internal_require_staff(ARRAY['reviewer','moderator']);
BEGIN
  PERFORM public.internal_settle_survey_claim(_claim_id, _approve, _actor);
END $$;

-- ============ Bulk operations ============
CREATE OR REPLACE FUNCTION public.admin_bulk_review_withdrawals(_ids uuid[], _approve boolean, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid := public.internal_require_staff(ARRAY['finance']);
        _id uuid; _ok int := 0; _fail jsonb := '[]'::jsonb;
BEGIN
  IF _ids IS NULL OR array_length(_ids, 1) IS NULL THEN RAISE EXCEPTION 'Select at least one withdrawal'; END IF;
  IF array_length(_ids, 1) > 500 THEN RAISE EXCEPTION 'Too many items in one batch (max 500)'; END IF;
  FOREACH _id IN ARRAY _ids LOOP
    BEGIN
      PERFORM public.internal_settle_withdrawal(_id, _approve, _note, _actor);
      _ok := _ok + 1;
    EXCEPTION WHEN OTHERS THEN
      _fail := _fail || jsonb_build_object('id', _id, 'error', SQLERRM);
    END;
  END LOOP;
  PERFORM public.internal_audit('withdrawal.bulk_review', 'withdrawal', NULL, NULL,
    jsonb_build_object('approve', _approve, 'requested', array_length(_ids, 1), 'succeeded', _ok, 'failed', jsonb_array_length(_fail)));
  RETURN jsonb_build_object('succeeded', _ok, 'failed', _fail);
END $$;

CREATE OR REPLACE FUNCTION public.admin_bulk_review_survey_claims(_ids uuid[], _approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid := public.internal_require_staff(ARRAY['reviewer','moderator']);
        _id uuid; _ok int := 0; _fail jsonb := '[]'::jsonb;
BEGIN
  IF _ids IS NULL OR array_length(_ids, 1) IS NULL THEN RAISE EXCEPTION 'Select at least one claim'; END IF;
  IF array_length(_ids, 1) > 500 THEN RAISE EXCEPTION 'Too many items in one batch (max 500)'; END IF;
  FOREACH _id IN ARRAY _ids LOOP
    BEGIN
      PERFORM public.internal_settle_survey_claim(_id, _approve, _actor);
      _ok := _ok + 1;
    EXCEPTION WHEN OTHERS THEN
      _fail := _fail || jsonb_build_object('id', _id, 'error', SQLERRM);
    END;
  END LOOP;
  PERFORM public.internal_audit('claim.bulk_review', 'survey_claim', NULL, NULL,
    jsonb_build_object('approve', _approve, 'requested', array_length(_ids, 1), 'succeeded', _ok, 'failed', jsonb_array_length(_fail)));
  RETURN jsonb_build_object('succeeded', _ok, 'failed', _fail);
END $$;

CREATE OR REPLACE FUNCTION public.admin_bulk_adjust_coins(_user_ids uuid[], _amount integer, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid := public.internal_require_staff(ARRAY['finance']);
        _uid uuid; _ok int := 0; _fail jsonb := '[]'::jsonb;
BEGIN
  IF _user_ids IS NULL OR array_length(_user_ids, 1) IS NULL THEN RAISE EXCEPTION 'Select at least one user'; END IF;
  IF array_length(_user_ids, 1) > 500 THEN RAISE EXCEPTION 'Too many users in one batch (max 500)'; END IF;
  IF _amount IS NULL OR _amount = 0 THEN RAISE EXCEPTION 'Amount must not be zero'; END IF;
  IF abs(_amount) > 100000 THEN RAISE EXCEPTION 'Adjustment too large'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  FOREACH _uid IN ARRAY _user_ids LOOP
    BEGIN
      IF _amount < 0 AND public.user_balance(_uid) + _amount < 0 THEN
        RAISE EXCEPTION 'Adjustment would make the balance negative';
      END IF;
      PERFORM public.internal_award_coins(_uid, _amount, 'adjustment', btrim(_reason));
      _ok := _ok + 1;
    EXCEPTION WHEN OTHERS THEN
      _fail := _fail || jsonb_build_object('id', _uid, 'error', SQLERRM);
    END;
  END LOOP;
  PERFORM public.internal_audit('coins.bulk_adjust', 'profile', NULL, NULL,
    jsonb_build_object('amount', _amount, 'reason', btrim(_reason), 'requested', array_length(_user_ids, 1), 'succeeded', _ok, 'failed', jsonb_array_length(_fail)));
  RETURN jsonb_build_object('succeeded', _ok, 'failed', _fail);
END $$;

-- ============ Payout batches ============
CREATE TABLE public.payout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  scheduled_for timestamptz,
  item_count integer NOT NULL DEFAULT 0,
  total_coins integer NOT NULL DEFAULT 0,
  created_by uuid,
  processed_at timestamptz,
  processed_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payout_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.payout_batches(id) ON DELETE CASCADE,
  withdrawal_id uuid NOT NULL REFERENCES public.withdrawals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  coins_amount integer NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, withdrawal_id)
);

CREATE INDEX idx_payout_batch_items_batch ON public.payout_batch_items(batch_id);
CREATE INDEX idx_payout_batches_due ON public.payout_batches(status, scheduled_for);

GRANT SELECT ON public.payout_batches TO authenticated;
GRANT SELECT ON public.payout_batch_items TO authenticated;
GRANT ALL ON public.payout_batches TO service_role;
GRANT ALL ON public.payout_batch_items TO service_role;

ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_batch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance staff view payout batches" ON public.payout_batches
  FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid(), ARRAY['finance']));
CREATE POLICY "Finance staff view payout batch items" ON public.payout_batch_items
  FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid(), ARRAY['finance']));
CREATE POLICY "No client writes on payout_batches" ON public.payout_batches
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (true) WITH CHECK (false);
CREATE POLICY "No client writes on payout_batch_items" ON public.payout_batch_items
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (true) WITH CHECK (false);

CREATE TRIGGER payout_batches_updated_at BEFORE UPDATE ON public.payout_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_create_payout_batch(_withdrawal_ids uuid[], _label text, _scheduled_for timestamptz DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid := public.internal_require_staff(ARRAY['finance']); _batch uuid; _n int; _coins int;
BEGIN
  IF _withdrawal_ids IS NULL OR array_length(_withdrawal_ids, 1) IS NULL THEN RAISE EXCEPTION 'Select at least one withdrawal'; END IF;
  IF array_length(_withdrawal_ids, 1) > 500 THEN RAISE EXCEPTION 'Too many withdrawals in one batch (max 500)'; END IF;
  IF btrim(COALESCE(_label, '')) = '' OR length(_label) > 120 THEN RAISE EXCEPTION 'Give the batch a name'; END IF;

  INSERT INTO public.payout_batches (label, status, scheduled_for, created_by)
  VALUES (btrim(_label), 'scheduled', _scheduled_for, _actor)
  RETURNING id INTO _batch;

  INSERT INTO public.payout_batch_items (batch_id, withdrawal_id, user_id, coins_amount)
  SELECT _batch, w.id, w.user_id, w.coins_amount
  FROM public.withdrawals w
  WHERE w.id = ANY(_withdrawal_ids)
    AND w.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM public.payout_batch_items i
      JOIN public.payout_batches b ON b.id = i.batch_id
      WHERE i.withdrawal_id = w.id AND b.status IN ('scheduled', 'processing')
    );

  SELECT count(*), COALESCE(sum(coins_amount), 0) INTO _n, _coins FROM public.payout_batch_items WHERE batch_id = _batch;
  IF _n = 0 THEN
    DELETE FROM public.payout_batches WHERE id = _batch;
    RAISE EXCEPTION 'None of those withdrawals are pending or they are already in an open batch';
  END IF;
  UPDATE public.payout_batches SET item_count = _n, total_coins = _coins WHERE id = _batch;

  PERFORM public.internal_audit('payout_batch.create', 'payout_batch', _batch, NULL,
    jsonb_build_object('label', btrim(_label), 'items', _n, 'coins', _coins, 'scheduled_for', _scheduled_for));
  RETURN _batch;
END $$;

CREATE OR REPLACE FUNCTION public.internal_run_payout_batch(_batch_id uuid, _actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b record; _it record; _ok int := 0; _bad int := 0;
BEGIN
  SELECT * INTO _b FROM public.payout_batches WHERE id = _batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found'; END IF;
  IF _b.status <> 'scheduled' THEN RAISE EXCEPTION 'Batch is % and cannot be run', _b.status; END IF;
  UPDATE public.payout_batches SET status = 'processing' WHERE id = _batch_id;

  FOR _it IN SELECT * FROM public.payout_batch_items WHERE batch_id = _batch_id AND status = 'queued' LOOP
    BEGIN
      PERFORM public.internal_settle_withdrawal(_it.withdrawal_id, true, 'Paid in batch: ' || _b.label, _actor);
      UPDATE public.payout_batch_items SET status = 'paid', error = NULL WHERE id = _it.id;
      _ok := _ok + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.payout_batch_items SET status = 'failed', error = SQLERRM WHERE id = _it.id;
      _bad := _bad + 1;
    END;
  END LOOP;

  UPDATE public.payout_batches
    SET status = 'completed', processed_at = now(), processed_by = _actor
  WHERE id = _batch_id;

  PERFORM public.internal_audit('payout_batch.run', 'payout_batch', _batch_id, NULL,
    jsonb_build_object('paid', _ok, 'failed', _bad, 'label', _b.label));
  RETURN jsonb_build_object('paid', _ok, 'failed', _bad);
END $$;

CREATE OR REPLACE FUNCTION public.admin_run_payout_batch(_batch_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid := public.internal_require_staff(ARRAY['finance']);
BEGIN
  RETURN public.internal_run_payout_batch(_batch_id, _actor);
END $$;

CREATE OR REPLACE FUNCTION public.admin_cancel_payout_batch(_batch_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _actor uuid := public.internal_require_staff(ARRAY['finance']);
BEGIN
  UPDATE public.payout_batches SET status = 'cancelled' WHERE id = _batch_id AND status = 'scheduled';
  IF NOT FOUND THEN RAISE EXCEPTION 'Only scheduled batches can be cancelled'; END IF;
  UPDATE public.payout_batch_items SET status = 'cancelled' WHERE batch_id = _batch_id AND status = 'queued';
  PERFORM public.internal_audit('payout_batch.cancel', 'payout_batch', _batch_id);
END $$;

CREATE OR REPLACE FUNCTION public.process_due_payout_batches()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b record; _n int := 0;
BEGIN
  FOR _b IN SELECT id, created_by FROM public.payout_batches
            WHERE status = 'scheduled' AND scheduled_for IS NOT NULL AND scheduled_for <= now()
            ORDER BY scheduled_for LOOP
    PERFORM public.internal_run_payout_batch(_b.id, _b.created_by);
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END $$;

-- ============ Tax / earnings reporting ============
CREATE OR REPLACE FUNCTION public.admin_earnings_report(_year integer, _threshold_cents integer DEFAULT 60000)
RETURNS TABLE (
  user_id uuid, display_name text, country text, kyc_status text,
  gross_earned_cents integer, adjustments_cents integer,
  paid_out_cents integer, pending_cents integer, balance_cents integer,
  reportable boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH guard AS (SELECT public.internal_require_staff(ARRAY['finance']) AS actor),
  span AS (
    SELECT make_timestamptz(_year, 1, 1, 0, 0, 0, 'UTC') AS from_ts,
           make_timestamptz(_year + 1, 1, 1, 0, 0, 0, 'UTC') AS to_ts
  ),
  earned AS (
    SELECT t.user_id,
           COALESCE(sum(t.amount) FILTER (WHERE t.amount > 0 AND t.type <> 'adjustment'), 0)::int AS gross,
           COALESCE(sum(t.amount) FILTER (WHERE t.type = 'adjustment'), 0)::int AS adj
    FROM public.coin_transactions t, span s
    WHERE t.created_at >= s.from_ts AND t.created_at < s.to_ts
    GROUP BY t.user_id
  ),
  paid AS (
    SELECT w.user_id,
           COALESCE(sum(w.cash_value_cents) FILTER (WHERE w.status = 'paid'), 0)::int AS paid_cents,
           COALESCE(sum(w.cash_value_cents) FILTER (WHERE w.status = 'pending'), 0)::int AS pending_cents
    FROM public.withdrawals w, span s
    WHERE w.created_at >= s.from_ts AND w.created_at < s.to_ts
    GROUP BY w.user_id
  )
  SELECT p.user_id, p.display_name, p.country, p.kyc_status,
         COALESCE(e.gross, 0), COALESCE(e.adj, 0),
         COALESCE(pd.paid_cents, 0), COALESCE(pd.pending_cents, 0),
         public.user_balance(p.user_id),
         COALESCE(pd.paid_cents, 0) >= GREATEST(_threshold_cents, 0)
  FROM public.profiles p
  CROSS JOIN guard
  LEFT JOIN earned e ON e.user_id = p.user_id
  LEFT JOIN paid pd ON pd.user_id = p.user_id
  WHERE COALESCE(e.gross, 0) > 0 OR COALESCE(pd.paid_cents, 0) > 0 OR COALESCE(pd.pending_cents, 0) > 0
  ORDER BY COALESCE(pd.paid_cents, 0) DESC, COALESCE(e.gross, 0) DESC
$$;

CREATE OR REPLACE FUNCTION public.my_earnings_report(_year integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _from timestamptz; _to timestamptz; _res jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _from := make_timestamptz(_year, 1, 1, 0, 0, 0, 'UTC');
  _to := make_timestamptz(_year + 1, 1, 1, 0, 0, 0, 'UTC');
  SELECT jsonb_build_object(
    'year', _year,
    'gross_earned_cents', COALESCE((SELECT sum(amount) FROM public.coin_transactions
        WHERE user_id = _uid AND amount > 0 AND created_at >= _from AND created_at < _to), 0),
    'paid_out_cents', COALESCE((SELECT sum(cash_value_cents) FROM public.withdrawals
        WHERE user_id = _uid AND status = 'paid' AND created_at >= _from AND created_at < _to), 0),
    'pending_cents', COALESCE((SELECT sum(cash_value_cents) FROM public.withdrawals
        WHERE user_id = _uid AND status = 'pending' AND created_at >= _from AND created_at < _to), 0),
    'balance_cents', public.user_balance(_uid),
    'by_type', COALESCE((SELECT jsonb_object_agg(type, total) FROM (
        SELECT type, sum(amount)::int AS total FROM public.coin_transactions
        WHERE user_id = _uid AND amount > 0 AND created_at >= _from AND created_at < _to
        GROUP BY type) x), '{}'::jsonb)
  ) INTO _res;
  RETURN _res;
END $$;

-- ============ Staff read access ============
CREATE POLICY "Finance staff view withdrawals" ON public.withdrawals
  FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid(), ARRAY['finance']));
CREATE POLICY "Review staff view claims" ON public.survey_claims
  FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid(), ARRAY['reviewer','moderator']));
CREATE POLICY "Review staff view kyc" ON public.kyc_verifications
  FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid(), ARRAY['reviewer']));
CREATE POLICY "Support staff view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid(), ARRAY['support','moderator','finance']));
CREATE POLICY "Moderators view security events" ON public.security_events
  FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid(), ARRAY['moderator']));
CREATE POLICY "Finance staff view transactions" ON public.coin_transactions
  FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid(), ARRAY['finance']));
CREATE POLICY "Staff view roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_staff_role(auth.uid(), ARRAY['support','moderator']));

-- ============ Execute grants ============
REVOKE ALL ON FUNCTION public.has_staff_role(uuid, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_require_staff(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_settle_withdrawal(uuid, boolean, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_settle_survey_claim(uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_run_payout_batch(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_due_payout_batches() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.my_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_earnings_report(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_review_withdrawals(uuid[], boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_review_survey_claims(uuid[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_adjust_coins(uuid[], integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_payout_batch(uuid[], text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_run_payout_batch(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_payout_batch(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_earnings_report(integer, integer) TO authenticated;