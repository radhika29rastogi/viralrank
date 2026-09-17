import Link from "next/link";
import { ARENA_CATEGORY_TABS, categoryIcon, splitNavCategories } from "@/lib/categories";
import { CategoryMoreMenu, CategoryPill } from "@/components/home/CategoryMoreMenu";
import type { Category } from "@/types/database";

export function HomeCategoryTabs({
  active,
  range,
  categories = [],
}: {
  active: string;
  range: "all" | "today";
  categories?: Category[];
}) {
  const fromDb = categories.filter((c) => c.slug && c.name);
  const { primary, more } =
    fromDb.length > 0
      ? splitNavCategories(fromDb)
      : {
          primary: ARENA_CATEGORY_TABS.filter((tab) => tab.slug !== "all").map((tab) => ({
            id: tab.slug,
            name: tab.label,
            slug: tab.slug,
            icon: tab.emoji,
          })),
          more: [] as Category[],
        };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" data-analytics="home_category_tabs">
      <CategoryPill
        href={range === "today" ? "/?range=today" : "/"}
        active={active === "all"}
        icon="🔥"
        label="All"
        analytics="home_category_all"
      />
      {primary.map((tab) => {
        const href = `/?category=${tab.slug}${range === "today" ? "&range=today" : ""}`;
        return (
          <CategoryPill
            key={tab.slug}
            href={href}
            active={active === tab.slug}
            icon={categoryIcon(tab.slug, tab.icon)}
            label={tab.name}
          />
        );
      })}
      <CategoryMoreMenu categories={more} active={active} range={range} />
      <Link
        href="/explore"
        className="shrink-0 rounded-full border-[3px] border-border bg-lemon px-4 py-1.5 text-sm font-extrabold text-on-accent"
      >
        Explore →
      </Link>
    </div>
  );
}
