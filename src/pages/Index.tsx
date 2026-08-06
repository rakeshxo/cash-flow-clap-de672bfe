import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, PlayCircle, Wallet, Vote, Zap } from "lucide-react";
import Seo, { SITE_URL } from "@/components/Seo";
import logo from "@/assets/logo.png";

const Index = () => {
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden font-sans">
      <Seo
        title="Survey Paradox — Earn Cash Completing Surveys"
        description="Take quick paid surveys, watch videos, and answer daily polls to earn coins on Survey Paradox. Cash out to PayPal, bank, or crypto from 500 coins."
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Survey Paradox",
            url: SITE_URL,
            logo: `${SITE_URL}/og-image.jpg`,
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Survey Paradox",
            url: SITE_URL,
          },
        ]}
      />
      {/* Ambient neon orbs */}
      <div aria-hidden className="pointer-events-none absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-1/3 -right-40 h-[32rem] w-[32rem] rounded-full bg-accent/20 blur-3xl" />

      <header className="container relative z-10 mx-auto flex items-center justify-between py-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-primary/40 bg-background shadow-neon transition group-hover:shadow-glow">
            <img src={logo} alt="Survey Paradox" className="h-8 w-8 object-contain" width={32} height={32} />
          </span>
          <span className="font-display text-xl font-bold tracking-wider text-foreground">
            SURVEY <span className="text-gradient-neon">PARADOX</span>
          </span>
        </Link>
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

      <main className="container relative z-10 mx-auto px-4">
        <section className="mx-auto max-w-3xl py-20 text-center animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/60 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-primary shadow-neon backdrop-blur">
            <Zap className="h-3.5 w-3.5" />
            Enter the paradox · Earn from your opinion
          </div>
          <h1 className="font-display text-5xl font-extrabold uppercase tracking-tight text-foreground md:text-7xl">
            Earn coins.
            <br />
            <span className="text-gradient-neon">Withdraw real cash.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Take surveys and watch videos to earn coins in the neon underground. Cash out directly to PayPal, bank, or crypto once you hit 500 coins.
          </p>
          <div className="mt-9 flex justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-8 text-base animate-pulse-glow">
              <Link to="/auth">Start earning free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
              <Link to={hasSession ? "/dashboard" : "/auth"}>Browse surveys</Link>
            </Button>
          </div>
        </section>

        <div className="neon-divider mx-auto max-w-5xl" />

        <section className="mx-auto max-w-5xl py-16">
          <h2 className="mb-8 text-center font-display text-2xl font-bold uppercase tracking-wider text-foreground">Ways to earn</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: Sparkles, title: "Surveys", text: "Share opinions" },
            { icon: PlayCircle, title: "Videos", text: "Watch & earn" },
            { icon: Vote, title: "Daily polls", text: "Quick coins daily" },
            { icon: Wallet, title: "Cash out", text: "From 500 coins" },
          ].map((f, i) => (
            <div
              key={f.title}
              className="glow-card rounded-xl border border-border bg-card/70 p-5 text-center shadow-card backdrop-blur animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-primary/40 bg-background/60 shadow-neon">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-base font-bold uppercase tracking-wider text-foreground">{f.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{f.text}</p>
            </div>
          ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-6 text-center text-xs uppercase tracking-widest text-muted-foreground">
        <Link to="/get-paid-to-watch-videos" className="text-primary hover:underline">Get paid to watch videos</Link>
        <div className="mt-2">© {new Date().getFullYear()} Survey Paradox · Built for honest opinions</div>
      </footer>
    </div>
  );
};

export default Index;
