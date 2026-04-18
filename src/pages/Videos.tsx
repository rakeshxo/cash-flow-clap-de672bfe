import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { PlayCircle, Coins, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { awardCoins } from "@/lib/coins";

const Videos = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [playing, setPlaying] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      const uid = sess.session.user.id;
      setUserId(uid);
      const [v, w] = await Promise.all([
        supabase.from("videos").select("*").order("created_at"),
        supabase.from("video_watches").select("video_id").eq("user_id", uid),
      ]);
      setVideos(v.data ?? []);
      setWatched(new Set((w.data ?? []).map((x) => x.video_id)));
    })();
  }, []);

  const watch = (video: any) => {
    if (watched.has(video.id)) return;
    setPlaying(video.id);
    setProgress(0);
    const start = Date.now();
    const duration = Math.min(video.duration_seconds, 10) * 1000; // cap simulation at 10s
    const interval = setInterval(async () => {
      const pct = Math.min(100, ((Date.now() - start) / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        await supabase.from("video_watches").insert({ user_id: userId, video_id: video.id, reward_coins: video.reward_coins });
        await awardCoins({ userId, amount: video.reward_coins, type: "video", description: `Watched: ${video.title}`, referenceId: video.id });
        setWatched((s) => new Set(s).add(video.id));
        setPlaying(null);
        toast.success(`+${video.reward_coins} coins!`);
      }
    }, 100);
  };

  return (
    <AppLayout>
      <h1 className="mb-2 font-display text-3xl font-bold text-foreground">Watch & earn</h1>
      <p className="mb-8 text-muted-foreground">Watch short videos to earn coins.</p>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => {
          const isPlaying = playing === v.id;
          const isWatched = watched.has(v.id);
          return (
            <article key={v.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <div className="relative aspect-video bg-secondary">
                {v.thumbnail_url && <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover" loading="lazy" />}
                {isPlaying && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-foreground/60 text-primary-foreground">
                    <p className="mb-2 font-display text-sm">Watching... {Math.round(progress)}%</p>
                    <div className="h-1.5 w-2/3 overflow-hidden rounded-full bg-card/30">
                      <div className="h-full bg-primary-glow" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className="mb-2 w-fit rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{v.category}</span>
                <h3 className="font-display text-base font-bold text-foreground">{v.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{v.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm font-semibold text-primary"><Coins className="h-4 w-4" /> {v.reward_coins}</span>
                  {isWatched ? (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" /> Watched</span>
                  ) : (
                    <Button size="sm" disabled={isPlaying} onClick={() => watch(v)}>
                      <PlayCircle className="mr-1 h-4 w-4" /> {isPlaying ? "Playing" : "Watch"}
                    </Button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default Videos;
