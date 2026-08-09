import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";
import { friendlyError } from "@/lib/errors";

/** Lets a member download their own yearly earnings summary for tax filing. */
export const EarningsReport = () => {
  const thisYear = new Date().getUTCFullYear();
  const years = [thisYear, thisYear - 1, thisYear - 2];
  const [year, setYear] = useState(thisYear);
  const [summary, setSummary] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (y: number) => {
    setBusy(true);
    const { data, error } = await supabase.rpc("my_earnings_report", { _year: y });
    setBusy(false);
    if (error) return toast.error(friendlyError(error, "Couldn't build your earnings report."));
    setYear(y);
    setSummary(data);
  };

  const exportCsv = () => {
    if (!summary) return;
    downloadCsv(
      `earnings-${year}.csv`,
      ["year", "coins_earned", "coins_withdrawn", "usd_earned", "usd_withdrawn"],
      [[
        year,
        summary.coins_earned ?? 0,
        summary.coins_withdrawn ?? 0,
        ((summary.coins_earned ?? 0) / 100).toFixed(2),
        ((summary.coins_withdrawn ?? 0) / 100).toFixed(2),
      ]],
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="mb-3 text-sm text-muted-foreground">
        Download a summary of what you earned and withdrew in a calendar year for your own tax records.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {years.map((y) => (
          <Button key={y} size="sm" variant={y === year && summary ? "default" : "outline"} disabled={busy} onClick={() => load(y)}>
            {y}
          </Button>
        ))}
        {summary && (
          <Button size="sm" variant="secondary" onClick={exportCsv}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
        )}
      </div>
      {summary && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Earned in {year}</p>
            <p className="text-lg font-semibold text-foreground">
              ${(((summary.coins_earned ?? 0) as number) / 100).toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Withdrawn in {year}</p>
            <p className="text-lg font-semibold text-foreground">
              ${(((summary.coins_withdrawn ?? 0) as number) / 100).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
