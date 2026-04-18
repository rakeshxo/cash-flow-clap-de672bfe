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

export async function awardCoins(opts: {
  userId: string;
  amount: number;
  type: CoinTxType;
  description: string;
  referenceId?: string | null;
  notify?: boolean;
}) {
  const { error } = await supabase.from("coin_transactions").insert({
    user_id: opts.userId,
    amount: opts.amount,
    type: opts.type,
    description: opts.description,
    reference_id: opts.referenceId ?? null,
  });
  if (error) throw error;
  if (opts.notify !== false) {
    await supabase.from("notifications").insert({
      user_id: opts.userId,
      title: `+${opts.amount} coins`,
      body: opts.description,
      icon: "coin",
    });
  }
}

export async function getBalance(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("coin_transactions")
    .select("amount")
    .eq("user_id", userId);
  if (error) return 0;
  return (data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
}
