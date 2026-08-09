import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { KycPanel } from "@/components/KycPanel";
import { DeviceList } from "@/components/DeviceList";
import { EarningsReport } from "@/components/EarningsReport";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { coinsToCash, formatCoins } from "@/lib/coins";
import { Coins } from "lucide-react";
import Seo from "@/components/Seo";

const Profile = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [streak, setStreak] = useState(0);
  const [tx, setTx] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [uid, setUid] = useState("");

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      const u = sess.session.user;
      setUid(u.id);
      setEmail(u.email ?? "");
      const [p, t] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", u.id).maybeSingle(),
        supabase.from("coin_transactions").select("*").eq("user_id", u.id).order("created_at", { ascending: false }).limit(50),
      ]);
      setName(p.data?.display_name ?? "");
      setAvatar(p.data?.avatar_url ?? "");
      setStreak(p.data?.daily_streak ?? 0);
      setTx(t.data ?? []);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: name, avatar_url: avatar }).eq("user_id", uid);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  const totalEarned = tx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalSpent = -tx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);

  return (
    <AppLayout>
      <Seo title="Your Profile — Survey Paradox" description="Manage your Survey Paradox account details and background profile to get better matched surveys." path="/profile" noindex />
      <h1 className="mb-8 font-display text-3xl font-bold text-foreground">Profile</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-hero text-2xl font-display font-bold text-primary-foreground">
              {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : (name?.[0]?.toUpperCase() ?? "?")}
            </div>
            <div>
              <p className="font-display text-lg font-bold text-foreground capitalize">{name}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL (optional)</Label>
              <Input id="avatar" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
            </div>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>

        <div className="space-y-4">
          <Stat label="Total earned" value={`${formatCoins(totalEarned)} coins`} sub={coinsToCash(totalEarned)} />
          <Stat label="Total redeemed" value={`${formatCoins(totalSpent)} coins`} sub={coinsToCash(totalSpent)} />
          <Stat label="Login streak" value={`${streak} days`} sub="Keep it going!" />
        </div>
      </div>

      <h2 className="mb-4 mt-10 font-display text-xl font-bold text-foreground">Identity verification</h2>
      <KycPanel />

      <h2 className="mb-4 mt-10 font-display text-xl font-bold text-foreground">Earnings & tax summary</h2>
      <EarningsReport />

      <h2 className="mb-4 mt-10 font-display text-xl font-bold text-foreground">Your devices</h2>
      <DeviceList />


      <h2 className="mb-4 mt-10 font-display text-xl font-bold text-foreground">Recent transactions</h2>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {tx.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No transactions yet.</p>
        ) : tx.map((t) => (
          <div key={t.id} className="flex items-center justify-between border-b border-border p-4 last:border-0">
            <div>
              <p className="font-medium text-foreground">{t.description}</p>
              <p className="text-xs text-muted-foreground capitalize">{t.type} · {new Date(t.created_at).toLocaleString()}</p>
            </div>
            <span className={`flex items-center gap-1 font-display font-bold ${t.amount > 0 ? "text-primary" : "text-destructive"}`}>
              <Coins className="h-4 w-4" /> {t.amount > 0 ? "+" : ""}{t.amount}
            </span>
          </div>
        ))}
      </div>
    </AppLayout>
  );
};

const Stat = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 font-display text-xl font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{sub}</p>
  </div>
);

export default Profile;
