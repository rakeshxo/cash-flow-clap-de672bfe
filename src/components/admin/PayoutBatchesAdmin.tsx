import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DataState } from "@/components/DataState";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { downloadCsv } from "@/lib/csv";
import { CalendarClock, Download, Play, RefreshCw, X } from "lucide-react";

const statusChip = (s: string) =>
  s === "completed"
    ? "bg-primary/15 text-primary"
    : s === "cancelled"
      ? "bg-destructive/15 text-destructive"
      : "bg-secondary text-secondary-foreground";

export const PayoutBatchesAdmin = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [items, setItems] = useState<Record<string, any[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("payout_batches")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) setError("Couldn't load payout batches.");
    else setBatches(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (id: string) => {
    if (open === id) return setOpen(null);
    setOpen(id);
    if (!items[id]) {
      const { data } = await supabase.from("payout_batch_items").select("*").eq("batch_id", id);
      setItems((prev) => ({ ...prev, [id]: data ?? [] }));
    }
  };

  const run = async (id: string) => {
    if (!confirm("Run this batch now? Every queued withdrawal will be marked paid.")) return;
    setBusy(id);
    const { data, error: err } = await supabase.rpc("admin_run_payout_batch", { _batch_id: id });
    setBusy(null);
    if (err) return toastError(err, "Couldn't run the batch.");
    const res = data as any;
    toast.success(`Batch run — ${res?.paid ?? 0} paid, ${res?.failed ?? 0} failed`);
    setItems((prev) => ({ ...prev, [id]: [] }));
    load();
  };

  const cancel = async (id: string) => {
    if (!confirm("Cancel this batch? The withdrawals stay pending.")) return;
    setBusy(id);
    const { error: err } = await supabase.rpc("admin_cancel_payout_batch", { _batch_id: id });
    setBusy(null);
    if (err) return toastError(err, "Couldn't cancel the batch.");
    toast.success("Batch cancelled");
    load();
  };

  const exportBatch = async (b: any) => {
    const { data } = await supabase.from("payout_batch_items").select("*").eq("batch_id", b.id);
    downloadCsv(
      `payout-batch-${b.label.replace(/\s+/g, "-").toLowerCase()}.csv`,
      ["withdrawal_id", "user_id", "coins", "usd", "status", "error"],
      (data ?? []).map((i: any) => [
        i.withdrawal_id,
        i.user_id,
        i.coins_amount,
        (i.coins_amount / 100).toFixed(2),
        i.status,
        i.error ?? "",
      ]),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Group pending withdrawals into a batch from the Withdrawals tab. Scheduled batches run automatically at their
          set time.
        </p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <DataState
          loading={loading}
          error={error}
          empty={batches.length === 0}
          emptyText="No payout batches yet."
          loadingText="Loading payout batches..."
          onRetry={load}
        >
          <div className="divide-y divide-border">
            {batches.map((b) => (
              <div key={b.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{b.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusChip(b.status)}`}>
                        {b.status}
                      </span>
                      {b.scheduled_for && b.status === "scheduled" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                          <CalendarClock className="h-3 w-3" /> {new Date(b.scheduled_for).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {b.item_count} payouts · {b.total_coins.toLocaleString()} coins ($
                      {(b.total_coins / 100).toFixed(2)}) · created {new Date(b.created_at).toLocaleString()}
                      {b.processed_at ? ` · processed ${new Date(b.processed_at).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => toggle(b.id)}>
                      {open === b.id ? "Hide" : "Details"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportBatch(b)}>
                      <Download className="mr-1 h-3.5 w-3.5" /> CSV
                    </Button>
                    {b.status === "scheduled" && (
                      <>
                        <Button size="sm" disabled={busy === b.id} onClick={() => run(b.id)}>
                          <Play className="mr-1 h-3.5 w-3.5" /> Run now
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy === b.id} onClick={() => cancel(b.id)}>
                          <X className="mr-1 h-3.5 w-3.5" /> Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {open === b.id && (
                  <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
                    {(items[b.id] ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No items to show.</p>
                    ) : (
                      <div className="space-y-1">
                        {(items[b.id] ?? []).map((i: any) => (
                          <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-mono text-muted-foreground">{i.user_id.slice(0, 8)}</span>
                            <span className="text-foreground">
                              {i.coins_amount.toLocaleString()} coins (${(i.coins_amount / 100).toFixed(2)})
                            </span>
                            <span className="capitalize text-muted-foreground">{i.status}</span>
                            {i.error && <span className="text-destructive">{i.error}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DataState>
      </div>
    </div>
  );
};
