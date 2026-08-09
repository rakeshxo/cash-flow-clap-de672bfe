import { Link } from "react-router-dom";
import { PlayCircle, Coins, Wallet, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Seo from "@/components/Seo";
import logo from "@/assets/logo.png";

const steps = [
  { icon: PlayCircle, title: "Watch short videos", text: "Pick from a rotating list of short ad and entertainment clips. Each one is timed, so you only need to watch it through." },
  { icon: Coins, title: "Earn coins instantly", text: "Coins land in your balance the moment a video finishes. 100 coins equals $1, so progress is easy to track." },
  { icon: Wallet, title: "Withdraw real cash", text: "Once you reach 500 coins ($5) you can cash out to PayPal, your bank account, or crypto." },
];

const GetPaidToWatchVideos = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Get Paid to Watch Videos — Survey Paradox"
        description="Get paid to watch videos online. Earn coins for every clip you finish on Survey Paradox and withdraw real cash to PayPal, bank, or crypto from 500 coins."
        path="/get-paid-to-watch-videos"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How do you get paid to watch videos on Survey Paradox?",
              acceptedAnswer: { "@type": "Answer", text: "Create a free account, open the Videos page, and watch short clips. Coins are credited when each video finishes." },
            },
            {
              "@type": "Question",
              name: "How much can you earn watching videos?",
              acceptedAnswer: { "@type": "Answer", text: "Each video pays a set number of coins. 100 coins equals $1, and you can withdraw once you reach 500 coins." },
            },
            {
              "@type": "Question",
              name: "How do payouts work?",
              acceptedAnswer: { "@type": "Answer", text: "Withdrawals are available from 500 coins and can be sent to PayPal, a bank account, or a crypto wallet." },
            },
          ],
        }}
      />

      <header className="container mx-auto flex items-center justify-between py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="" className="h-8 w-8 object-contain" width={32} height={32} />
          <span className="font-display text-xl font-bold tracking-wider text-foreground">
            SURVEY <span className="text-gradient-neon">PARADOX</span>
          </span>
        </Link>
        <Button asChild><Link to="/auth">Get started</Link></Button>
      </header>

      <main className="container mx-auto px-4 pb-20">
        <section className="mx-auto max-w-3xl py-16 text-center">
          <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-foreground md:text-6xl">
            Get paid to <span className="text-gradient-neon">watch videos</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Turn spare minutes into real money. Survey Paradox pays you coins for every short video you finish, and those coins convert straight into cash.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-8 text-base"><Link to="/auth">Start watching free</Link></Button>
          </div>
        </section>

        <section className="mx-auto max-w-4xl py-8">
          <h2 className="mb-6 text-center font-display text-2xl font-bold uppercase tracking-wider text-foreground">How it works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.title} className="glow-card rounded-xl border border-border bg-card/70 p-6 shadow-card backdrop-blur">
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-primary/40 bg-background/60 shadow-neon">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl py-10">
          <h2 className="mb-4 font-display text-2xl font-bold uppercase tracking-wider text-foreground">What your coins are worth</h2>
          <p className="text-muted-foreground">
            Every 100 coins equals $1. There are no points to convert twice and no expiring balances — the number you see in your dashboard is the number you cash out. Withdrawals unlock at 500 coins and can be sent to PayPal, a bank transfer, or a crypto wallet.
          </p>
          <h2 className="mb-4 mt-10 font-display text-2xl font-bold uppercase tracking-wider text-foreground">Why members stay</h2>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> Coins are credited server-side, so your balance can't be lost mid-video.</li>
            <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> No minimum watch quota or subscription — watch as much or as little as you like.</li>
            <li className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> Videos sit alongside paid surveys and daily polls, so you can stack earnings.</li>
          </ul>
          <div className="mt-10 rounded-xl border border-primary/40 bg-card/70 p-8 text-center shadow-neon">
            <h2 className="font-display text-xl font-bold uppercase tracking-wider text-foreground">Ready to start earning?</h2>
            <p className="mt-2 text-muted-foreground">Signing up is free and takes under a minute.</p>
            <Button asChild size="lg" className="mt-5 h-12 px-8 text-base"><Link to="/auth">Create your free account</Link></Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs uppercase tracking-widest text-muted-foreground">
        © {new Date().getFullYear()} Survey Paradox
      </footer>
    </div>
  );
};

export default GetPaidToWatchVideos;
