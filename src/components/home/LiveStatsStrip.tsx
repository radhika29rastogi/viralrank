"use client";

import { useEffect, useState } from "react";
import { formatCompactInr, formatNumber } from "@/lib/format";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { LiveStats } from "@/types/live";

function useCountUp(value: number) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = display;
    const end = value;
    if (start === end) return;
    const duration = 900;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate from last painted value
  }, [value]);

  return display;
}

export function LiveStatsStrip({ initial }: { initial: LiveStats }) {
  const [stats, setStats] = useState(initial);
  const creators = useCountUp(stats.creatorsRanked);
  const moved = useCountUp(stats.movedThisWeek);
  const views = useCountUp(stats.profileViews);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const res = await fetch("/api/live-stats");
      if (!res.ok || cancelled) return;
      const next = (await res.json()) as LiveStats;
      setStats(next);
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel("live-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "creator_ranking_bids" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "creator_hypes" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "creators" }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="border-b-[4px] border-black bg-cream px-4 py-2">
      <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs font-extrabold text-black sm:text-sm">
        <span>🔥 {formatNumber(creators)} creators ranked</span>
        <span aria-hidden>·</span>
        <span>⚡ {formatCompactInr(moved)} moved this week</span>
        <span aria-hidden>·</span>
        <span>👀 {formatNumber(views)} profile views</span>
      </p>
    </div>
  );
}
