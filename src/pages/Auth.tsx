import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Coins } from "lucide-react";
import { awardCoins } from "@/lib/coins";
import logo from "@/assets/logo.png";

const REFERRAL_BONUS = 250;

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const refCode = params.get("ref") ?? "";
  const [mode, setMode] = useState<"signin" | "signup">(refCode ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard", { replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate("/dashboard", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleReferral = async (newUserId: string) => {
    if (!refCode) return;
    const { data: referrer } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("referral_code", refCode)
      .maybeSingle();
    if (!referrer || referrer.user_id === newUserId) return;
    await supabase.from("profiles").update({ referred_by: referrer.user_id }).eq("user_id", newUserId);
    await supabase.from("referrals").insert({
      referrer_id: referrer.user_id,
      referred_id: newUserId,
      bonus_paid: true,
    });
    // Bonuses for both
    await awardCoins({
      userId: referrer.user_id,
      amount: REFERRAL_BONUS,
      type: "referral",
      description: "Friend joined via your link",
    });
    await awardCoins({
      userId: newUserId,
      amount: 100,
      type: "bonus",
      description: "Welcome bonus from referral",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        if (data.user) await handleReferral(data.user.id);
        toast.success("Account created! You're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 font-sans">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full bg-accent/15 blur-3xl" />
      <div className="relative w-full max-w-md animate-fade-in">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-primary/40 bg-background shadow-neon">
            <img src={logo} alt="Survey Paradox" className="h-8 w-8 object-contain" />
          </span>
          <span className="font-display text-xl font-bold tracking-wider text-foreground">
            SURVEY <span className="text-gradient-neon">PARADOX</span>
          </span>
        </Link>

        <div className="glass-panel rounded-xl p-8 shadow-card border-neon">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Log in to keep earning." : "Start earning in under a minute."}
          </p>

          {refCode && mode === "signup" && (
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
              🎁 Invited by a friend! You'll get <span className="font-bold text-primary">100 bonus coins</span> when you sign up.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
            </div>
            <Button type="submit" className="h-11 w-full text-base shadow-glow" disabled={loading}>
              {loading ? "Please wait..." : mode === "signin" ? "Log in" : "Create account"}
            </Button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
