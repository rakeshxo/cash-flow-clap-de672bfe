import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceFingerprint } from "@/lib/deviceTrust";
import { Laptop } from "lucide-react";

/** Shows the devices linked to the signed-in account (fingerprint-based). */
export const DeviceList = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [current, setCurrent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data }, fp] = await Promise.all([
        supabase.from("user_devices").select("*").order("last_seen_at", { ascending: false }),
        getDeviceFingerprint(),
      ]);
      setRows(data ?? []);
      setCurrent(fp);
      setLoading(false);
    })();
  }, []);

  if (loading) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {rows.length === 0 ? (
        <p className="p-8 text-center text-muted-foreground">No devices recorded yet.</p>
      ) : (
        rows.map((d) => (
          <div key={d.id} className="flex items-start justify-between gap-3 border-b border-border p-4 last:border-0">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <Laptop className="h-4 w-4 text-muted-foreground" />
                {d.platform || "Unknown device"}
                {d.fingerprint === current && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">this device</span>
                )}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{d.user_agent}</p>
              <p className="text-xs text-muted-foreground">
                {d.timezone} · last used {new Date(d.last_seen_at).toLocaleString()}
              </p>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">{String(d.fingerprint).slice(0, 10)}</span>
          </div>
        ))
      )}
    </div>
  );
};
