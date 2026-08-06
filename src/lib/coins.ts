import { supabase } from "@/integrations/supabase/client";

export const coinsToCash = (coins: number) => `$${(coins / 100).toFixed(2)}`;
export const formatCoins = (n: number) => n.toLocaleString();

export type CoinTxType =
  | "survey"
  | "video"
  | "offer"
  | "poll"
  | "referral"
  | "streak"
  | "redeem"
  | "bonus";

// NOTE: Coins can only be issued by trusted server-side database functions.
// The client never writes to coin_transactions directly.

export async function getBalance(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("coin_transactions")
    .select("amount")
    .eq("user_id", userId);
  if (error) return 0;
  return (data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
}
