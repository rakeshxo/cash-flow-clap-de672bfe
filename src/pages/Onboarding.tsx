import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const AGE_RANGES = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const EMPLOYMENT = ["Employed full-time", "Employed part-time", "Self-employed", "Student", "Unemployed", "Retired", "Homemaker"];
const INDUSTRIES = ["Technology", "Healthcare", "Finance", "Education", "Retail", "Manufacturing", "Hospitality", "Government", "Other"];
const INCOME = ["Under $25k", "$25k-$50k", "$50k-$75k", "$75k-$100k", "$100k-$150k", "$150k+", "Prefer not to say"];
const MARITAL = ["Single", "In a relationship", "Married", "Divorced", "Widowed"];
const EDUCATION = ["High school", "Some college", "Bachelor's", "Master's", "Doctorate", "Other"];
const INTERESTS = ["Tech & gadgets", "Fashion", "Sports", "Travel", "Food & cooking", "Gaming", "Music", "Movies & TV", "Fitness", "Books", "Cars", "Beauty"];
const SHOPPING = ["Online frequently", "In-store frequently", "Bargain hunter", "Premium brands", "Eco-conscious", "Subscription boxes"];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uid, setUid] = useState<string>("");

  // Step 1 - Demographics
  const [ageRange, setAgeRange] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  // Step 2 - Employment
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [incomeRange, setIncomeRange] = useState("");
  // Step 3 - Lifestyle
  const [interests, setInterests] = useState<string[]>([]);
  const [shoppingHabits, setShoppingHabits] = useState<string[]>([]);
  // Step 4 - Household
  const [maritalStatus, setMaritalStatus] = useState("");
  const [hasKids, setHasKids] = useState<string>("");
  const [education, setEducation] = useState("");

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate("/auth", { replace: true });
        return;
      }
      setUid(sess.session.user.id);
      const { data: p } = await supabase
        .from("profiles")
        .select("background_completed")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (p?.background_completed) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setLoading(false);
    })();
  }, [navigate]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const canProceed = () => {
    if (step === 1) return ageRange && gender && country.trim().length > 1;
    if (step === 2) return !!employmentStatus;
    if (step === 3) return interests.length > 0;
    if (step === 4) return !!maritalStatus && !!education && hasKids !== "";
    return false;
  };

  const finish = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        background_completed: true,
        background_updated_at: new Date().toISOString(),
        age_range: ageRange,
        gender,
        country: country.trim(),
        employment_status: employmentStatus,
        job_title: jobTitle.trim() || null,
        industry: industry || null,
        income_range: incomeRange || null,
        interests,
        shopping_habits: shoppingHabits,
        marital_status: maritalStatus,
        has_kids: hasKids === "yes",
        education,
      }).eq("user_id", uid);
      if (error) throw error;

      toast.success("Profile saved! Finding surveys for you...");
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center text-muted-foreground">Loading...</div>;
  }

  const totalSteps = 4;
  const pct = Math.round(((step - 1) / totalSteps) * 100);

  return (
    <div className="min-h-dvh bg-gradient-soft px-4 py-10 font-sans">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">Quick background check</span>
        </div>

        <div className="mb-4 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-gradient-hero transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mb-6 text-center text-sm text-muted-foreground">Step {step} of {totalSteps} · We use this to match you with the best-paying surveys.</p>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold text-foreground">About you</h2>
              <div className="space-y-2">
                <Label>Age range</Label>
                <Select value={ageRange} onValueChange={setAgeRange}>
                  <SelectTrigger><SelectValue placeholder="Select age range" /></SelectTrigger>
                  <SelectContent>{AGE_RANGES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" maxLength={60} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. United States" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold text-foreground">Work & income</h2>
              <div className="space-y-2">
                <Label>Employment status</Label>
                <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>{EMPLOYMENT.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="job">Job title (optional)</Label>
                <Input id="job" maxLength={80} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Software Engineer" />
              </div>
              <div className="space-y-2">
                <Label>Industry (optional)</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Household income (optional)</Label>
                <Select value={incomeRange} onValueChange={setIncomeRange}>
                  <SelectTrigger><SelectValue placeholder="Select income" /></SelectTrigger>
                  <SelectContent>{INCOME.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold text-foreground">Your interests</h2>
              <div>
                <Label className="mb-3 block">Pick what you're into</Label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((i) => (
                    <button key={i} type="button" onClick={() => toggle(interests, setInterests, i)} className={`rounded-full border px-3 py-1.5 text-sm transition ${interests.includes(i) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary text-secondary-foreground hover:border-primary/50"}`}>{i}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-3 block">Shopping habits (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {SHOPPING.map((s) => (
                    <button key={s} type="button" onClick={() => toggle(shoppingHabits, setShoppingHabits, s)} className={`rounded-full border px-3 py-1.5 text-sm transition ${shoppingHabits.includes(s) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary text-secondary-foreground hover:border-primary/50"}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold text-foreground">Household</h2>
              <div className="space-y-2">
                <Label>Marital status</Label>
                <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{MARITAL.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Education</Label>
                <Select value={education} onValueChange={setEducation}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{EDUCATION.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Do you have children?</Label>
                <div className="flex gap-3">
                  {[{ v: "yes", l: "Yes" }, { v: "no", l: "No" }].map((o) => (
                    <button key={o.v} type="button" onClick={() => setHasKids(o.v)} className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition ${hasKids === o.v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary text-secondary-foreground hover:border-primary/50"}`}>{o.l}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="outline" disabled={step === 1 || saving} onClick={() => setStep((s) => s - 1)}>Back</Button>
            {step < totalSteps ? (
              <Button disabled={!canProceed()} onClick={() => setStep((s) => s + 1)}>Continue</Button>
            ) : (
              <Button disabled={!canProceed() || saving} onClick={finish} className="shadow-glow">
                {saving ? "Saving..." : "Finish & find surveys"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
