import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DataState } from "@/components/DataState";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { friendlyError } from "@/lib/errors";

type Stats = {
  total_users: number;
  active_7d: number;
  flagged_users: number;
  coins_outstanding: number;
  coins_awarded_7d: number;
  pending_claims: number;
  pending_withdrawals: number;
  open_security_events: number;
};

const CARDS: { key: keyof Stats; label: string; hint?: string }[] = [
  { key: "total_users", label: "Total users" },
  { key: "active_7d", label: "Active (7d)" },
  { key: "flagged_users", label: "Flagged accounts" },
  { key: "coins_outstanding", label: "Coins outstanding" },
  { key: "coins_awarded_7d", label: "Coins awarded (7d)" },
  { key: "pending_claims", label: "Pending claims" },
  { key: "pending_withdrawals", label: "Pending withdrawals" },
  { key: "open_security_events", label: "Open security events" },
];

export const OverviewAdmin = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("admin_platform_stats");
    if (err) setError(friendlyError(err, "Couldn't load platform stats."));
    else setStats(data as unknown as Stats);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Live platform health.</p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>
      <DataState loading={loading} error={error} onRetry={load} loadingText="Loading platform stats...">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c) => (
            <div key={c.key} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {(stats?.[c.key] ?? 0).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </DataState>
    </div>
  );
};
