import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DataState } from "@/components/DataState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Check, X } from "lucide-react";
import { toast } from "sonner";
import { friendlyError, toastError } from "@/lib/errors";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-primary/15 text-primary",
  approved: "bg-secondary text-secondary-foreground",
  rejected: "bg-destructive/15 text-destructive",
};

export const KycAdmin = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("kyc_verifications")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(300);
    if (err) setError(friendlyError(err, "Couldn't load identity verifications."));
    else setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (id: string, approve: boolean) => {
    setBusy(id);
    const { error: err } = await supabase.rpc("admin_review_kyc", {
      _kyc_id: id,
      _approve: approve,
      _note: notes[id]?.trim() || null,
    });
    setBusy(null);
    if (err) return toastError(err, "Couldn't review this verification.");
    toast.success(approve ? "Identity approved" : "Verification rejected");
    load();
  };

  const visible = showAll ? rows : rows.filter((r) => r.status === "pending");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button size="sm" variant="outline" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show pending only" : "Show all submissions"}
        </Button>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{visible.length} submissions</p>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <DataState
          loading={loading}
          error={error}
          empty={visible.length === 0}
          emptyText="No identity verifications waiting."
          loadingText="Loading verifications..."
          onRetry={load}
        >
          <div className="divide-y divide-border">
            {visible.map((r) => (
              <div key={r.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-bold text-foreground">{r.full_name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.country} · born {r.date_of_birth} · {String(r.document_type).replace("_", " ")} ·{" "}
                      <span className="font-mono">{r.document_reference}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      user {String(r.user_id).slice(0, 8)} · submitted {new Date(r.submitted_at).toLocaleString()}
                    </p>
                    {r.admin_note && <p className="mt-1 text-xs text-muted-foreground">Note: {r.admin_note}</p>}
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busy === r.id} onClick={() => review(r.id, true)}>
                        <Check className="mr-1 h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => review(r.id, false)}>
                        <X className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
                {r.status === "pending" && (
                  <Input
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                    placeholder="Optional note sent to the member"
                    maxLength={200}
                  />
                )}
              </div>
            ))}
          </div>
        </DataState>
      </div>
    </div>
  );
};
