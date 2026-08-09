import { ReactNode, useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Coins,
  LogOut,
  LayoutDashboard,
  Sparkles,
  Wallet,
  User as UserIcon,
  Bell,
  Menu,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { coinsToCash, formatCoins, getBalance } from "@/lib/coins";
import { useStaffRoles } from "@/hooks/useStaffRoles";
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
  const { isStaff: isAdmin } = useStaffRoles();
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
    <div className="min-h-dvh bg-gradient-soft font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-card focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 hover:bg-secondary md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-nav"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
                <Coins className="h-5 w-5 text-primary-foreground" aria-hidden />
              </div>
              <span className="font-display text-xl font-bold text-foreground">PollPay</span>
            </Link>
          </div>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
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
              aria-label={unread > 0 ? `Activity, ${unread} unread` : "Activity"}
            >
              <Bell className="h-5 w-5" aria-hidden />
              {unread > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground"
                >
                  {unread}
                </span>
              )}
            </Link>
            <div className="hidden items-center gap-2 rounded-xl bg-gradient-hero px-3 py-1.5 text-primary-foreground shadow-glow sm:flex">
              <Coins className="h-4 w-4" aria-hidden />
              <div className="leading-tight">
                <p className="text-[10px] opacity-90" id="balance-label">Balance</p>
                <p className="font-display text-sm font-bold" aria-labelledby="balance-label" aria-live="polite">
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

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" id="mobile-nav" className="w-72 bg-card p-4 md:hidden">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="font-display text-lg font-bold">Menu</SheetTitle>
          </SheetHeader>
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-gradient-hero p-3 text-primary-foreground">
            <Coins className="h-5 w-5" aria-hidden />
            <div>
              <p className="text-xs opacity-90" id="balance-label-mobile">Balance</p>
              <p className="font-display text-lg font-bold" aria-labelledby="balance-label-mobile">
                {formatCoins(balance)} ({coinsToCash(balance)})
              </p>
            </div>
          </div>
          <nav className="flex flex-col gap-1" aria-label="Main">
            {items.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive ? "bg-secondary text-foreground" : "text-muted-foreground"
                  }`
                }
              >
                <n.icon className="h-4 w-4" aria-hidden />
                {n.label}
              </NavLink>
            ))}
          </nav>
        </SheetContent>
      </Sheet>


      {status !== "active" && (
        <div
          role="status"
          className={`border-b px-4 py-3 text-sm ${
            status === "suspended"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-accent/40 bg-accent/10 text-accent"
          }`}
        >
          <div className="container mx-auto flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
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

      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 focus:outline-none">
        {children}
      </main>

    </div>
  );
};
