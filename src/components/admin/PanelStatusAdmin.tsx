import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataState } from "@/components/DataState";
import { toastError } from "@/lib/errors";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Mapping = {
  id: string;
  panel_status: string;
  outcome: "approve" | "reject" | "pending";
  notify_title: string;
  notify_body: string;
  enabled: boolean;
};

const OUTCOMES: Array<{ value: Mapping["outcome"]; label: string; hint: string }> = [
  { value: "approve", label: "Approve", hint: "Pays the claim reward" },
  { value: "reject", label: "Reject", hint: "Closes the claim, notifies the respondent" },
  { value: "pending", label: "Keep pending", hint: "Ignored — claim stays open for review" },
];

const emptyDraft = { panel_status: "", outcome: "approve" as Mapping["outcome"], notify_title: "", notify_body: "" };

export const PanelStatusAdmin = () => {
  const [rows, setRows] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("panel_status_mappings")
      .select("id,panel_status,outcome,notify_title,notify_body,enabled")
      .order("panel_status");
    if (error) setError(error.message);
    else {
      setRows((data ?? []) as Mapping[]);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const patch = async (id: string, values: Partial<Mapping>) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...values } : x)));
    const { error } = await supabase.from("panel_status_mappings").update(values).eq("id", id);
    if (error) {
      toastError(error);
      load();
    }
  };

  const add = async () => {
    const status = draft.panel_status.trim().toLowerCase();
    if (!status) return toast.error("Enter the status string your panel sends");
    setSaving(true);
    const { error } = await supabase.from("panel_status_mappings").insert({
      panel_status: status,
      outcome: draft.outcome,
      notify_title: draft.notify_title.trim(),
      notify_body: draft.notify_body.trim(),
    });
    setSaving(false);
    if (error) return toastError(error);
    setDraft(emptyDraft);
    toast.success("Status mapping added");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("panel_status_mappings").delete().eq("id", id);
    if (error) return toastError(error);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="font-display text-lg font-bold text-foreground">Panel status mapping</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Every status your panel returns is translated here. Add new statuses without code changes — unmapped or
          disabled statuses leave the claim pending. Use <code className="text-primary">{"{survey}"}</code> in a message
          to insert the survey title.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <Label>Panel status</Label>
            <Input
              value={draft.panel_status}
              onChange={(e) => setDraft({ ...draft, panel_status: e.target.value })}
              placeholder="e.g. overquota"
            />
          </div>
          <div>
            <Label>Outcome</Label>
            <select
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={draft.outcome}
              onChange={(e) => setDraft({ ...draft, outcome: e.target.value as Mapping["outcome"] })}
            >
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Notification title</Label>
            <Input
              value={draft.notify_title}
              onChange={(e) => setDraft({ ...draft, notify_title: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label>Notification message</Label>
            <Input
              value={draft.notify_body}
              onChange={(e) => setDraft({ ...draft, notify_body: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={add} disabled={saving} className="w-full">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </div>

      <DataState loading={loading} error={error} empty={rows.length === 0} onRetry={load} emptyText="No status mappings yet.">
        <div className="space-y-3">
          {rows.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-5">
                <div>
                  <Label className="text-xs text-muted-foreground">Panel status</Label>
                  <p className="mt-2 font-mono text-sm font-semibold text-foreground">{m.panel_status}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Outcome</Label>
                  <select
                    className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                    value={m.outcome}
                    onChange={(e) => patch(m.id, { outcome: e.target.value as Mapping["outcome"] })}
                  >
                    {OUTCOMES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Notification title</Label>
                  <Input
                    className="mt-2"
                    defaultValue={m.notify_title}
                    onBlur={(e) => e.target.value !== m.notify_title && patch(m.id, { notify_title: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Notification message</Label>
                  <Input
                    className="mt-2"
                    defaultValue={m.notify_body}
                    onBlur={(e) => e.target.value !== m.notify_body && patch(m.id, { notify_body: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={m.enabled ? "secondary" : "outline"}
                    className="flex-1"
                    onClick={() => patch(m.id, { enabled: !m.enabled })}
                  >
                    {m.enabled ? "Enabled" : "Disabled"}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => remove(m.id)} aria-label="Delete mapping">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {OUTCOMES.find((o) => o.value === m.outcome)?.hint}
              </p>
            </div>
          ))}
        </div>
      </DataState>
    </div>
  );
};
