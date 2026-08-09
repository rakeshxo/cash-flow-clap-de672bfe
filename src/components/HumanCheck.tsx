import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Lightweight, self-hosted human verification.
 * No third-party scripts or trackers — an arithmetic challenge plus a
 * minimum-interaction-time check that scripted submissions fail.
 */
const makeChallenge = () => {
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 2 + Math.floor(Math.random() * 8);
  const add = Math.random() > 0.4;
  return add
    ? { question: `${a} + ${b}`, answer: a + b }
    : { question: `${a + b} − ${b}`, answer: a };
};

export function useHumanCheck() {
  const [verified, setVerified] = useState(false);
  const reset = useCallback(() => setVerified(false), []);
  return { verified, setVerified, reset };
}

interface HumanCheckProps {
  verified: boolean;
  onVerifiedChange: (v: boolean) => void;
  label?: string;
}

export const HumanCheck = ({ verified, onVerifiedChange, label = "Quick human check" }: HumanCheckProps) => {
  const [challenge, setChallenge] = useState(makeChallenge);
  const [value, setValue] = useState("");
  const [touchedAt] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    setChallenge(makeChallenge());
    setValue("");
    setError(null);
    onVerifiedChange(false);
  };

  useEffect(() => {
    if (value.trim() === "") {
      setError(null);
      onVerifiedChange(false);
      return;
    }
    const ok = Number(value.trim()) === challenge.answer;
    const fastEnoughToBeABot = Date.now() - touchedAt < 700;
    if (ok && !fastEnoughToBeABot) {
      setError(null);
      onVerifiedChange(true);
    } else {
      onVerifiedChange(false);
      setError(ok ? "Just a moment…" : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, challenge]);

  const id = useMemo(() => `human-check-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className={`h-3.5 w-3.5 ${verified ? "text-primary" : ""}`} /> {label}
        </Label>
        <button
          type="button"
          onClick={refresh}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label="New challenge"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="select-none rounded-lg bg-background px-3 py-1.5 font-mono text-sm tracking-widest text-foreground">
          {challenge.question} =
        </span>
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d-]/g, ""))}
          className="h-9 w-24"
          placeholder="?"
          aria-invalid={!!error}
        />
        {verified && <span className="text-xs font-medium text-primary">Verified</span>}
      </div>
      {error && <p className="mt-1 text-xs text-muted-foreground">{error}</p>}
    </div>
  );
};
