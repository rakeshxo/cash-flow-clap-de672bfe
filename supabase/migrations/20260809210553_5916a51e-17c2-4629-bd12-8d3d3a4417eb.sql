REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.internal_audit(text, text, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_award_coins(uuid, integer, text, text, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_log_security_event(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_rate_limit(uuid, text, integer, interval) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_require_active(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_require_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.user_balance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_offer_activation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_redemption(uuid) FROM PUBLIC, anon, authenticated;