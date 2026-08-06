import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import Seo from "@/components/Seo";

type Tone = "good" | "bad" | "neutral";

const OUTCOMES: Record<string, { title: string; message: string; tone: Tone }> = {
  approved: { title: "Completion verified", message: "Nice work — your coins have been added to your balance.", tone: "good" },
  already: { title: "Already recorded", message: "This submission was already processed. Check your activity feed for the outcome.", tone: "good" },
  pending: { title: "Still processing", message: "Your submission is being reviewed and will be settled automatically.", tone: "neutral" },
  rejected: { title: "Not rewarded", message: "Your session did not qualify for a reward this time. Plenty of other surveys are waiting.", tone: "bad" },
  unmatched: { title: "Nothing to settle", message: "We could not match this return to one of your submissions. Contact support if you believe this is an error.", tone: "bad" },
  invalid: { title: "Verification failed", message: "This return link is not valid. If you completed a survey, your reward will be settled automatically shortly.", tone: "bad" },
  incomplete: { title: "Missing information", message: "The return link is incomplete. Your submission stays pending and will be reconciled automatically.", tone: "bad" },
  error: { title: "Something went wrong", message: "We hit an unexpected error. Your submission is safe and will be reconciled automatically.", tone: "bad" },
};

const SurveyReturn = () => {
  const [params] = useSearchParams();
  const result = params.get("result");

  // Legacy/panel entry: no result yet — forward to the edge function to settle.
  useEffect(() => {
    if (result) return;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    window.location.replace(
      `https://${projectId}.functions.supabase.co/panel-redirect?${params.toString()}`,
    );
  }, [params, result]);

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Verifying your completion...
      </div>
    );
  }

  const outcome = OUTCOMES[result] ?? OUTCOMES.error;
  const coins = Number(params.get("coins") ?? 0);
  const Icon = outcome.tone === "good" ? CheckCircle2 : outcome.tone === "neutral" ? Clock : XCircle;
  const accent =
    outcome.tone === "good" ? "text-primary" : outcome.tone === "neutral" ? "text-muted-foreground" : "text-destructive";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Seo title="Survey result — Survey Paradox" description="Result of your survey submission." path="/survey-return" noindex />
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-card">
        <Icon className={`mx-auto mb-4 h-10 w-10 ${accent}`} />
        <h1 className={`font-display text-2xl font-bold ${accent}`}>{outcome.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {result === "approved" && coins > 0
            ? `Nice work — ${coins} coins have been added to your balance.`
            : outcome.message}
        </p>
        <Link
          to="/dashboard"
          className="mt-7 inline-block rounded-xl bg-gradient-hero px-6 py-3 font-semibold text-primary-foreground shadow-glow"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
};

export default SurveyReturn;
