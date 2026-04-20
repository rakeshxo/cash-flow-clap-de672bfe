import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Coins, ArrowLeft, CheckCircle2, ExternalLink, Clock } from "lucide-react";
import { toast } from "sonner";
import { awardCoins } from "@/lib/coins";

type Question = { q: string; options: string[] };
type ScreenerQuestion = { q: string; options: string[]; correct: number };
type Survey = {
  id: string;
  title: string;
  description: string;
  reward_cents: number;
  estimated_minutes: number;
  category: string;
  questions: Question[];
  external_url: string | null;
  screener_questions: ScreenerQuestion[];
};

type Stage = "loading" | "screener" | "in_app" | "screener_failed" | "external_open" | "submitted" | "done";

// Generate a short, URL-safe unique ID (~22 chars, ~128 bits of entropy)
const generateUid = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

// Substitute UID into the survey URL.
// - Replaces literal "XXX" (case-sensitive) if present
// - Otherwise replaces an existing uid= query param value
// - Otherwise appends ?uid= or &uid=
const buildSurveyUrl = (rawUrl: string, uid: string) => {
  if (rawUrl.includes("XXX")) return rawUrl.replace(/XXX/g, uid);
  try {
    const u = new URL(rawUrl);
    u.searchParams.set("uid", uid);
    return u.toString();
  } catch {
    const sep = rawUrl.includes("?") ? "&" : "?";
    return `${rawUrl}${sep}uid=${uid}`;
  }
};

const SurveyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<Stage>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [trackingUid, setTrackingUid] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate("/auth", { replace: true });
        return;
      }
      setUserId(data.session.user.id);
      const { data: s, error } = await supabase.from("surveys").select("*").eq("id", id).maybeSingle();
      if (error || !s) {
        toast.error("Survey not found");
        navigate("/dashboard");
        return;
      }
      const survey = s as unknown as Survey;
      setSurvey(survey);
      // Check if user already has a claim for this external survey
      if (survey.external_url) {
        const { data: existing } = await supabase
          .from("survey_claims")
          .select("status, tracking_uid")
          .eq("survey_id", survey.id)
          .eq("user_id", data.session.user.id)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing) {
          // If a previous claim exists, reuse its UID and short-circuit to "submitted"
          setTrackingUid(existing.tracking_uid ?? null);
          if (existing.tracking_uid) {
            setExternalUrl(buildSurveyUrl(survey.external_url, existing.tracking_uid));
          }
          setStage("submitted");
          return;
        }
        setStage("screener");
      } else {
        setStage("in_app");
      }
    });
  }, [id, navigate]);

  // ----- In-app survey submit -----
  const submitInApp = async () => {
    if (!survey || !userId) return;
    if (Object.keys(answers).length < survey.questions.length) {
      toast.error("Please answer all questions");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("survey_completions").insert({
      user_id: userId,
      survey_id: survey.id,
      answers,
      reward_cents: survey.reward_cents,
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    await awardCoins({
      userId,
      amount: survey.reward_cents,
      type: "survey",
      description: `Completed: ${survey.title}`,
      referenceId: survey.id,
    });
    setSubmitting(false);
    setStage("done");
    toast.success(`+${survey.reward_cents} coins earned!`);
  };

  // ----- Screener submit: create the pending claim with a unique UID, then unlock the link -----
  const submitScreener = async () => {
    if (!survey || !userId) return;
    const sq = survey.screener_questions ?? [];
    if (Object.keys(answers).length < sq.length) {
      toast.error("Please answer all screener questions");
      return;
    }
    const passed = sq.every((q, i) => q.options[q.correct] === answers[i]);
    if (!passed) {
      setStage("screener_failed");
      return;
    }
    setSubmitting(true);
    const uid = generateUid();
    const { error } = await supabase.from("survey_claims").insert({
      user_id: userId,
      survey_id: survey.id,
      screener_answers: answers,
      reward_cents: survey.reward_cents,
      link_opened_at: new Date().toISOString(),
      status: "pending",
      tracking_uid: uid,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setTrackingUid(uid);
    setExternalUrl(survey.external_url ? buildSurveyUrl(survey.external_url, uid) : null);
    setStage("external_open");
  };

  // ----- Confirm completion: nothing to insert (claim already exists) -----
  const confirmCompleted = () => {
    setStage("submitted");
    toast.success("Submitted for review!");
  };

  if (!survey || stage === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-gradient-soft text-muted-foreground">Loading...</div>;
  }

  // Done — in-app instant reward
  if (stage === "done") {
    return (
      <CenteredCard
        icon={<CheckCircle2 className="h-8 w-8 text-primary-foreground" />}
        title="Nice work!"
        body={<>You earned <span className="font-bold text-primary">+{survey.reward_cents} coins</span> for this survey.</>}
      />
    );
  }

  // Screener failed
  if (stage === "screener_failed") {
    return (
      <CenteredCard
        icon={<ExternalLink className="h-8 w-8 text-primary-foreground" />}
        title="Sorry, you didn't qualify"
        body="Based on your answers, this survey isn't a match. Try another one!"
      />
    );
  }

  // Submitted for admin review
  if (stage === "submitted") {
    return (
      <CenteredCard
        icon={<Clock className="h-8 w-8 text-primary-foreground" />}
        title="Submitted for review"
        body={<>You'll receive <span className="font-bold text-primary">+{survey.reward_cents} coins</span> after an admin verifies your completion.</>}
      />
    );
  }

  const isScreener = stage === "screener";
  const activeQuestions: (Question | ScreenerQuestion)[] =
    isScreener ? survey.screener_questions : survey.questions;

  return (
    <div className="min-h-screen bg-gradient-soft font-sans">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4 text-primary" />
            <span className="font-display font-bold text-primary">+{survey.reward_cents} coins</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-10">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">{survey.category}</span>
        <h1 className="font-display mt-3 text-3xl font-bold text-foreground">{survey.title}</h1>
        <p className="mt-2 text-muted-foreground">{survey.description}</p>

        {stage === "external_open" ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-hero shadow-glow">
              <CheckCircle2 className="h-7 w-7 text-primary-foreground" />
            </div>
            <h2 className="font-display text-center text-xl font-bold text-foreground">You qualify! 🎉</h2>
            <p className="mt-2 text-center text-muted-foreground">
              Open the survey, complete it on the external site, then come back and tap "I've completed it" to submit for review.
            </p>
            <Button asChild className="mt-6 h-12 w-full text-base shadow-glow">
              <a href={survey.external_url ?? "#"} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> Open survey
              </a>
            </Button>
            <Button onClick={submitClaim} disabled={submitting} variant="outline" className="mt-3 h-12 w-full text-base">
              {submitting ? "Submitting..." : "I've completed it — submit for review"}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Coins are awarded after admin verification.
            </p>
          </div>
        ) : (
          <>
            {isScreener && (
              <p className="mt-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
                Quick screener — answer correctly to unlock this survey.
              </p>
            )}
            <div className="mt-6 space-y-5">
              {activeQuestions.map((q, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <p className="font-display font-semibold text-foreground">
                    <span className="mr-2 text-primary">{i + 1}.</span>{q.q}
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {q.options.map((opt) => {
                      const selected = answers[i] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers((a) => ({ ...a, [i]: opt }))}
                          className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                            selected
                              ? "border-primary bg-primary/10 text-foreground shadow-sm"
                              : "border-border bg-background hover:border-primary/40"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={isScreener ? submitScreener : submitInApp}
              disabled={submitting}
              className="mt-8 h-12 w-full text-base shadow-glow"
            >
              {submitting
                ? "Submitting..."
                : isScreener
                  ? "Continue"
                  : `Submit & earn ${survey.reward_cents} coins`}
            </Button>
          </>
        )}
      </main>
    </div>
  );
};

const CenteredCard = ({ icon, title, body }: { icon: React.ReactNode; title: string; body: React.ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-soft p-4 font-sans">
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-hero shadow-glow">
        {icon}
      </div>
      <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-muted-foreground">{body}</p>
      <Button asChild className="mt-6 w-full"><Link to="/dashboard">Back to dashboard</Link></Button>
    </div>
  </div>
);

export default SurveyDetail;
