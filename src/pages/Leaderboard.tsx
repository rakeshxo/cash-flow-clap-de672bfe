import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Trophy, Coins } from "lucide-react";
import { formatCoins } from "@/lib/coins";

const Leaderboard = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [me, setMe] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      setMe(sess.session?.user.id ?? "");
      const { data } = await supabase.from("weekly_leaderboard" as any).select("*");
      setRows(data ?? []);
    })();
  }, []);

  return (
    <AppLayout>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
          <Trophy className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Weekly leaderboard</h1>
          <p className="text-muted-foreground">Top earners over the last 7 days.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No earnings yet this week. Be the first!</p>
        ) : rows.map((r, i) => {
          const rank = i + 1;
          const isMe = r.user_id === me;
          return (
            <div key={r.user_id} className={`flex items-center gap-4 border-b border-border p-4 last:border-0 ${isMe ? "bg-secondary/60" : ""}`}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-full font-display font-bold ${
                rank === 1 ? "bg-accent text-accent-foreground" :
                rank === 2 ? "bg-secondary text-secondary-foreground" :
                rank === 3 ? "bg-secondary/60 text-secondary-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                {rank}
              </div>
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-hero font-display font-bold text-primary-foreground">
                {r.avatar_url ? <img src={r.avatar_url} alt="" className="h-full w-full object-cover" /> : (r.display_name?.[0]?.toUpperCase() ?? "?")}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground capitalize">{r.display_name} {isMe && <span className="ml-2 text-xs text-primary">(you)</span>}</p>
              </div>
              <div className="flex items-center gap-1 font-display font-bold text-primary">
                <Coins className="h-4 w-4" /> {formatCoins(r.coins_earned)}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default Leaderboard;
