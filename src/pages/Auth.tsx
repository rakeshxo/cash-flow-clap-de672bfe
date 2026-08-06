import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Mail, ArrowLeft, Check } from "lucide-react";
import { z } from "zod";

import logo from "@/assets/logo.png";

const REFERRAL_BONUS = 250;

const emailSchema = z.string().trim().email("Enter a valid email address").max(255);
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be under 72 characters");

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8H1.4v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l3.9-3.1z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l3.9 3.1A7.2 7.2 0 0 1 12 4.8z" />
  </svg>
);

type Mode = "signin" | "signup" | "forgot";

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const refCode = params.get("ref") ?? "";
  const [mode, setMode] = useState<Mode>(refCode ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate("/dashboard", { replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const strength = useMemo(() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);

  const handleReferral = async () => {
    if (!refCode) return;
    // Referral validation + bonus payout happen server-side.
    await supabase.rpc("claim_referral", { _ref_code: refCode });
  };

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    const e = emailSchema.safeParse(email);
    if (!e.success) next.email = e.error.issues[0].message;
    if (mode !== "forgot") {
      const p = mode === "signup" ? passwordSchema.safeParse(password) : z.string().min(1, "Enter your password").safeParse(password);
      if (!p.success) next.password = p.error.issues[0].message;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    if (mode === "login") {
      const remaining = lockoutRemainingMs(email);
      if (remaining > 0) {
        return toast.error(
          `Too many failed attempts. Try again in ${Math.ceil(remaining / 1000)}s or reset your password.`,
        );
      }
    }
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent(true);
        toast.success("Reset link sent — check your inbox.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        if (data.session) await handleReferral();
        if (!data.session) {
          setSent(true);
          toast.success("Check your email to confirm your account.");
        } else {
          toast.success("Account created! You're in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      const msg: string = err?.message ?? "Something went wrong";
      toast.error(
        /invalid login/i.test(msg)
          ? "Incorrect email or password."
          : /already registered/i.test(msg)
          ? "That email already has an account — log in instead."
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed");
        return;
      }
      if (result.redirected) return;
    } catch (err: any) {
      toast.error(err?.message ?? "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const title = mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password";
  const subtitle =
    mode === "signin"
      ? "Log in to keep earning."
      : mode === "signup"
      ? "Start earning in under a minute."
      : "We'll email you a secure link to set a new password.";

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 font-sans">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full bg-accent/15 blur-3xl" />
      <div className="relative w-full max-w-md animate-fade-in">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-primary/40 bg-background shadow-neon">
            <img src={logo} alt="Survey Paradox" className="h-8 w-8 object-contain" />
          </span>
          <span className="font-display text-xl font-bold tracking-wider text-foreground">
            SURVEY <span className="text-gradient-neon">PARADOX</span>
          </span>
        </Link>

        <div className="glass-panel rounded-xl p-8 shadow-card border-neon">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a link to <span className="font-medium text-foreground">{email}</span>. Open it to continue.
              </p>
              <Button
                variant="ghost"
                className="mt-6 w-full"
                onClick={() => {
                  setSent(false);
                  setMode("signin");
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

              {refCode && mode === "signup" && (
                <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
                  🎁 Invited by a friend! You'll get <span className="font-bold text-primary">100 bonus coins</span> when you sign up.
                </div>
              )}

              {mode !== "forgot" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6 h-11 w-full gap-2 text-base"
                    onClick={signInWithGoogle}
                    disabled={googleLoading}
                  >
                    {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                    Continue with Google
                  </Button>
                  <div className="my-5 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className={`space-y-4 ${mode === "forgot" ? "mt-6" : ""}`} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                {mode !== "forgot" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode("forgot");
                            setErrors({});
                          }}
                          className="text-xs text-muted-foreground hover:text-primary"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                        className="pr-10"
                        aria-invalid={!!errors.password}
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
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                    {mode === "signup" && password.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex gap-1.5">
                          {[0, 1, 2, 3].map((i) => (
                            <span
                              key={i}
                              className={`h-1 flex-1 rounded-full transition ${
                                i < strength ? "bg-primary" : "bg-border"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Check className={`h-3 w-3 ${strength >= 3 ? "text-primary" : "opacity-40"}`} />
                          {strength <= 1 ? "Weak" : strength === 2 ? "Fair" : strength === 3 ? "Good" : "Strong"} password
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Button type="submit" className="h-11 w-full text-base shadow-glow" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "signin" ? "Log in" : mode === "signup" ? "Create account" : "Send reset link"}
                </Button>
              </form>

              {mode === "signup" && (
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  By creating an account you agree to our terms and privacy policy.
                </p>
              )}

              <button
                onClick={() => {
                  setErrors({});
                  setMode(mode === "signin" ? "signup" : "signin");
                }}
                className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                {mode === "signin"
                  ? "New here? Create an account"
                  : mode === "signup"
                  ? "Already have an account? Log in"
                  : "Back to login"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
