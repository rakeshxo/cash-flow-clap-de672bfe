import { ReactNode, useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Coins,
  LogOut,
  LayoutDashboard,
  Sparkles,
  Wallet,
  User as UserIcon,
  Bell,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { coinsToCash, formatCoins, getBalance } from "@/lib/coins";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { useDeviceTrust } from "@/hooks/useDeviceTrust";
import { useAccountStatus } from "@/hooks/useAccountStatus";
import { AlertTriangle } from "lucide-react";


const navItems = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/earn", label: "Earn", icon: Sparkles },
  { to: "/withdraw", label: "Withdraw", icon: Wallet },
  { to: "/profile", label: "Profile", icon: UserIcon },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const { status, reason } = useAccountStatus();
  const [balance, setBalance] = useState(0);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useIdleLogout();
  useDeviceTrust();




  const items = isAdmin
    ? [...navItems, { to: "/admin", label: "Admin", icon: Shield }]
    : navItems;

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const uid = data.session.user.id;
      const [bal, notifs] = await Promise.all([
        getBalance(uid),
        supabase.from("notifications").select("id").eq("user_id", uid).eq("read", false),
      ]);
      if (!active) return;
      setBalance(bal);
      setUnread(notifs.data?.length ?? 0);
    };
    load();
    const t = setInterval(load, 8000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-soft font-sans">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 hover:bg-secondary md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
                <Coins className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-foreground">PollPay</span>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {items.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/activity"
              className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Activity"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {unread}
                </span>
              )}
            </Link>
            <div className="hidden items-center gap-2 rounded-xl bg-gradient-hero px-3 py-1.5 text-primary-foreground shadow-glow sm:flex">
              <Coins className="h-4 w-4" />
              <div className="leading-tight">
                <p className="text-[10px] opacity-90">Balance</p>
                <p className="font-display text-sm font-bold">
                  {formatCoins(balance)} <span className="text-[10px] opacity-90">({coinsToCash(balance)})</span>
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <aside
            className="absolute left-0 top-0 h-full w-72 bg-card p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-bold">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-gradient-hero p-3 text-primary-foreground">
              <Coins className="h-5 w-5" />
              <div>
                <p className="text-xs opacity-90">Balance</p>
                <p className="font-display text-lg font-bold">
                  {formatCoins(balance)} ({coinsToCash(balance)})
                </p>
              </div>
            </div>
            <nav className="flex flex-col gap-1">
              {items.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      isActive ? "bg-secondary text-foreground" : "text-muted-foreground"
                    }`
                  }
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {status !== "active" && (
        <div
          className={`border-b px-4 py-3 text-sm ${
            status === "suspended"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-accent/40 bg-accent/10 text-accent"
          }`}
        >
          <div className="container mx-auto flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <strong className="font-semibold">
                {status === "suspended" ? "Account suspended." : "Account under review."}
              </strong>{" "}
              {reason ||
                (status === "suspended"
                  ? "Earning and withdrawals are disabled. Contact support."
                  : "You can keep earning, but withdrawals are paused until the review completes.")}
            </p>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">{children}</main>

    </div>
  );
};
