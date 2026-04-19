CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  coins_amount integer NOT NULL,
  cash_value_cents integer NOT NULL,
  method text NOT NULL,
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all withdrawals" ON public.withdrawals FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update withdrawals" ON public.withdrawals FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));