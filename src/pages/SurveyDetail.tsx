import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Coins, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { awardCoins } from "@/lib/coins";

type Question = { q: string; options: string[] };
type Survey = {
  id: string;
  title: string;
  description: string;
  reward_cents: number;
  estimated_minutes: number;
  category: string;
  questions: Question[];
};

const SurveyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate("/auth", { replace: true });
        return;
      }
      const { data: s, error } = await supabase.from("surveys").select("*").eq("id", id).maybeSingle();
      if (error || !s) {
        toast.error("Survey not found");
        navigate("/dashboard");
        return;
      }
      setSurvey(s as unknown as Survey);
    });
  }, [id, navigate]);

  const submit = async () => {
    if (!survey) return;
    if (Object.keys(answers).length < survey.questions.length) {
      toast.error("Please answer all questions");
      return;
    }
    setSubmitting(true);
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id;
    if (!userId) return;
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
    setDone(true);
    toast.success(`+${survey.reward_cents} coins earned!`);
  };

  if (!survey) {
    return <div className="flex min-h-screen items-center justify-center bg-gradient-soft text-muted-foreground">Loading...</div>;
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-soft p-4 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-hero shadow-glow">
            <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Nice work!</h1>
          <p className="mt-2 text-muted-foreground">
            You earned <span className="font-bold text-primary">+{survey.reward_cents} coins</span> for this survey.
          </p>
          <Button asChild className="mt-6 w-full"><Link to="/dashboard">Back to dashboard</Link></Button>
        </div>
      </div>
    );
  }

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

        <div className="mt-8 space-y-5">
          {survey.questions.map((q, i) => (
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

        <Button onClick={submit} disabled={submitting} className="mt-8 h-12 w-full text-base shadow-glow">
          {submitting ? "Submitting..." : `Submit & earn ${survey.reward_cents} coins`}
        </Button>
      </main>
    </div>
  );
};

export default SurveyDetail;
