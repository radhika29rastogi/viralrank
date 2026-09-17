"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { categoryIcon } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/database";

function categoryHref(slug: string, range: "all" | "today", basePath: string) {
  if (basePath === "/") {
    return slug === "all"
      ? range === "today"
        ? "/?range=today"
        : "/"
      : `/?category=${slug}${range === "today" ? "&range=today" : ""}`;
  }
  const params = new URLSearchParams();
  if (slug !== "all") params.set("category", slug);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function CategoryPill({
  href,
  active,
  icon,
  label,
  analytics,
}: {
  href: string;
  active: boolean;
  icon: string;
  label: string;
  analytics?: string;
}) {
  return (
    <Link
      href={href}
      data-analytics={analytics}
      className={cn(
        "shrink-0 rounded-full border-[3px] border-border px-4 py-1.5 text-sm font-extrabold",
        active ? "bg-hot-pink text-highlight" : "bg-card text-foreground",
      )}
    >
      {icon} {label}
    </Link>
  );
}

export function CategoryMoreMenu({
  categories,
  active,
  range,
  basePath = "/",
}: {
  categories: Category[];
  active: string;
  range: "all" | "today";
  basePath?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const moreActive = categories.some((c) => c.slug === active);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (categories.length === 0) return null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        data-analytics="home_category_more"
        className={cn(
          "inline-flex items-center gap-1 rounded-full border-[3px] border-border px-4 py-1.5 text-sm font-extrabold",
          moreActive || open ? "bg-hot-pink text-highlight" : "bg-card text-foreground",
        )}
      >
        More
        <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute top-[calc(100%+0.5rem)] right-0 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border-[3px] border-border bg-card p-3 shadow-[4px_4px_0_#000]"
        >
          <p className="mb-2 text-xs font-extrabold text-muted-foreground">More categories</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <CategoryPill
                key={cat.slug}
                href={categoryHref(cat.slug, range, basePath)}
                active={active === cat.slug}
                icon={categoryIcon(cat.slug, cat.icon)}
                label={cat.name}
                analytics="home_category_more_pick"
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
