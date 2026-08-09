import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DataState } from "@/components/DataState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/csv";
import { friendlyError } from "@/lib/errors";
import { Download, RefreshCw } from "lucide-react";

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const TaxReportsAdmin = () => {
  const currentYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(currentYear);
  const [threshold, setThreshold] = useState(600);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyReportable, setOnlyReportable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("admin_earnings_report", {
      _year: year,
      _threshold_cents: Math.max(0, Math.round(threshold * 100)),
    });
    if (err) setError(friendlyError(err, "Couldn't build the earnings report."));
    else setRows((data as any[]) ?? []);
    setLoading(false);
  }, [year, threshold]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = onlyReportable ? rows.filter((r) => r.reportable) : rows;
  const totals = shown.reduce(
    (acc, r) => ({
      earned: acc.earned + r.gross_earned_cents,
      paid: acc.paid + r.paid_out_cents,
      pending: acc.pending + r.pending_cents,
    }),
    { earned: 0, paid: 0, pending: 0 },
  );

  const exportCsv = () =>
    downloadCsv(
      `earnings-report-${year}.csv`,
      [
        "user_id",
        "display_name",
        "country",
        "kyc_status",
        "gross_earned_usd",
        "adjustments_usd",
        "paid_out_usd",
        "pending_usd",
        "balance_usd",
        `reportable_at_${threshold}`,
      ],
      shown.map((r) => [
        r.user_id,
        r.display_name ?? "",
        r.country ?? "",
        r.kyc_status,
        (r.gross_earned_cents / 100).toFixed(2),
        (r.adjustments_cents / 100).toFixed(2),
        (r.paid_out_cents / 100).toFixed(2),
        (r.pending_cents / 100).toFixed(2),
        (r.balance_cents / 100).toFixed(2),
        r.reportable ? "yes" : "no",
      ]),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div>
          <label htmlFor="tax-year" className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Tax year</label>
          <Input
            id="tax-year"
            type="number"
            className="w-32"
            value={year}
            onChange={(e) => setYear(Math.trunc(Number(e.target.value)) || currentYear)}
          />
        </div>
        <div>
          <label htmlFor="tax-threshold" className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
            Reporting threshold (USD paid out)
          </label>
          <Input
            id="tax-threshold"
            type="number"
            className="w-40"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Rebuild
        </Button>
        <Button variant={onlyReportable ? "default" : "outline"} onClick={() => setOnlyReportable((v) => !v)}>
          {onlyReportable ? "Showing 1099 candidates" : "Show 1099 candidates only"}
        </Button>
        <Button onClick={exportCsv} disabled={shown.length === 0}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Earners" value={String(shown.length)} />
        <Stat label="Gross earned" value={usd(totals.earned)} />
        <Stat label="Paid out" value={usd(totals.paid)} />
        <Stat label="Pending payouts" value={usd(totals.pending)} />
      </div>

      <p className="text-xs text-muted-foreground">
        US payers generally file a 1099-NEC once a person is paid {usd(threshold * 100)} or more in a calendar year.
        This report is a bookkeeping aid, not tax advice — confirm the current rules with your accountant.
      </p>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <DataState
          loading={loading}
          error={error}
          empty={shown.length === 0}
          emptyText="No earnings recorded for this year."
          loadingText="Building the report..."
          onRetry={load}
        >
          <div className="divide-y divide-border">
            {shown.map((r) => (
              <div key={r.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-foreground">{r.display_name ?? "Unnamed"}</p>
                    {r.reportable && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        1099 threshold
                      </span>
                    )}
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-secondary-foreground">
                      KYC {r.kyc_status}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.user_id.slice(0, 8)}
                    {r.country ? ` · ${r.country}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-5 text-right">
                  <Cell label="Earned" value={usd(r.gross_earned_cents)} />
                  <Cell label="Adjustments" value={usd(r.adjustments_cents)} />
                  <Cell label="Paid out" value={usd(r.paid_out_cents)} />
                  <Cell label="Pending" value={usd(r.pending_cents)} />
                  <Cell label="Balance" value={usd(r.balance_cents)} />
                </div>
              </div>
            ))}
          </div>
        </DataState>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="font-display text-2xl font-bold text-foreground">{value}</p>
  </div>
);

const Cell = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-medium text-foreground">{value}</p>
  </div>
);
