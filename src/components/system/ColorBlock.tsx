import { cn } from "@/lib/utils";
import { brandColors, rotateClass, type BrandColor } from "@/lib/design";

export function ColorBlock({
  color = "cream",
  rotate = 0,
  radius = "3xl",
  padding = "lg",
  className,
  children,
}: {
  color?: BrandColor;
  rotate?: -2 | -1 | 0 | 1 | 2;
  radius?: "2xl" | "3xl";
  padding?: "md" | "lg" | "none";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative border-[4px] border-black shadow-[4px_4px_0_#000]",
        brandColors[color],
        radius === "3xl" ? "rounded-3xl" : "rounded-2xl",
        padding === "lg" && "p-6 sm:p-8",
        padding === "md" && "p-4 sm:p-6",
        rotateClass[rotate],
        className,
      )}
    >
      {children}
    </div>
  );
}
