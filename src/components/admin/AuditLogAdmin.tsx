import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DataState } from "@/components/DataState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { downloadCsv } from "@/lib/csv";
import { toast } from "sonner";

export const AuditLogAdmin = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rangeQuery = useCallback(
    (limit: number) => {
      let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (from) q = q.gte("created_at", new Date(`${from}T00:00:00Z`).toISOString());
      if (to) q = q.lt("created_at", new Date(`${to}T23:59:59Z`).toISOString());
      return q;
    },
    [from, to],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await rangeQuery(300);
    if (err) setError(friendlyError(err, "Couldn't load the audit log."));
    else setRows(data ?? []);
    setLoading(false);
  }, [rangeQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const q = filter.trim().toLowerCase();
  const matches = (r: any) =>
    !q ||
    [r.action, r.entity_type, r.actor_id, r.target_user_id, JSON.stringify(r.metadata)]
      .join(" ")
      .toLowerCase()
      .includes(q);
  const filtered = rows.filter(matches);

  const exportCsv = async () => {
    setExporting(true);
    const { data, error: err } = await rangeQuery(10000);
    setExporting(false);
    if (err) return toast.error(friendlyError(err, "Couldn't export the audit log."));
    const all = (data ?? []).filter(matches);
    if (all.length === 0) return toast.error("Nothing to export for this range.");
    downloadCsv(
      `audit-log-${from || "all"}-to-${to || "now"}.csv`,
      ["timestamp", "action", "entity_type", "entity_id", "actor_id", "actor_is_admin", "target_user_id", "metadata"],
      all.map((r: any) => [
        new Date(r.created_at).toISOString(),
        r.action,
        r.entity_type ?? "",
        r.entity_id ?? "",
        r.actor_id ?? "",
        r.actor_is_admin ? "yes" : "no",
        r.target_user_id ?? "",
        JSON.stringify(r.metadata ?? {}),
      ]),
    );
    toast.success(`Exported ${all.length} entries`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Input
            className="max-w-sm"
            placeholder="Filter by action, user or details..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{filtered.length} entries</p>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={exporting}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <DataState
          loading={loading}
          error={error}
          empty={filtered.length === 0}
          emptyText="No audit entries yet."
          loadingText="Loading audit log..."
          onRetry={load}
        >
          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-foreground">
                      {r.action}
                    </span>
                    {r.actor_is_admin && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">admin</span>
                    )}
                    {r.entity_type && (
                      <span className="text-xs text-muted-foreground">{r.entity_type}</span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    actor {r.actor_id ? String(r.actor_id).slice(0, 8) : "system"} · target{" "}
                    {r.target_user_id ? String(r.target_user_id).slice(0, 8) : "—"}
                  </p>
                  {r.metadata && Object.keys(r.metadata).length > 0 && (
                    <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                      {JSON.stringify(r.metadata)}
                    </p>
                  )}
                </div>
                <p className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </DataState>
      </div>
    </div>
  );
};
