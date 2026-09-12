import Link from "next/link";
import { cn } from "@/lib/utils";

export function HomeRangeToggle({
  range,
  category,
}: {
  range: "all" | "today";
  category: string;
}) {
  const allHref = category === "all" ? "/" : `/?category=${category}`;
  const todayHref = category === "all" ? "/?range=today" : `/?category=${category}&range=today`;

  return (
    <div className="mx-auto flex w-fit rounded-full border-[3px] border-border bg-card p-1">
      <Link
        href={allHref}
        className={cn(
          "rounded-full px-5 py-1.5 text-sm font-extrabold",
          range === "all" ? "bg-hot-pink text-highlight" : "text-foreground",
        )}
      >
        All-time
      </Link>
      <Link
        href={todayHref}
        className={cn(
          "rounded-full px-5 py-1.5 text-sm font-extrabold",
          range === "today" ? "bg-hot-pink text-highlight" : "text-foreground",
        )}
      >
        Today
      </Link>
    </div>
  );
}
