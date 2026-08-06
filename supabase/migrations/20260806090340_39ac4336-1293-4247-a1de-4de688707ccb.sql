REVOKE ALL ON FUNCTION public.internal_award_coins(uuid, integer, text, text, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.user_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_balance(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_admin_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.strip_screener_answers() FROM PUBLIC, anon, authenticated;