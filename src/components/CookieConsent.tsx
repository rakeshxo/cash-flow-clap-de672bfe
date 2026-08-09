import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "sp_cookie_consent";

export type ConsentValue = "all" | "essential";

export const getCookieConsent = (): ConsentValue | null => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "all" || v === "essential" ? v : null;
  } catch {
    return null;
  }
};

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const decide = (value: ConsentValue) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
      localStorage.setItem(`${STORAGE_KEY}_at`, new Date().toISOString());
    } catch {
      /* storage unavailable */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4 animate-slide-up"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-xl border border-border bg-card/95 p-4 shadow-card backdrop-blur sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-background/60 text-primary shadow-neon">
            <Cookie className="h-4 w-4" />
          </span>
          <p className="text-xs leading-relaxed text-muted-foreground">
            We use essential cookies to keep you signed in and to keep the platform secure. With your
            permission we also use optional cookies to understand how the site is used so we can improve it.
            Read our{" "}
            <Link to="/privacy" className="text-primary underline underline-offset-2">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link to="/terms" className="text-primary underline underline-offset-2">
              Terms
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" onClick={() => decide("essential")}>
            Essential only
          </Button>
          <Button size="sm" onClick={() => decide("all")}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
