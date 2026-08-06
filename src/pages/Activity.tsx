import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Coins, Bell } from "lucide-react";
import Seo from "@/components/Seo";

const Activity = () => {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      const uid = sess.session.user.id;
      const { data } = await supabase.from("notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(100);
      setItems(data ?? []);
      // mark read
      await supabase.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
    })();
  }, []);

  return (
    <AppLayout>
      <Seo title="Activity History — Survey Paradox" description="Review every coin you have earned, survey claim status, and withdrawal activity on Survey Paradox." path="/activity" noindex />
      <h1 className="mb-2 font-display text-3xl font-bold text-foreground">Activity</h1>
      <p className="mb-8 text-muted-foreground">Everything that happened on your account.</p>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {items.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No activity yet — start earning to fill this up!</p>
        ) : items.map((n) => (
          <div key={n.id} className="flex items-start gap-3 border-b border-border p-4 last:border-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
              {n.icon === "coin" ? <Coins className="h-4 w-4 text-primary" /> : <Bell className="h-4 w-4 text-primary" />}
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{n.title}</p>
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
};

export default Activity;
