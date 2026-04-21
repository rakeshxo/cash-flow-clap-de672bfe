import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { awardCoins } from "@/lib/coins";
import { Shield, Plus, Trash2, Pencil, X, Check, ExternalLink } from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useIsAdmin();

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admin access only");
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, loading, navigate]);

  if (loading || !isAdmin) {
    return <AppLayout><div className="py-20 text-center text-muted-foreground">Checking access...</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Admin panel</h1>
          <p className="text-muted-foreground">Manage all platform content.</p>
        </div>
      </div>

      <Tabs defaultValue="surveys">
        <TabsList className="mb-6 flex w-full flex-wrap">
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="claims">Survey claims</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        <TabsContent value="surveys"><SurveysAdmin /></TabsContent>
        <TabsContent value="claims"><SurveyClaimsAdmin /></TabsContent>
        <TabsContent value="videos"><VideosAdmin /></TabsContent>
        <TabsContent value="offers"><OffersAdmin /></TabsContent>
        <TabsContent value="rewards"><RewardsAdmin /></TabsContent>
        <TabsContent value="withdrawals"><WithdrawalsAdmin /></TabsContent>
        <TabsContent value="redemptions"><RedemptionsAdmin /></TabsContent>
        <TabsContent value="users"><UsersAdmin /></TabsContent>
      </Tabs>
    </AppLayout>
  );
};

/* ---------- Surveys ---------- */
const emptySurvey = {
  title: "", description: "", category: "General", reward_cents: 25, estimated_minutes: 5,
  questions: [{ q: "", options: ["", ""] }],
  external_url: "",
  screener_questions: [{ q: "", type: "choice", options: ["", ""], correct: 0 }],
};

const SurveysAdmin = () => {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptySurvey);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("surveys").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setForm(emptySurvey); setEditId(null); };

  const save = async () => {
    setSaving(true);
    if (!form.title) { setSaving(false); return toast.error("Title is required"); }
    const hasExternal = !!form.external_url?.trim();
    const screener = form.screener_questions ?? [];
    if (hasExternal) {
      if (screener.length < 2 || screener.length > 5) {
        setSaving(false); return toast.error("Add 2 to 5 screener questions");
      }
      for (const q of screener as any[]) {
        if (!q.q?.trim()) { setSaving(false); return toast.error("Fill all screener questions"); }
        if ((q.type ?? "choice") === "choice" && (q.options ?? []).some((o: string) => !o)) {
          setSaving(false); return toast.error("Fill all screener options");
        }
      }
    } else {
      if (form.questions.some((q: any) => !q.q || q.options.some((o: string) => !o))) {
        setSaving(false); return toast.error("Fill all question options");
      }
    }
    const { data: sess } = await supabase.auth.getSession();
    const payload: any = {
      title: form.title,
      description: form.description,
      category: form.category,
      reward_cents: Number(form.reward_cents),
      estimated_minutes: Number(form.estimated_minutes),
      questions: hasExternal ? [] : form.questions,
      external_url: hasExternal ? form.external_url.trim() : null,
      screener_questions: hasExternal ? screener : [],
      created_by: sess.session?.user.id ?? null,
    };
    const { error } = editId
      ? await supabase.from("surveys").update(payload).eq("id", editId)
      : await supabase.from("surveys").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editId ? "Survey updated" : "Survey created");
    reset();
    load();
  };

  const edit = (s: any) => {
    setEditId(s.id);
    setForm({
      title: s.title, description: s.description, category: s.category,
      reward_cents: s.reward_cents, estimated_minutes: s.estimated_minutes,
      questions: Array.isArray(s.questions) && s.questions.length ? s.questions : [{ q: "", options: ["", ""] }],
      external_url: s.external_url ?? "",
      screener_questions: Array.isArray(s.screener_questions) && s.screener_questions.length
        ? s.screener_questions
        : [{ q: "", options: ["", ""], correct: 0 }],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const del = async (id: string) => {
    if (!confirm("Delete this survey?")) return;
    const { error } = await supabase.from("surveys").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const setQ = (i: number, patch: any) => {
    const qs = [...form.questions];
    qs[i] = { ...qs[i], ...patch };
    setForm({ ...form, questions: qs });
  };
  const setOpt = (qi: number, oi: number, val: string) => {
    const qs = [...form.questions];
    qs[qi].options[oi] = val;
    setForm({ ...form, questions: qs });
  };
  const setSQ = (i: number, patch: any) => {
    const qs = [...form.screener_questions];
    qs[i] = { ...qs[i], ...patch };
    setForm({ ...form, screener_questions: qs });
  };
  const setSOpt = (qi: number, oi: number, val: string) => {
    const qs = [...form.screener_questions];
    qs[qi].options[oi] = val;
    setForm({ ...form, screener_questions: qs });
  };

  const hasExternal = !!form.external_url?.trim();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <FormCard title={editId ? "Edit survey" : "New survey"} onReset={editId ? reset : undefined}>
        <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="Reward (coins)"><Input type="number" value={form.reward_cents} onChange={(e) => setForm({ ...form, reward_cents: e.target.value })} /></Field>
          <Field label="Minutes"><Input type="number" value={form.estimated_minutes} onChange={(e) => setForm({ ...form, estimated_minutes: e.target.value })} /></Field>
        </div>

        <Field label="External survey link (optional — enables screener mode)">
          <Input
            value={form.external_url ?? ""}
            onChange={(e) => setForm({ ...form, external_url: e.target.value })}
            placeholder="https://your-survey-provider.com/..."
          />
        </Field>
        <p className="-mt-2 text-xs text-muted-foreground">
          {hasExternal
            ? "Screener mode: users must answer 2–5 screener questions correctly to unlock the link. Coins are awarded after admin approval."
            : "In-app mode: users answer the questions below to earn coins instantly."}
        </p>

        {hasExternal ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Screener questions (2–5, mark correct answer)</Label>
              <Button
                size="sm"
                variant="outline"
                disabled={(form.screener_questions?.length ?? 0) >= 5}
                onClick={() => setForm({ ...form, screener_questions: [...form.screener_questions, { q: "", type: "choice", options: ["", ""], correct: 0 }] })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add question
              </Button>
            </div>
            {form.screener_questions.map((q: any, qi: number) => {
              const qType = q.type ?? "choice";
              return (
              <div key={qi} className="rounded-xl border border-border p-3">
                <div className="mb-2 flex gap-2">
                  <Input placeholder={`Screener ${qi + 1}`} value={q.q} onChange={(e) => setSQ(qi, { q: e.target.value })} />
                  {form.screener_questions.length > 2 && (
                    <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, screener_questions: form.screener_questions.filter((_: any, x: number) => x !== qi) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="mb-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={qType === "choice" ? "default" : "outline"}
                    onClick={() => setSQ(qi, { type: "choice", options: q.options?.length ? q.options : ["", ""], correct: q.correct ?? 0 })}
                  >
                    Multiple choice
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={qType === "open" ? "default" : "outline"}
                    onClick={() => setSQ(qi, { type: "open" })}
                  >
                    Open-ended
                  </Button>
                </div>
                {qType === "choice" ? (
                  <div className="space-y-2">
                    {q.options.map((opt: string, oi: number) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`s-correct-${qi}`}
                          checked={q.correct === oi}
                          onChange={() => setSQ(qi, { correct: oi })}
                          title="Mark as correct answer"
                          className="h-4 w-4 accent-primary"
                        />
                        <Input placeholder={`Option ${oi + 1}`} value={opt} onChange={(e) => setSOpt(qi, oi, e.target.value)} />
                        {q.options.length > 2 && (
                          <Button size="icon" variant="ghost" onClick={() => setSQ(qi, { options: q.options.filter((_: any, x: number) => x !== oi), correct: Math.min(q.correct ?? 0, q.options.length - 2) })}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" onClick={() => setSQ(qi, { options: [...q.options, ""] })}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Option
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Respondent will type a free-text answer. No "correct" option — every response passes this question.
                  </p>
                )}
              </div>
            );})}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Questions</Label>
              <Button size="sm" variant="outline" onClick={() => setForm({ ...form, questions: [...form.questions, { q: "", options: ["", ""] }] })}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add question
              </Button>
            </div>
            {form.questions.map((q: any, qi: number) => (
              <div key={qi} className="rounded-xl border border-border p-3">
                <div className="mb-2 flex gap-2">
                  <Input placeholder={`Question ${qi + 1}`} value={q.q} onChange={(e) => setQ(qi, { q: e.target.value })} />
                  {form.questions.length > 1 && (
                    <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, questions: form.questions.filter((_: any, x: number) => x !== qi) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {q.options.map((opt: string, oi: number) => (
                    <div key={oi} className="flex gap-2">
                      <Input placeholder={`Option ${oi + 1}`} value={opt} onChange={(e) => setOpt(qi, oi, e.target.value)} />
                      {q.options.length > 2 && (
                        <Button size="icon" variant="ghost" onClick={() => setQ(qi, { options: q.options.filter((_: any, x: number) => x !== oi) })}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => setQ(qi, { options: [...q.options, ""] })}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Option
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button onClick={save} disabled={saving} className="w-full">{saving ? "Saving..." : editId ? "Update survey" : "Create survey"}</Button>
      </FormCard>

      <ListCard title={`All surveys (${items.length})`}>
        {items.map((s) => (
          <Row
            key={s.id}
            title={s.title}
            subtitle={`${s.category} · ${s.reward_cents} coins · ${s.estimated_minutes}m${s.external_url ? " · external link" : ""}`}
            onEdit={() => edit(s)}
            onDelete={() => del(s.id)}
          />
        ))}
      </ListCard>
    </div>
  );
};

/* ---------- Videos ---------- */
const emptyVideo = { title: "", description: "", category: "General", reward_coins: 5, duration_seconds: 30, thumbnail_url: "" };
const VideosAdmin = () => {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyVideo);
  const [editId, setEditId] = useState<string | null>(null);
  const load = async () => { const { data } = await supabase.from("videos").select("*").order("created_at", { ascending: false }); setItems(data ?? []); };
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!form.title) return toast.error("Title required");
    const payload = { ...form, reward_coins: Number(form.reward_coins), duration_seconds: Number(form.duration_seconds) };
    const { error } = editId ? await supabase.from("videos").update(payload).eq("id", editId) : await supabase.from("videos").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editId ? "Updated" : "Created");
    setForm(emptyVideo); setEditId(null); load();
  };
  const edit = (v: any) => { setEditId(v.id); setForm(v); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const del = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("videos").delete().eq("id", id); toast.success("Deleted"); load(); };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <FormCard title={editId ? "Edit video" : "New video"} onReset={editId ? () => { setForm(emptyVideo); setEditId(null); } : undefined}>
        <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Thumbnail URL"><Input value={form.thumbnail_url ?? ""} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://..." /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="Reward (coins)"><Input type="number" value={form.reward_coins} onChange={(e) => setForm({ ...form, reward_coins: e.target.value })} /></Field>
          <Field label="Duration (s)"><Input type="number" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} /></Field>
        </div>
        <Button onClick={save} className="w-full">{editId ? "Update" : "Create"}</Button>
      </FormCard>
      <ListCard title={`All videos (${items.length})`}>
        {items.map((v) => <Row key={v.id} title={v.title} subtitle={`${v.category} · ${v.reward_coins} coins · ${v.duration_seconds}s`} onEdit={() => edit(v)} onDelete={() => del(v.id)} />)}
      </ListCard>
    </div>
  );
};

/* ---------- Offers ---------- */
const emptyOffer = { merchant: "", title: "", description: "", category: "Shopping", cashback_percent: 5, reward_coins: 100, logo_url: "" };
const OffersAdmin = () => {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyOffer);
  const [editId, setEditId] = useState<string | null>(null);
  const load = async () => { const { data } = await supabase.from("offers").select("*").order("created_at", { ascending: false }); setItems(data ?? []); };
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!form.merchant || !form.title) return toast.error("Merchant and title required");
    const payload = { ...form, cashback_percent: Number(form.cashback_percent), reward_coins: Number(form.reward_coins) };
    const { error } = editId ? await supabase.from("offers").update(payload).eq("id", editId) : await supabase.from("offers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editId ? "Updated" : "Created");
    setForm(emptyOffer); setEditId(null); load();
  };
  const edit = (o: any) => { setEditId(o.id); setForm(o); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const del = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("offers").delete().eq("id", id); toast.success("Deleted"); load(); };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <FormCard title={editId ? "Edit offer" : "New offer"} onReset={editId ? () => { setForm(emptyOffer); setEditId(null); } : undefined}>
        <Field label="Merchant"><Input value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} /></Field>
        <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Logo URL"><Input value={form.logo_url ?? ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://logo.clearbit.com/..." /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="Cashback %"><Input type="number" step="0.1" value={form.cashback_percent} onChange={(e) => setForm({ ...form, cashback_percent: e.target.value })} /></Field>
          <Field label="Coins reward"><Input type="number" value={form.reward_coins} onChange={(e) => setForm({ ...form, reward_coins: e.target.value })} /></Field>
        </div>
        <Button onClick={save} className="w-full">{editId ? "Update" : "Create"}</Button>
      </FormCard>
      <ListCard title={`All offers (${items.length})`}>
        {items.map((o) => <Row key={o.id} title={`${o.merchant} — ${o.title}`} subtitle={`${o.category} · ${o.cashback_percent}% · +${o.reward_coins} coins`} onEdit={() => edit(o)} onDelete={() => del(o.id)} />)}
      </ListCard>
    </div>
  );
};

/* ---------- Rewards ---------- */
const emptyReward = { name: "", brand: "", category: "Gift Card", cost_coins: 500, cash_value_cents: 500, image_url: "" };
const RewardsAdmin = () => {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyReward);
  const [editId, setEditId] = useState<string | null>(null);
  const load = async () => { const { data } = await supabase.from("rewards").select("*").order("cost_coins"); setItems(data ?? []); };
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!form.name) return toast.error("Name required");
    const payload = { ...form, cost_coins: Number(form.cost_coins), cash_value_cents: Number(form.cash_value_cents) };
    const { error } = editId ? await supabase.from("rewards").update(payload).eq("id", editId) : await supabase.from("rewards").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editId ? "Updated" : "Created");
    setForm(emptyReward); setEditId(null); load();
  };
  const edit = (r: any) => { setEditId(r.id); setForm(r); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const del = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("rewards").delete().eq("id", id); toast.success("Deleted"); load(); };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <FormCard title={editId ? "Edit reward" : "New reward"} onReset={editId ? () => { setForm(emptyReward); setEditId(null); } : undefined}>
        <Field label="Name (e.g. $5 Amazon Gift Card)"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Brand"><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
        <Field label="Image URL"><Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://logo.clearbit.com/..." /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="Cost (coins)"><Input type="number" value={form.cost_coins} onChange={(e) => setForm({ ...form, cost_coins: e.target.value })} /></Field>
          <Field label="Cash value (¢)"><Input type="number" value={form.cash_value_cents} onChange={(e) => setForm({ ...form, cash_value_cents: e.target.value })} /></Field>
        </div>
        <Button onClick={save} className="w-full">{editId ? "Update" : "Create"}</Button>
      </FormCard>
      <ListCard title={`All rewards (${items.length})`}>
        {items.map((r) => <Row key={r.id} title={r.name} subtitle={`${r.brand} · ${r.cost_coins} coins`} onEdit={() => edit(r)} onDelete={() => del(r.id)} />)}
      </ListCard>
    </div>
  );
};

/* ---------- Redemptions ---------- */
const RedemptionsAdmin = () => {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase
      .from("redemptions")
      .select("*, rewards(name)")
      .order("redeemed_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("redemptions").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    load();
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {items.length === 0 ? <p className="p-8 text-center text-muted-foreground">No redemptions yet.</p> : items.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 last:border-0">
          <div>
            <p className="font-medium text-foreground">{r.rewards?.name ?? "Reward"}</p>
            <p className="text-xs text-muted-foreground">User {r.user_id.slice(0, 8)} · {new Date(r.redeemed_at).toLocaleString()} · {r.cost_coins} coins</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-secondary-foreground">{r.status}</span>
            {r.status !== "fulfilled" && <Button size="sm" onClick={() => setStatus(r.id, "fulfilled")}><Check className="mr-1 h-3.5 w-3.5" /> Fulfill</Button>}
            {r.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")}><X className="mr-1 h-3.5 w-3.5" /> Reject</Button>}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ---------- Withdrawals ---------- */
const WithdrawalsAdmin = () => {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("withdrawals")
      .update({ status, processed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    load();
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {items.length === 0 ? <p className="p-8 text-center text-muted-foreground">No withdrawals yet.</p> : items.map((w) => (
        <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 last:border-0">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground capitalize">{w.method} → {w.destination}</p>
            <p className="text-xs text-muted-foreground">User {w.user_id.slice(0, 8)} · {new Date(w.created_at).toLocaleString()} · {w.coins_amount} coins (${(w.cash_value_cents / 100).toFixed(2)})</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-secondary-foreground">{w.status}</span>
            {w.status !== "paid" && <Button size="sm" onClick={() => setStatus(w.id, "paid")}><Check className="mr-1 h-3.5 w-3.5" /> Mark paid</Button>}
            {w.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => setStatus(w.id, "rejected")}><X className="mr-1 h-3.5 w-3.5" /> Reject</Button>}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ---------- Survey Claims ---------- */
const SurveyClaimsAdmin = () => {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase
      .from("survey_claims")
      .select("*, surveys(title, external_url)")
      .order("submitted_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const approve = async (claim: any) => {
    const { error } = await supabase
      .from("survey_claims")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", claim.id)
      .eq("status", "pending");
    if (error) return toast.error(error.message);
    try {
      await awardCoins({
        userId: claim.user_id,
        amount: claim.reward_cents,
        type: "survey",
        description: `Approved: ${claim.surveys?.title ?? "External survey"}`,
        referenceId: claim.survey_id,
      });
    } catch (e: any) {
      toast.error("Approved but failed to award coins: " + e.message);
    }
    toast.success("Claim approved & coins awarded");
    load();
  };
  const reject = async (id: string) => {
    const { error } = await supabase
      .from("survey_claims")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Claim rejected");
    load();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {items.length === 0 ? <p className="p-8 text-center text-muted-foreground">No survey claims yet.</p> : items.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 last:border-0">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{c.surveys?.title ?? "Survey"}</p>
            <p className="text-xs text-muted-foreground">
              User {c.user_id.slice(0, 8)} · {new Date(c.submitted_at).toLocaleString()} · {c.reward_cents} coins
            </p>
            {c.tracking_uid && (
              <p className="mt-1 break-all text-xs text-muted-foreground">
                UID: <span className="font-mono text-foreground">{c.tracking_uid}</span>
              </p>
            )}
            {c.surveys?.external_url && (
              <a href={c.surveys.external_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> Open external link
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-secondary-foreground">{c.status}</span>
            {c.status === "pending" && (
              <>
                <Button size="sm" onClick={() => approve(c)}><Check className="mr-1 h-3.5 w-3.5" /> Approve</Button>
                <Button size="sm" variant="outline" onClick={() => reject(c.id)}><X className="mr-1 h-3.5 w-3.5" /> Reject</Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
const UsersAdmin = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: txs }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url, created_at, daily_streak"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("coin_transactions").select("user_id, amount"),
    ]);
    const adminSet = new Set((roles ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id));
    const balances = new Map<string, number>();
    (txs ?? []).forEach((t: any) => balances.set(t.user_id, (balances.get(t.user_id) ?? 0) + t.amount));
    const merged = (profiles ?? []).map((p: any) => ({
      ...p,
      balance: balances.get(p.user_id) ?? 0,
      isAdmin: adminSet.has(p.user_id),
    })).sort((a, b) => b.balance - a.balance);
    setRows(merged);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const grant = async (user_id: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id, role: "admin" });
    if (error) return toast.error(error.message);
    toast.success("Admin granted");
    load();
  };
  const revoke = async (user_id: string) => {
    if (!confirm("Revoke admin access?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
    if (error) return toast.error(error.message);
    toast.success("Admin revoked");
    load();
  };

  const filtered = rows.filter((r) =>
    !filter ||
    (r.display_name ?? "").toLowerCase().includes(filter.toLowerCase()) ||
    r.user_id.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input placeholder="Search by name or user ID..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
        <p className="text-sm text-muted-foreground">{filtered.length} of {rows.length} users</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {loading ? (
          <p className="p-8 text-center text-muted-foreground">Loading users...</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No users found.</p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((u) => (
              <div key={u.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{u.display_name ?? "Unnamed"}</p>
                    {u.isAdmin && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">Admin</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.user_id.slice(0, 8)} · joined {new Date(u.created_at).toLocaleDateString()} · streak {u.daily_streak}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-foreground">{u.balance.toLocaleString()}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">coins · ${(u.balance / 100).toFixed(2)}</p>
                  </div>
                  {u.isAdmin ? (
                    <Button size="sm" variant="outline" onClick={() => revoke(u.user_id)}>
                      <X className="mr-1 h-3.5 w-3.5" /> Revoke admin
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => grant(u.user_id)}>
                      <Shield className="mr-1 h-3.5 w-3.5" /> Make admin
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Shared UI ---------- */
const FormCard = ({ title, children, onReset }: any) => (
  <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      {onReset && <Button size="sm" variant="ghost" onClick={onReset}>Cancel</Button>}
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);
const ListCard = ({ title, children }: any) => (
  <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
    <h2 className="mb-4 font-display text-lg font-bold text-foreground">{title}</h2>
    <div className="space-y-2">{children}</div>
  </div>
);
const Field = ({ label, children }: any) => (
  <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
);
const Row = ({ title, subtitle, onEdit, onDelete }: any) => (
  <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
    <div className="min-w-0 flex-1">
      <p className="truncate font-medium text-foreground">{title}</p>
      <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
    </div>
    <Button size="icon" variant="ghost" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
    <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
  </div>
);

export default Admin;
