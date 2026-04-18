import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Coins, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { awardCoins } from "@/lib/coins";

const Shop = () => {
  const [offers, setOffers] = useState<any[]>([]);
  const [activated, setActivated] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      setUserId(sess.session.user.id);
      const [o, a] = await Promise.all([
        supabase.from("offers").select("*").order("reward_coins", { ascending: false }),
        supabase.from("offer_activations").select("offer_id").eq("user_id", sess.session.user.id),
      ]);
      setOffers(o.data ?? []);
      setActivated(new Set((a.data ?? []).map((x) => x.offer_id)));
    })();
  }, []);

  const activate = async (offer: any) => {
    if (activated.has(offer.id)) return;
    await supabase.from("offer_activations").insert({ user_id: userId, offer_id: offer.id, reward_coins: offer.reward_coins });
    await awardCoins({ userId, amount: offer.reward_coins, type: "offer", description: `Activated ${offer.merchant} offer`, referenceId: offer.id });
    setActivated((s) => new Set(s).add(offer.id));
    toast.success(`Offer activated! +${offer.reward_coins} coins`);
  };

  const categories = ["All", ...Array.from(new Set(offers.map((o) => o.category)))];
  const filtered = filter === "All" ? offers : offers.filter((o) => o.category === filter);

  return (
    <AppLayout>
      <h1 className="mb-2 font-display text-3xl font-bold text-foreground">Cashback shop</h1>
      <p className="mb-6 text-muted-foreground">Activate offers and earn coins on top of cashback.</p>

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              filter === c ? "bg-gradient-hero text-primary-foreground shadow-glow" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((o) => {
          const isActive = activated.has(o.id);
          return (
            <article key={o.id} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-glow">
              <div className="mb-3 flex items-center gap-3">
                {o.logo_url ? (
                  <img src={o.logo_url} alt={o.merchant} className="h-10 w-10 rounded-lg bg-secondary object-contain" loading="lazy" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary font-display font-bold text-foreground">
                    {o.merchant[0]}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-display font-bold text-foreground">{o.merchant}</h3>
                  <p className="text-xs text-muted-foreground">{o.category}</p>
                </div>
                <span className="rounded-full bg-accent/15 px-2 py-1 text-xs font-bold text-accent-foreground">{o.cashback_percent}%</span>
              </div>
              <p className="mb-1 font-medium text-foreground">{o.title}</p>
              <p className="flex-1 text-sm text-muted-foreground">{o.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="flex items-center gap-1 font-display font-bold text-primary"><Coins className="h-4 w-4" /> +{o.reward_coins}</span>
                {isActive ? (
                  <span className="flex items-center gap-1 text-sm text-primary"><CheckCircle2 className="h-4 w-4" /> Activated</span>
                ) : (
                  <Button size="sm" onClick={() => activate(o)}>
                    Activate <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default Shop;
