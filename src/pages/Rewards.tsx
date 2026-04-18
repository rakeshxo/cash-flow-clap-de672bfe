import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Coins, Gift } from "lucide-react";
import { toast } from "sonner";
import { awardCoins, coinsToCash, formatCoins, getBalance } from "@/lib/coins";

const Rewards = () => {
  const [rewards, setRewards] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [userId, setUserId] = useState("");
  const [redemptions, setRedemptions] = useState<any[]>([]);

  const refresh = async (uid: string) => {
    const [r, bal, red] = await Promise.all([
      supabase.from("rewards").select("*").order("cost_coins"),
      getBalance(uid),
      supabase.from("redemptions").select("*, rewards(name)").eq("user_id", uid).order("redeemed_at", { ascending: false }),
    ]);
    setRewards(r.data ?? []);
    setBalance(bal);
    setRedemptions(red.data ?? []);
  };

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      setUserId(sess.session.user.id);
      refresh(sess.session.user.id);
    })();
  }, []);

  const redeem = async (reward: any) => {
    if (balance < reward.cost_coins) return toast.error("Not enough coins");
    const { error } = await supabase.from("redemptions").insert({
      user_id: userId, reward_id: reward.id, cost_coins: reward.cost_coins,
    });
    if (error) return toast.error(error.message);
    await awardCoins({
      userId, amount: -reward.cost_coins, type: "redeem",
      description: `Redeemed ${reward.name}`, referenceId: reward.id,
    });
    toast.success(`Redeemed ${reward.name}! Check your email within 24h.`);
    refresh(userId);
  };

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Rewards store</h1>
          <p className="text-muted-foreground">Redeem coins for gift cards & cash.</p>
        </div>
        <div className="rounded-xl bg-gradient-hero px-4 py-3 text-primary-foreground shadow-glow">
          <p className="text-xs opacity-90">Balance</p>
          <p className="font-display text-xl font-bold">{formatCoins(balance)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {rewards.map((r) => {
          const canAfford = balance >= r.cost_coins;
          return (
            <article key={r.id} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-1 hover:shadow-glow">
              <div className="mb-3 flex h-20 items-center justify-center rounded-xl bg-secondary">
                {r.image_url ? (
                  <img src={r.image_url} alt={r.brand} className="h-12 object-contain" loading="lazy" />
                ) : <Gift className="h-8 w-8 text-primary" />}
              </div>
              <h3 className="font-display font-bold text-foreground">{r.name}</h3>
              <p className="text-xs text-muted-foreground">{r.brand}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm font-bold text-primary"><Coins className="h-4 w-4" /> {formatCoins(r.cost_coins)}</span>
                <span className="text-xs text-muted-foreground">{coinsToCash(r.cash_value_cents)}</span>
              </div>
              <Button onClick={() => redeem(r)} disabled={!canAfford} className="mt-4 w-full" size="sm">
                {canAfford ? "Redeem" : `Need ${formatCoins(r.cost_coins - balance)} more`}
              </Button>
            </article>
          );
        })}
      </div>

      {redemptions.length > 0 && (
        <>
          <h2 className="mb-4 mt-12 font-display text-xl font-bold text-foreground">Your redemptions</h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {redemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-border p-4 last:border-0">
                <div>
                  <p className="font-medium text-foreground">{r.rewards?.name ?? "Reward"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.redeemed_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-foreground">-{formatCoins(r.cost_coins)}</p>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-secondary-foreground">{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AppLayout>
  );
};

export default Rewards;
