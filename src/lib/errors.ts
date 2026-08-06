import { toast } from "sonner";

/**
 * Maps raw backend/network errors to messages a respondent or admin can act on.
 * Never surface stack traces, SQL text or internal identifiers to the UI.
 */
export function friendlyError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw =
    typeof err === "string"
      ? err
      : (err as any)?.message ?? (err as any)?.error_description ?? "";

  if (!raw) return fallback;

  const map: [RegExp, string][] = [
    [/failed to fetch|network|fetch failed/i, "Connection problem. Check your internet and try again."],
    [/jwt|token .*expired|not authenticated/i, "Your session expired. Please sign in again."],
    [/row-level security|permission denied|not authorized/i, "You don't have permission to do that."],
    [/invalid login/i, "Incorrect email or password."],
    [/already registered/i, "That email already has an account — log in instead."],
    [/duplicate key|unique constraint/i, "That already exists."],
    [/timeout|timed out/i, "The request took too long. Please try again."],
  ];
  for (const [re, msg] of map) if (re.test(raw)) return msg;

  // Database RAISE EXCEPTION messages are written to be user-facing already.
  return raw.replace(/^ERROR:\s*/i, "").slice(0, 240) || fallback;
}

export function toastError(err: unknown, fallback?: string) {
  toast.error(friendlyError(err, fallback));
}

/** Retries transient read failures with exponential backoff. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 300 }: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = (err as any)?.message ?? "";
      const transient = /failed to fetch|network|timeout|503|502|504/i.test(msg);
      if (!transient || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
    }
  }
  throw lastErr;
}
