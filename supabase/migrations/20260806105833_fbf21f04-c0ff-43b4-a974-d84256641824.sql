-- 1) Balance helper: internal only (prevents reading other users' balances)
REVOKE ALL ON FUNCTION public.user_balance(uuid) FROM PUBLIC, anon, authenticated;

-- 2) Unused reward/offer RPCs: not exposed to clients
REVOKE ALL ON FUNCTION public.request_redemption(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_offer_activation(uuid) FROM PUBLIC, anon, authenticated;

-- 3) Explicitly confirm no client write path to these tables (server-side only)
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM anon, authenticated;
GRANT SELECT, UPDATE (read) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

REVOKE INSERT, UPDATE, DELETE ON public.offer_activations FROM anon, authenticated;
GRANT SELECT ON public.offer_activations TO authenticated;
GRANT ALL ON public.offer_activations TO service_role;

REVOKE INSERT, DELETE ON public.redemptions FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.redemptions TO authenticated;
GRANT ALL ON public.redemptions TO service_role;

-- Deny-insert guardrails so intent is enforced by policy as well as grants
DROP POLICY IF EXISTS "No client inserts on notifications" ON public.notifications;
CREATE POLICY "No client inserts on notifications" ON public.notifications
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "No client inserts on offer_activations" ON public.offer_activations;
CREATE POLICY "No client inserts on offer_activations" ON public.offer_activations
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "No client inserts on redemptions" ON public.redemptions;
CREATE POLICY "No client inserts on redemptions" ON public.redemptions
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);