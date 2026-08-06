import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Clock, Coins, Sparkles, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import { useBackgroundGate } from "@/hooks/useBackgroundGate";
import { matchesProfile, hasAnyTargeting, type ProfileLite } from "@/lib/surveyTargeting";
import { Badge } from "@/components/ui/badge";
import Seo from "@/components/Seo";

type ClaimInfo = { survey_id: string; status: string };

const Earn = () => {
  const { checking } = useBackgroundGate();
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [claims, setClaims] = useState<ClaimInfo[]>([]);
  const [profile, setProfile] = useState<ProfileLite | null>(null);

  useEffect(() => {
    if (checking) return;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      const uid = sess.session.user.id;
      const [s, c, cl, p] = await Promise.all([
        supabase.from("surveys").select("*").not("created_by", "is", null).order("created_at"),
        supabase.from("survey_completions").select("survey_id").eq("user_id", uid),
        supabase.from("survey_claims").select("survey_id, status").eq("user_id", uid),
        supabase.from("profiles").select("age_range,gender,country,employment_status,income_range,marital_status,has_kids,education").eq("user_id", uid).maybeSingle(),
      ]);
      setSurveys(s.data ?? []);
      setDone(new Set((c.data ?? []).map((x) => x.survey_id)));
      setClaims((cl.data ?? []) as ClaimInfo[]);
      setProfile(p.data ?? null);
      setLoading(false);
    })();
  }, [checking]);

  if (checking || loading) return <AppLayout>
      <Seo title="Available Paid Surveys — Survey Paradox" description="Browse paid surveys matched to your profile, complete them, and earn coins you can withdraw as real cash." path="/earn" noindex /><div className="py-20 text-center text-muted-foreground">Loading...</div></AppLayout>;

  // Build a map of survey_id -> latest claim status
  const claimMap = new Map<string, string>();
  claims.forEach((cl) => {
    claimMap.set(cl.survey_id, cl.status);
  });

  // Surveys with a claim (approved/rejected/pending) should not appear in available
  const claimed = new Set(claims.map((cl) => cl.survey_id));

  const available = surveys
    .filter((s) => !done.has(s.id) && !claimed.has(s.id) && matchesProfile(s, profile))
    .sort((a, b) => Number(hasAnyTargeting(b)) - Number(hasAnyTargeting(a)));

  const completed = surveys.filter((s) => done.has(s.id));
  const claimedSurveys = surveys.filter((s) => claimed.has(s.id));

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="gap-1 bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="gap-1 bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="gap-1 bg-yellow-500/15 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/20">
            <Clock3 className="h-3 w-3" /> Pending
          </Badge>
        );
    }
  };

  return (
    <AppLayout>
      <h1 className="mb-2 font-display text-3xl font-bold text-foreground">Surveys</h1>
      <p className="mb-8 text-muted-foreground">Share your opinion and earn coins.</p>

      {available.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-muted-foreground">No surveys match your profile right now. Check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {available.map((s) => {
            const targeted = hasAnyTargeting(s);
            return (
              <article key={s.id} className={`flex flex-col rounded-2xl border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-glow ${targeted ? "border-primary/40" : "border-border"}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">{s.category}</span>
                  {targeted && (
                    <span className="flex items-center gap-1 rounded-full bg-gradient-hero px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                      <Sparkles className="h-3 w-3" /> Match
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
            );
          })}
        </div>
      )}

      {claimedSurveys.length > 0 && (
        <>
          <h2 className="mb-4 mt-12 font-display text-xl font-bold text-foreground">Submitted</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {claimedSurveys.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-4">
                <div>
                  <p className="font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(claimMap.get(s.id) ?? "pending")}
                  <span className="font-display font-bold text-primary">+{s.reward_cents}</span>
                </div>
              </div>
            ))}
          </div>
        </>
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
