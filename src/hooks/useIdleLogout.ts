import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const IDLE_MS = 30 * 60 * 1000; // 30 minutes
const WARN_MS = 2 * 60 * 1000; // warn 2 minutes before

/**
 * Enterprise session hygiene: signs the user out after a period of inactivity
 * and warns shortly before doing so.
 */
export function useIdleLogout(enabled = true) {
  const navigate = useNavigate();
  const timers = useRef<{ warn?: number; out?: number }>({});

  useEffect(() => {
    if (!enabled) return;

    const clear = () => {
      window.clearTimeout(timers.current.warn);
      window.clearTimeout(timers.current.out);
    };

    const schedule = () => {
      clear();
      timers.current.warn = window.setTimeout(() => {
        toast.warning("You'll be signed out soon due to inactivity.");
      }, IDLE_MS - WARN_MS);
      timers.current.out = window.setTimeout(async () => {
        await supabase.auth.signOut();
        toast.error("Signed out after 30 minutes of inactivity.");
        navigate("/auth", { replace: true });
      }, IDLE_MS);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart", "visibilitychange"];
    events.forEach((e) => window.addEventListener(e, schedule, { passive: true }));
    schedule();

    return () => {
      clear();
      events.forEach((e) => window.removeEventListener(e, schedule));
    };
  }, [enabled, navigate]);
}
