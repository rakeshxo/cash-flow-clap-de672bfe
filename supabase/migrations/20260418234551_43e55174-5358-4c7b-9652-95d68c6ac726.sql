-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID,
  ADD COLUMN IF NOT EXISTS daily_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- Backfill referral codes
UPDATE public.profiles SET referral_code = substr(md5(user_id::text), 1, 8) WHERE referral_code IS NULL;

-- Update handle_new_user to also set referral_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    substr(md5(NEW.id::text || clock_timestamp()::text), 1, 8)
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Coin transactions (ledger)
CREATE TABLE public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transactions" ON public.coin_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_coin_tx_user ON public.coin_transactions(user_id, created_at DESC);

-- Videos
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 30,
  reward_coins INTEGER NOT NULL DEFAULT 5,
  category TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Videos viewable by everyone" ON public.videos FOR SELECT USING (true);

CREATE TABLE public.video_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.video_watches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own watches" ON public.video_watches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own watches" ON public.video_watches FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Offers (cashback shop)
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  cashback_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Shopping',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Offers viewable by everyone" ON public.offers FOR SELECT USING (true);

CREATE TABLE public.offer_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.offer_activations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own activations" ON public.offer_activations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own activations" ON public.offer_activations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rewards store
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  cost_coins INTEGER NOT NULL,
  cash_value_cents INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'Gift Card',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rewards viewable by everyone" ON public.rewards FOR SELECT USING (true);

CREATE TABLE public.redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  cost_coins INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own redemptions" ON public.redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own redemptions" ON public.redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily Poll
CREATE TABLE public.daily_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_date DATE NOT NULL UNIQUE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  reward_coins INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Polls viewable by everyone" ON public.daily_polls FOR SELECT USING (true);

CREATE TABLE public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  poll_id UUID NOT NULL REFERENCES public.daily_polls(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, poll_id)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own votes" ON public.poll_votes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own votes" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Referrals
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL UNIQUE,
  bonus_paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view referrals where they are involved" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Users insert referrals where they are referred" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referred_id);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'coin',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Public leaderboard view of weekly earnings (aggregated, no PII)
CREATE OR REPLACE VIEW public.weekly_leaderboard
WITH (security_invoker = true) AS
SELECT
  p.user_id,
  COALESCE(p.display_name, 'Anonymous') AS display_name,
  p.avatar_url,
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.amount > 0 AND ct.created_at > now() - interval '7 days'), 0)::int AS coins_earned
FROM public.profiles p
LEFT JOIN public.coin_transactions ct ON ct.user_id = p.user_id
GROUP BY p.user_id, p.display_name, p.avatar_url
ORDER BY coins_earned DESC
LIMIT 25;

-- Allow public read on profiles for leaderboard names (no email exposed)
CREATE POLICY "Profiles display info viewable by all authed" ON public.profiles FOR SELECT TO authenticated USING (true);