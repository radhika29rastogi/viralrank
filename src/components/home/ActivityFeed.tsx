"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/system";
import { formatInr } from "@/lib/format";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { ArenaEvent } from "@/types/live";

const colors = ["yellow", "pink", "blue", "lime"] as const;

function labelFor(event: ArenaEvent) {
  if (event.kind === "bid") {
    const rank = event.rank ? `#${event.rank}` : "the board";
    return `@${event.username} just took ${rank} for ${formatInr(event.amount ?? 0)}`;
  }
  if (event.kind === "hype") {
    return `someone hyped @${event.username} for ${formatInr(event.amount ?? 0)}`;
  }
  return `@${event.username} joined the arena`;
}

function iconFor(kind: ArenaEvent["kind"]) {
  if (kind === "bid") return "🏆";
  if (kind === "hype") return "🔥";
  return "🆕";
}

export function ActivityFeed({ initial }: { initial: ArenaEvent[] }) {
  const [events, setEvents] = useState(initial);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    async function refresh() {
      const res = await fetch("/api/activity");
      if (!res.ok) return;
      const json = (await res.json()) as { events?: ArenaEvent[] };
      if (json.events) setEvents(json.events);
    }

    const channel = supabase
      .channel("arena-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "creator_ranking_bids" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "creator_hypes" }, () => {
        void refresh();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "creators" }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const chips =
    events.length > 0
      ? events
      : [
          {
            id: "empty",
            kind: "join" as const,
            username: "the-arena",
            created_at: new Date().toISOString(),
          },
        ];

  const loop = chips.length === 1 && chips[0].id === "empty" ? chips : [...chips, ...chips];

  return (
    <div className="group/ticker overflow-hidden border-y-[4px] border-black bg-ink py-3" aria-label="Live activity">
      <div className={`ticker-track flex w-max items-center gap-3 px-3 ${chips.length < 2 ? "animate-none" : ""}`}>
        {loop.map((event, i) => (
          <Badge
            key={`${event.id}-${i}`}
            color={event.id === "empty" ? "yellow" : colors[i % colors.length]}
            icon={event.id === "empty" ? "⚡" : iconFor(event.kind)}
          >
            {event.id === "empty"
              ? "Waiting for the first drop"
              : labelFor(event)}
          </Badge>
        ))}
      </div>
    </div>
  );
}
