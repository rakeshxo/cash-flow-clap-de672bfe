import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { registerCurrentDevice, runNetworkCheck } from "@/lib/deviceTrust";

const SESSION_KEY = "device_trust_checked_at";
const INTERVAL_MS = 30 * 60 * 1000;

/**
 * Registers the device fingerprint for the signed-in account and runs the
 * server-side VPN/proxy/Tor check. Duplicate accounts and anonymised networks
 * are recorded as security events and feed the automatic risk score.
 */
export function useDeviceTrust() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || cancelled) return;

      const last = Number(sessionStorage.getItem(SESSION_KEY) ?? 0);
      if (Date.now() - last < INTERVAL_MS) return;
      sessionStorage.setItem(SESSION_KEY, String(Date.now()));

      await registerCurrentDevice();
      await runNetworkCheck("login");
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);
}
