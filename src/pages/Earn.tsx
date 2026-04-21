import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Clock, Coins, Wand2 } from "lucide-react";
import { useBackgroundGate } from "@/hooks/useBackgroundGate";

const Earn = () => {
  const { checking } = useBackgroundGate();
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState<Record<string, { score: number; reason: string }>>({});

  useEffect(() => {
    if (checking) return;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      const uid = sess.session.user.id;
      const [s, c, r] = await Promise.all([
        supabase.from("surveys").select("*").not("created_by", "is", null).order("created_at"),
        supabase.from("survey_completions").select("survey_id").eq("user_id", uid),
        supabase.from("survey_recommendations").select("survey_id,score,reason").eq("user_id", uid),
      ]);
      setSurveys(s.data ?? []);
      setDone(new Set((c.data ?? []).map((x) => x.survey_id)));
      const map: Record<string, { score: number; reason: string }> = {};
      (r.data ?? []).forEach((x) => { map[x.survey_id] = { score: x.score, reason: x.reason }; });
      setScores(map);
      setLoading(false);
    })();
  }, [checking]);

  if (checking || loading) return <AppLayout><div className="py-20 text-center text-muted-foreground">Loading...</div></AppLayout>;

  const available = surveys
    .filter((s) => !done.has(s.id))
    .sort((a, b) => (scores[b.id]?.score ?? -1) - (scores[a.id]?.score ?? -1));
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
            <article key={s.id} className={`flex flex-col rounded-2xl border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-glow ${scores[s.id]?.score >= 60 ? "border-primary/40" : "border-border"}`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">{s.category}</span>
                {scores[s.id] && (
                  <span className="flex items-center gap-1 rounded-full bg-gradient-hero px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                    <Wand2 className="h-3 w-3" /> {scores[s.id].score}%
                  </span>
                )}
              </div>
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
