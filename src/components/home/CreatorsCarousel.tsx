"use client";

import { useRef, useState } from "react";
import { CreatorDirectoryCard } from "@/components/creator/CreatorDirectoryCard";
import { cn } from "@/lib/utils";
import type { Creator } from "@/types/database";

export function CreatorsCarousel({ creators }: { creators: Creator[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ startX: 0, offset: 0, origin: 0 });

  const loop = creators.length ? [...creators, ...creators] : [];

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("a")) return;
    setDragging(true);
    setPaused(true);
    drag.current.startX = e.clientX;
    drag.current.origin = drag.current.offset;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    drag.current.offset = drag.current.origin + (e.clientX - drag.current.startX);
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${drag.current.offset}px)`;
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    setDragging(false);
    if (e.pointerType !== "mouse") setPaused(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (trackRef.current) {
      trackRef.current.style.transform = "";
      drag.current.offset = 0;
    }
  }

  if (!loop.length) return null;

  return (
    <div
      className="group/creators relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        if (!dragging) setPaused(false);
      }}
    >
      <div
        ref={trackRef}
        className={cn(
          "creator-marquee flex w-max gap-4 pr-4",
          paused && "creator-marquee-paused",
          dragging && "cursor-grabbing",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {loop.map((creator, i) => (
          <div
            key={`${creator.id}-${i}`}
            className="w-[min(85vw,280px)] shrink-0 sm:w-[min(42vw,300px)] lg:w-[255px]"
          >
            <CreatorDirectoryCard creator={creator} index={i} />
          </div>
        ))}
      </div>
    </div>
  );
}
