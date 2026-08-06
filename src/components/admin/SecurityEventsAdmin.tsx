import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DataState } from "@/components/DataState";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import { friendlyError, toastError } from "@/lib/errors";

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-primary/15 text-primary",
  high: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

export const SecurityEventsAdmin = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("security_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (err) setError(friendlyError(err, "Couldn't load security events."));
    else setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (id: string) => {
    setBusy(id);
    const { error: err } = await supabase.rpc("admin_resolve_security_event", { _event_id: id });
    setBusy(null);
    if (err) return toastError(err, "Couldn't resolve this event.");
    toast.success("Event resolved");
    load();
  };

  const visible = showResolved ? rows : rows.filter((r) => !r.resolved);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button size="sm" variant="outline" onClick={() => setShowResolved((v) => !v)}>
          {showResolved ? "Show open only" : "Show resolved too"}
        </Button>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{visible.length} events</p>
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
          emptyText="No security events. All clear."
          loadingText="Loading security events..."
          onRetry={load}
        >
          <div className="divide-y divide-border">
            {visible.map((r) => (
              <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[r.severity] ?? SEVERITY_STYLES.low}`}>
                      {r.severity}
                    </span>
                    <span className="font-mono text-xs text-foreground">{r.event_type}</span>
                    {r.resolved && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">resolved</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    user {r.user_id ? String(r.user_id).slice(0, 8) : "—"} · {new Date(r.created_at).toLocaleString()}
                  </p>
                  {r.detail && Object.keys(r.detail).length > 0 && (
                    <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{JSON.stringify(r.detail)}</p>
                  )}
                </div>
                {!r.resolved && (
                  <Button size="sm" disabled={busy === r.id} onClick={() => resolve(r.id)}>
                    <Check className="mr-1 h-3.5 w-3.5" /> Resolve
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DataState>
      </div>
    </div>
  );
};
