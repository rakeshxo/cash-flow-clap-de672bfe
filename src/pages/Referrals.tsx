import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Users, Copy, Coins } from "lucide-react";
import { toast } from "sonner";
import { formatCoins } from "@/lib/coins";

const REFERRAL_BONUS = 250;

const Referrals = () => {
  const [code, setCode] = useState("");
  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      const uid = sess.session.user.id;
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("referral_code").eq("user_id", uid).maybeSingle(),
        supabase.from("referrals").select("*, referred:profiles!referrals_referred_id_fkey(display_name)").eq("referrer_id", uid),
      ]);
      setCode(p.data?.referral_code ?? "");
      setReferrals(r.data ?? []);
    })();
  }, []);

  const link = `${window.location.origin}/auth?ref=${code}`;
  const copy = () => {
    navigator.clipboard.writeText(link);
    toast.success("Link copied!");
  };

  return (
    <AppLayout>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
          <Users className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Refer friends, earn coins</h1>
          <p className="text-muted-foreground">Get {formatCoins(REFERRAL_BONUS)} coins for every friend who signs up.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Your referral link</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input readOnly value={link} className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm" />
          <Button onClick={copy}><Copy className="mr-2 h-4 w-4" /> Copy</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Your code: <span className="font-mono font-bold text-foreground">{code}</span></p>
      </div>

      <h2 className="mb-4 mt-10 font-display text-xl font-bold text-foreground">Your referrals ({referrals.length})</h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {referrals.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">Share your link to start earning bonuses.</p>
        ) : referrals.map((r) => (
          <div key={r.id} className="flex items-center justify-between border-b border-border p-4 last:border-0">
            <div>
              <p className="font-medium text-foreground capitalize">{r.referred?.display_name ?? "New friend"}</p>
              <p className="text-xs text-muted-foreground">Joined {new Date(r.created_at).toLocaleDateString()}</p>
            </div>
            <span className="flex items-center gap-1 font-display font-bold text-primary">
              <Coins className="h-4 w-4" /> +{formatCoins(REFERRAL_BONUS)}
            </span>
          </div>
        ))}
      </div>
    </AppLayout>
  );
};

export default Referrals;
