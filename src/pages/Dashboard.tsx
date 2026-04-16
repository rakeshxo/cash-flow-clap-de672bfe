import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Coins, Clock, LogOut, Wallet } from "lucide-react";
import { toast } from "sonner";

type Survey = {
  id: string;
  title: string;
  description: string;
  reward_cents: number;
  estimated_minutes: number;
  category: string;
};

const formatCash = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [balanceCents, setBalanceCents] = useState(0);
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate("/auth", { replace: true });
        return;
      }
      const userId = data.session.user.id;

      const [{ data: surveysData }, { data: completionsData }, { data: profile }] = await Promise.all([
        supabase.from("surveys").select("id,title,description,reward_cents,estimated_minutes,category").order("created_at"),
        supabase.from("survey_completions").select("survey_id,reward_cents").eq("user_id", userId),
        supabase.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
      ]);

      setSurveys(surveysData ?? []);
      const ids = new Set((completionsData ?? []).map((c) => c.survey_id));
      setCompletedIds(ids);
      setBalanceCents((completionsData ?? []).reduce((s, c) => s + (c.reward_cents ?? 0), 0));
      setName(profile?.display_name ?? data.session.user.email?.split("@")[0] ?? "there");
      setLoading(false);
    });
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/");
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gradient-soft text-muted-foreground">Loading...</div>;
  }

  const available = surveys.filter((s) => !completedIds.has(s.id));
  const done = surveys.filter((s) => completedIds.has(s.id));

  return (
    <div className="min-h-screen bg-gradient-soft font-sans">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
              <Coins className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">PollPay</span>
          </Link>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="font-display text-3xl font-bold text-foreground capitalize">{name}</h1>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-hero px-6 py-4 text-primary-foreground shadow-glow">
            <Wallet className="h-6 w-6" />
            <div>
              <p className="text-xs opacity-90">Your balance</p>
              <p className="font-display text-2xl font-bold">{formatCash(balanceCents)}</p>
            </div>
          </div>
        </div>

        <h2 className="font-display mb-4 text-xl font-bold text-foreground">Available surveys</h2>
        {available.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
            You completed everything! Check back soon for new surveys.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {available.map((s) => (
              <article key={s.id} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-glow">
                <span className="mb-3 w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">{s.category}</span>
                <h3 className="font-display text-lg font-bold text-foreground">{s.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{s.description}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-4 w-4" /> {s.estimated_minutes} min</span>
                  <span className="font-display font-bold text-primary">{formatCash(s.reward_cents)}</span>
                </div>
                <Button asChild className="mt-4 w-full"><Link to={`/survey/${s.id}`}>Take survey</Link></Button>
              </article>
            ))}
          </div>
        )}

        {done.length > 0 && (
          <>
            <h2 className="font-display mb-4 mt-12 text-xl font-bold text-foreground">Completed</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {done.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-4">
                  <div>
                    <p className="font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.category}</p>
                  </div>
                  <span className="font-display font-bold text-primary">+{formatCash(s.reward_cents)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
