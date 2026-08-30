import Link from "next/link";
import { DisplayHeadline } from "@/components/system";
import { exploreHrefForFlavor, FLAVOR_CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/database";

export function FlavorGrid({ categories }: { categories: Category[] }) {
  const slugs = categories.map((c) => c.slug);

  return (
    <section className="space-y-6">
      <div className="text-center">
        <DisplayHeadline as="h2" align="center" size="md" accent="flavor">
          Find your flavor.
        </DisplayHeadline>
        <p className="mt-3 text-neutral-500">Pick a lane. Or don&apos;t. Go viral in all of them.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FLAVOR_CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={exploreHrefForFlavor(cat.slug, cat.aliases, slugs)}
            className={cn(
              "flex min-h-28 items-center justify-center rounded-3xl border-[4px] border-black px-4 py-8 text-center text-2xl font-extrabold shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5",
              cat.color,
              cat.rotate === -1 && "-rotate-1",
              cat.rotate === 1 && "rotate-1",
            )}
          >
            {cat.emoji} {cat.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
