import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AccountStatus = "active" | "flagged" | "suspended";

/** Reads the signed-in user's account standing so the UI can gate risky actions. */
export function useAccountStatus() {
  const [status, setStatus] = useState<AccountStatus>("active");
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("account_status, suspended_reason")
      .eq("user_id", uid)
      .maybeSingle();
    setStatus(((data?.account_status as AccountStatus) ?? "active"));
    setReason(data?.suspended_reason ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { status, reason, loading, reload: load };
}
