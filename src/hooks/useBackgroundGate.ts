import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Redirects to /onboarding if the user hasn't completed the background check.
 * Returns { checking } so pages can show a loader until the gate decides.
 */
export function useBackgroundGate() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate("/auth", { replace: true });
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("background_completed")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (!data?.background_completed) {
        navigate("/onboarding", { replace: true });
        return;
      }
      setChecking(false);
    })();
  }, [navigate]);

  return { checking };
}
