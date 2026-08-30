import { cn } from "@/lib/utils";
import { brandColors, rotateClass, type BrandColor } from "@/lib/design";

const floatClass = {
  tl: "absolute -top-3 -left-3 z-10",
  tr: "absolute -top-3 -right-3 z-10",
  bl: "absolute -bottom-3 -left-3 z-10",
  br: "absolute -bottom-3 -right-3 z-10",
  inline: "relative",
} as const;

export function Badge({
  color = "yellow",
  rotate = 0,
  float = "inline",
  icon,
  pulse = false,
  children,
  className,
}: {
  color?: BrandColor;
  rotate?: -3 | -2 | -1 | 0 | 1 | 2 | 3;
  float?: keyof typeof floatClass;
  icon?: string;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const onBlack = color === "black" || color === "pink";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-[3px] border-black px-3 py-1 text-xs font-extrabold uppercase tracking-wide shadow-[4px_4px_0_#000]",
        brandColors[color],
        onBlack ? "text-cream" : "text-black",
        rotateClass[rotate],
        floatClass[float],
        pulse && "badge-pulse",
        className,
      )}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      {children}
    </span>
  );
}
