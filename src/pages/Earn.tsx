import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Clock, Coins } from "lucide-react";

const Earn = () => {
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      const [s, c] = await Promise.all([
        supabase.from("surveys").select("*").order("created_at"),
        supabase.from("survey_completions").select("survey_id").eq("user_id", sess.session.user.id),
      ]);
      setSurveys(s.data ?? []);
      setDone(new Set((c.data ?? []).map((x) => x.survey_id)));
      setLoading(false);
    })();
  }, []);

  if (loading) return <AppLayout><div className="py-20 text-center text-muted-foreground">Loading...</div></AppLayout>;

  const available = surveys.filter((s) => !done.has(s.id));
  const completed = surveys.filter((s) => done.has(s.id));

  return (
    <AppLayout>
      <h1 className="mb-2 font-display text-3xl font-bold text-foreground">Surveys</h1>
      <p className="mb-8 text-muted-foreground">Share your opinion and earn coins.</p>

      {available.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-muted-foreground">All caught up! Check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {available.map((s) => (
            <article key={s.id} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-glow">
              <span className="mb-3 w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">{s.category}</span>
              <h3 className="font-display text-lg font-bold text-foreground">{s.title}</h3>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{s.description}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-4 w-4" /> {s.estimated_minutes} min</span>
                <span className="flex items-center gap-1 font-display font-bold text-primary"><Coins className="h-4 w-4" /> {s.reward_cents}</span>
              </div>
              <Button asChild className="mt-4 w-full"><Link to={`/survey/${s.id}`}>Take survey</Link></Button>
            </article>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <>
          <h2 className="mb-4 mt-12 font-display text-xl font-bold text-foreground">Completed</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {completed.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-4">
                <div>
                  <p className="font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.category}</p>
                </div>
                <span className="font-display font-bold text-primary">+{s.reward_cents}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </AppLayout>
  );
};

export default Earn;
