import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Coins, Wallet, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { coinsToCash, formatCoins, getBalance } from "@/lib/coins";
import { toastError, withRetry } from "@/lib/errors";
import { useAccountStatus } from "@/hooks/useAccountStatus";
import { DataState } from "@/components/DataState";

const MIN_WITHDRAW = 500;

const METHODS = [
  { id: "paypal", label: "PayPal", placeholder: "you@paypal.com" },
  { id: "bank", label: "Bank transfer", placeholder: "IBAN / account number" },
  { id: "crypto", label: "Crypto (USDT)", placeholder: "Wallet address" },
];

const validateDestination = (method: string, value: string): string | null => {
  const v = value.trim();
  if (!v) return "Enter your payout destination";
  if (v.length > 200) return "Destination is too long";
  if (method === "paypal" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Enter a valid PayPal email";
  if (method === "bank" && v.length < 8) return "Enter a valid account number or IBAN";
  if (method === "crypto" && v.length < 20) return "Enter a valid wallet address";
  return null;
};

const Withdraw = () => {
  const [balance, setBalance] = useState(0);
  const [userId, setUserId] = useState("");
  const [method, setMethod] = useState("paypal");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState<number>(MIN_WITHDRAW);
  const [history, setHistory] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { status: accountStatus, reason: accountReason } = useAccountStatus();

  const refresh = async (uid: string) => {
    setLoadError(null);
    try {
      const [bal, h] = await withRetry(() =>
        Promise.all([
          getBalance(uid),
          supabase.from("withdrawals").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        ]),
      );
      setBalance(bal);
      setHistory(h.data ?? []);
    } catch (err) {
      setLoadError("We couldn't load your withdrawal data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        setLoading(false);
        return;
      }
      setUserId(sess.session.user.id);
      refresh(sess.session.user.id);
    })();
  }, []);

  const pendingExists = history.some((h) => h.status === "pending");

  const openConfirm = () => {
    const destError = validateDestination(method, destination);
    if (destError) return toast.error(destError);
    if (!Number.isInteger(amount) || amount < MIN_WITHDRAW) return toast.error(`Minimum withdrawal is ${MIN_WITHDRAW} coins`);
    if (amount > balance) return toast.error("Not enough coins");
    if (pendingExists) return toast.error("You already have a pending withdrawal.");
    setConfirmOpen(true);
  };

  const submit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      // Re-validate the session with the auth server before moving money.
      const { data: fresh, error: authErr } = await supabase.auth.getUser();
      if (authErr || !fresh.user) throw new Error("Your session expired. Please sign in again.");

      const { error } = await supabase.rpc("request_withdrawal", {
        _coins: amount,
        _method: method,
        _destination: destination.trim(),
      });
      if (error) throw error;
      toast.success("Withdrawal requested — our team reviews payouts within 24h.");
      setDestination("");
      setAmount(MIN_WITHDRAW);
      refresh(userId);
    } catch (err) {
      toastError(err, "Withdrawal could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  const blocked = accountStatus !== "active";
  const canWithdraw = balance >= MIN_WITHDRAW && !blocked && !pendingExists;
  const selectedMethod = METHODS.find((m) => m.id === method)!;


  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
            <Wallet className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Withdraw cash</h1>
            <p className="text-muted-foreground">Cash out directly once you reach {MIN_WITHDRAW} coins.</p>
          </div>
        </div>
        <div className="rounded-xl bg-gradient-hero px-4 py-3 text-primary-foreground shadow-glow">
          <p className="text-xs opacity-90">Balance</p>
          <p className="font-display text-xl font-bold">{formatCoins(balance)}</p>
          <p className="text-xs opacity-90">{coinsToCash(balance)}</p>
        </div>
      </div>

      {!canWithdraw && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <p className="font-display font-bold text-foreground">
            You need {formatCoins(MIN_WITHDRAW - balance)} more coins to withdraw.
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-gradient-hero transition-all" style={{ width: `${Math.min(100, (balance / MIN_WITHDRAW) * 100)}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatCoins(balance)} / {formatCoins(MIN_WITHDRAW)} coins
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-xl font-bold text-foreground">Request withdrawal</h2>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Payout method</Label>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    method === m.id
                      ? "bg-gradient-hero text-primary-foreground shadow-glow"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">{selectedMethod.label} destination</Label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={selectedMethod.placeholder}
            />
          </div>

          <div>
            <Label className="mb-2 block">Amount (coins) — min {MIN_WITHDRAW}</Label>
            <Input
              type="number"
              min={MIN_WITHDRAW}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-muted-foreground">≈ {coinsToCash(amount)}</p>
          </div>

          <Button onClick={submit} disabled={!canWithdraw || submitting} className="w-full" size="lg">
            <Coins className="mr-2 h-4 w-4" />
            {submitting ? "Submitting..." : `Withdraw ${formatCoins(amount)} coins (${coinsToCash(amount)})`}
          </Button>
        </div>
      </div>

      {history.length > 0 && (
        <>
          <h2 className="mb-4 mt-10 font-display text-xl font-bold text-foreground">Withdrawal history</h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between border-b border-border p-4 last:border-0">
                <div>
                  <p className="font-medium text-foreground capitalize">{h.method} — {h.destination}</p>
                  <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-foreground">-{formatCoins(h.coins_amount)}</p>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-secondary-foreground">{h.status}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AppLayout>
  );
};

export default Withdraw;
