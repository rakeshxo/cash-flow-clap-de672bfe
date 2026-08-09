-- Explicitly deny direct client inserts; these tables are written only by SECURITY DEFINER RPCs.
CREATE POLICY "No client inserts on coin_transactions"
  ON public.coin_transactions AS RESTRICTIVE FOR INSERT
  TO anon, authenticated WITH CHECK (false);

CREATE POLICY "No client inserts on survey_claims"
  ON public.survey_claims AS RESTRICTIVE FOR INSERT
  TO anon, authenticated WITH CHECK (false);

CREATE POLICY "No client inserts on withdrawals"
  ON public.withdrawals AS RESTRICTIVE FOR INSERT
  TO anon, authenticated WITH CHECK (false);

CREATE POLICY "No client inserts on video_watches"
  ON public.video_watches AS RESTRICTIVE FOR INSERT
  TO anon, authenticated WITH CHECK (false);

CREATE POLICY "No client inserts on poll_votes"
  ON public.poll_votes AS RESTRICTIVE FOR INSERT
  TO anon, authenticated WITH CHECK (false);