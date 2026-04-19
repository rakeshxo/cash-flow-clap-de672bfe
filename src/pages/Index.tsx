import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Coins, Sparkles, PlayCircle, Wallet, Vote, Flame } from "lucide-react";

const Index = () => {
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-soft font-sans">
      <header className="container mx-auto flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
            <Coins className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">PollPay</span>
        </div>
        <nav className="flex items-center gap-2">
          {hasSession ? (
            <Button asChild variant="default"><Link to="/dashboard">Dashboard</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost"><Link to="/auth">Log in</Link></Button>
              <Button asChild><Link to="/auth">Get started</Link></Button>
            </>
          )}
        </nav>
      </header>

      <main className="container mx-auto px-4">
        <section className="mx-auto max-w-3xl py-20 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            Earn from your opinion
          </div>
          <h1 className="font-display text-5xl font-extrabold tracking-tight text-foreground md:text-6xl">
            Earn coins.{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">Withdraw real cash.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Take surveys and watch videos to earn coins. Cash out directly to PayPal, bank, or crypto once you hit 500 coins.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-8 text-base shadow-glow">
              <Link to="/auth">Start earning free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
              <Link to={hasSession ? "/dashboard" : "/auth"}>Browse surveys</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl grid-cols-2 gap-4 pb-20 md:grid-cols-4">
          {[
            { icon: Sparkles, title: "Surveys", text: "Share opinions" },
            { icon: PlayCircle, title: "Videos", text: "Watch & earn" },
            { icon: Vote, title: "Daily polls", text: "Quick coins daily" },
            { icon: Wallet, title: "Cash out", text: "From 500 coins" },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5 text-center shadow-card transition hover:-translate-y-1 hover:shadow-glow">
              <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground">{f.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} PollPay. Built for honest opinions.
      </footer>
    </div>
  );
};

export default Index;
