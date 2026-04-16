import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Coins, Clock, Sparkles } from "lucide-react";

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
            Get paid to take{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">quick surveys</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Share your opinion in minutes, earn real cash rewards. No hassle, no spam — just simple surveys.
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

        <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 pb-20 md:grid-cols-3">
          {[
            { icon: CheckCircle2, title: "Easy login", text: "Sign up with email in seconds. No verification headaches." },
            { icon: Clock, title: "Quick surveys", text: "Most take under 5 minutes. Do them on your break." },
            { icon: Coins, title: "Real rewards", text: "Every completed survey adds cash to your balance." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-glow">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
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
