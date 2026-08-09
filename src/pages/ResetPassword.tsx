import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated!");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 font-sans">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <main className="relative w-full max-w-md animate-fade-in">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-primary/40 bg-background shadow-neon">
            <img src={logo} alt="" className="h-8 w-8 object-contain" />
          </span>
          <span className="font-display text-xl font-bold tracking-wider text-foreground">
            SURVEY <span className="text-gradient-neon">PARADOX</span>
          </span>
        </Link>

        <div className="glass-panel rounded-xl p-8 shadow-card border-neon">
          <h1 className="font-display text-2xl font-bold text-foreground">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready ? "Choose a strong password you haven't used before." : "Open this page from the reset link in your email."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" className="h-11 w-full text-base shadow-glow" disabled={loading || !ready}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>

          <Link to="/auth" className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
