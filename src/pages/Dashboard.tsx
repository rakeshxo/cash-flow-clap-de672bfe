import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles, PlayCircle, Wallet, Flame, Target, Vote } from "lucide-react";
import { coinsToCash, formatCoins, getBalance } from "@/lib/coins";
import { toast } from "sonner";
import { useBackgroundGate } from "@/hooks/useBackgroundGate";
import { matchesProfile, type ProfileLite } from "@/lib/surveyTargeting";

const DAILY_GOAL = 50;

const Dashboard = () => {
  const { checking } = useBackgroundGate();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState(0);
  const [todayCoins, setTodayCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [poll, setPoll] = useState<any>(null);
  const [pollVoted, setPollVoted] = useState(false);
  const [surveyCount, setSurveyCount] = useState(0);
  const [videoCount, setVideoCount] = useState(0);
  const [recommended, setRecommended] = useState<any[]>([]);

  useEffect(() => {
    if (checking) return;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      const uid = sess.session.user.id;

      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      const [profileR, txR, todayR, pollR, surveysR, videosR, doneR, claimsR] = await Promise.all([
        supabase.from("profiles").select("display_name,daily_streak,last_active_date,age_range,gender,country,employment_status,income_range,marital_status,has_kids,education").eq("user_id", uid).maybeSingle(),
        supabase.from("coin_transactions").select("amount").eq("user_id", uid),
        supabase.from("coin_transactions").select("amount").eq("user_id", uid).gte("created_at", start),
        supabase.from("daily_polls").select("*").eq("poll_date", today.toISOString().slice(0, 10)).maybeSingle(),
        supabase.from("surveys").select("id,title,description,category,reward_cents,estimated_minutes,target_age_ranges,target_genders,target_countries,target_employment_statuses,target_marital_statuses,target_education,target_income_ranges,target_has_kids").not("created_by", "is", null),
        supabase.from("videos").select("id"),
        supabase.from("survey_completions").select("survey_id").eq("user_id", uid),
        supabase.from("survey_claims").select("survey_id").eq("user_id", uid),
      ]);

      const profile = profileR.data as (ProfileLite & { display_name?: string | null; daily_streak?: number; last_active_date?: string | null }) | null;
      const bal = (txR.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      const todayBal = (todayR.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);

      // Streak is computed & rewarded server-side (trusted)
      const { data: streakRes } = await supabase.rpc("claim_daily_streak");
      const sr = (streakRes ?? {}) as { streak?: number; coins?: number };
      setStreak(sr.streak ?? profile?.daily_streak ?? 0);
      if ((sr.coins ?? 0) > 0) {
        toast.success(`🔥 ${sr.streak}-day streak! +${sr.coins} coins`);
      }

      setName(profile?.display_name ?? sess.session.user.email?.split("@")[0] ?? "there");
      setBalance(await getBalance(uid));
      setTodayCoins(todayBal);
      setPoll(pollR.data);

      const allSurveys = surveysR.data ?? [];
      const doneIds = new Set((doneR.data ?? []).map((x: any) => x.survey_id));
      const claimedIds = new Set((claimsR.data ?? []).map((x: any) => x.survey_id));

      // Filter by demographic targeting and exclude completed + claimed
      const matched = allSurveys.filter((s: any) => !doneIds.has(s.id) && !claimedIds.has(s.id) && matchesProfile(s, profile));
      setSurveyCount(matched.length);
      setRecommended(matched.slice(0, 6));

      setVideoCount(videosR.data?.length ?? 0);

      if (pollR.data) {
        const v = await supabase.from("poll_votes").select("id").eq("user_id", uid).eq("poll_id", pollR.data.id).maybeSingle();
        setPollVoted(!!v.data);
      }
      setLoading(false);
    })();
  }, [checking]);

  const votePoll = async (idx: number) => {
    if (!poll) return;
    const { data: coins, error } = await supabase.rpc("vote_daily_poll", { _poll_id: poll.id, _option_index: idx });
    if (error) return toast.error(error.message);
    const earned = coins ?? 0;
    setPollVoted(true);
    setBalance((b) => b + earned);
    setTodayCoins((c) => c + earned);
    toast.success(`+${earned} coins`);
  };

  if (checking || loading) return <AppLayout><div className="py-20 text-center text-muted-foreground">Loading...</div></AppLayout>;

  const goalPct = Math.min(100, Math.round((todayCoins / DAILY_GOAL) * 100));

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold text-foreground">User dashboard</h1>
        <p className="text-sm capitalize text-muted-foreground">Welcome back, {name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-glow">
          <div className="mb-2 flex items-center gap-2 opacity-90"><Coins className="h-4 w-4" /> Total balance</div>
          <p className="font-display text-3xl font-bold">{formatCoins(balance)}</p>
          <p className="text-sm opacity-90">{coinsToCash(balance)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground"><Target className="h-4 w-4" /> Daily goal</div>
          <p className="font-display text-2xl font-bold text-foreground">{todayCoins} <span className="text-base text-muted-foreground">/ {DAILY_GOAL}</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-gradient-hero transition-all" style={{ width: `${goalPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{goalPct === 100 ? "Goal reached! 🎉" : `${DAILY_GOAL - todayCoins} coins to go`}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground"><Flame className="h-4 w-4 text-accent" /> Login streak</div>
          <p className="font-display text-3xl font-bold text-foreground">{streak} <span className="text-base text-muted-foreground">days</span></p>
          <p className="mt-2 text-xs text-muted-foreground">Come back daily to keep it growing.</p>
        </div>
      </div>

      {poll && (
        <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground"><Vote className="h-4 w-4" /> Daily poll · +{poll.reward_coins} coins</div>
          <h2 className="font-display text-xl font-bold text-foreground">{poll.question}</h2>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(poll.options as string[]).map((opt, i) => (
              <Button key={i} variant={pollVoted ? "secondary" : "outline"} disabled={pollVoted} onClick={() => votePoll(i)} className="justify-start">
                {opt}
              </Button>
            ))}
          </div>
          {pollVoted && <p className="mt-3 text-sm text-primary">Thanks for voting! Come back tomorrow.</p>}
        </section>
      )}

      {recommended.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
              <Sparkles className="h-5 w-5 text-primary" /> Recommended for you
            </h2>
            <span className="text-xs text-muted-foreground">Matched to your background</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommended.map((s) => (
              <Link key={s.id} to={`/survey/${s.id}`} className="group flex flex-col rounded-2xl border border-primary/30 bg-card p-5 shadow-card transition hover:-translate-y-1 hover:shadow-glow">
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{s.category}</span>
                  <span className="rounded-full bg-gradient-hero px-2.5 py-0.5 text-xs font-bold text-primary-foreground">Match</span>
                </div>
                <h3 className="font-display text-base font-bold text-foreground">{s.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-xs text-muted-foreground">{s.estimated_minutes} min</span>
                  <span className="flex items-center gap-1 font-display font-bold text-primary"><Coins className="h-3.5 w-3.5" /> {s.reward_cents}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <h2 className="mb-4 mt-10 font-display text-xl font-bold text-foreground">Ways to earn</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <EarnCard to="/earn" icon={Sparkles} title="Surveys" count={surveyCount} hint="Share your opinion" />
        <EarnCard to="/videos" icon={PlayCircle} title="Videos" count={videoCount} hint="Watch & earn" />
        <EarnCard to="/withdraw" icon={Wallet} title="Withdraw" count={null} hint="Cash out at 500 coins" />
      </div>
    </AppLayout>
  );
};

const EarnCard = ({ to, icon: Icon, title, count, hint }: any) => (
  <Link to={to} className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-1 hover:shadow-glow">
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary group-hover:bg-gradient-hero">
      <Icon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
    </div>
    <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground">{hint}</p>
    {count !== null && <p className="mt-2 text-xs font-semibold text-primary">{count} available</p>}
  </Link>
);

export default Dashboard;
