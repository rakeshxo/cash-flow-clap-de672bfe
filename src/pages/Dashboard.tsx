import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles, PlayCircle, Wallet, Flame, Target, Vote } from "lucide-react";
import { awardCoins, coinsToCash, formatCoins, getBalance } from "@/lib/coins";
import { toast } from "sonner";

const DAILY_GOAL = 50;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState(0);
  const [todayCoins, setTodayCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [poll, setPoll] = useState<any>(null);
  const [pollVoted, setPollVoted] = useState(false);
  const [surveyCount, setSurveyCount] = useState(0);
  const [videoCount, setVideoCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      const uid = sess.session.user.id;

      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      const [profileR, txR, todayR, pollR, surveysR, videosR] = await Promise.all([
        supabase.from("profiles").select("display_name,daily_streak,last_active_date").eq("user_id", uid).maybeSingle(),
        supabase.from("coin_transactions").select("amount").eq("user_id", uid),
        supabase.from("coin_transactions").select("amount").eq("user_id", uid).gte("created_at", start),
        supabase.from("daily_polls").select("*").eq("poll_date", today.toISOString().slice(0, 10)).maybeSingle(),
        supabase.from("surveys").select("id").not("created_by", "is", null),
        supabase.from("videos").select("id"),
      ]);

      const profile = profileR.data;
      const bal = (txR.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      const todayBal = (todayR.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);

      // Update streak if new day
      if (profile && profile.last_active_date !== today.toISOString().slice(0, 10)) {
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        const isConsecutive = profile.last_active_date === yest.toISOString().slice(0, 10);
        const newStreak = isConsecutive ? (profile.daily_streak ?? 0) + 1 : 1;
        await supabase.from("profiles").update({
          daily_streak: newStreak,
          last_active_date: today.toISOString().slice(0, 10),
        }).eq("user_id", uid);
        // Streak bonus
        if (newStreak > 1) {
          await awardCoins({
            userId: uid,
            amount: Math.min(newStreak * 2, 20),
            type: "streak",
            description: `${newStreak}-day login streak bonus`,
          });
          toast.success(`🔥 ${newStreak}-day streak! +${Math.min(newStreak * 2, 20)} coins`);
        }
        setStreak(newStreak);
      } else {
        setStreak(profile?.daily_streak ?? 0);
      }

      setName(profile?.display_name ?? sess.session.user.email?.split("@")[0] ?? "there");
      setBalance(await getBalance(uid));
      setTodayCoins(todayBal);
      setPoll(pollR.data);
      setSurveyCount(surveysR.data?.length ?? 0);
      setVideoCount(videosR.data?.length ?? 0);

      if (pollR.data) {
        const v = await supabase.from("poll_votes").select("id").eq("user_id", uid).eq("poll_id", pollR.data.id).maybeSingle();
        setPollVoted(!!v.data);
      }
      setLoading(false);
    })();
  }, []);

  const votePoll = async (idx: number) => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session || !poll) return;
    const uid = sess.session.user.id;
    const { error } = await supabase.from("poll_votes").insert({
      user_id: uid, poll_id: poll.id, option_index: idx,
    });
    if (error) return toast.error("Already voted today");
    await awardCoins({ userId: uid, amount: poll.reward_coins, type: "poll", description: "Daily poll" });
    setPollVoted(true);
    setBalance((b) => b + poll.reward_coins);
    setTodayCoins((c) => c + poll.reward_coins);
    toast.success(`+${poll.reward_coins} coins`);
  };

  if (loading) return <AppLayout><div className="py-20 text-center text-muted-foreground">Loading...</div></AppLayout>;

  const goalPct = Math.min(100, Math.round((todayCoins / DAILY_GOAL) * 100));

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="font-display text-3xl font-bold capitalize text-foreground">{name}</h1>
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
