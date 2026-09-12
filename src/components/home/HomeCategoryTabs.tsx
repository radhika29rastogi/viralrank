import Link from "next/link";
import { ARENA_CATEGORY_TABS } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function HomeCategoryTabs({
  active,
  range,
}: {
  active: string;
  range: "all" | "today";
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" data-analytics="home_category_tabs">
      {ARENA_CATEGORY_TABS.map((tab) => {
        const href =
          tab.slug === "all"
            ? range === "today"
              ? "/?range=today"
              : "/"
            : `/?category=${tab.slug}${range === "today" ? "&range=today" : ""}`;
        const isActive = active === tab.slug;
        return (
          <Link
            key={tab.slug}
            href={href}
            className={cn(
              "shrink-0 rounded-full border-[3px] border-border px-4 py-1.5 text-sm font-extrabold",
              isActive ? "bg-hot-pink text-highlight" : "bg-card text-foreground",
            )}
          >
            {tab.emoji} {tab.label}
          </Link>
        );
      })}
      <Link
        href="/explore"
        className="shrink-0 rounded-full border-[3px] border-border bg-lemon px-4 py-1.5 text-sm font-extrabold text-on-accent"
      >
        Explore →
      </Link>
    </div>
  );
}
