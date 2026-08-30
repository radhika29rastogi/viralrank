import { cn } from "@/lib/utils";

function Accent({
  children,
  invert = false,
}: {
  children: React.ReactNode;
  invert?: boolean;
}) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span
        className={cn(
          "font-marker font-normal",
          invert ? "text-cream" : "text-hot-pink",
        )}
      >
        {children}
      </span>
      <svg
        viewBox="0 0 120 10"
        className="absolute -bottom-1 left-0 h-2.5 w-full"
        aria-hidden
        preserveAspectRatio="none"
      >
        <path
          d="M1 7 C 22 1, 40 9, 60 5 S 98 2, 119 7"
          fill="none"
          stroke={invert ? "#FFF9E8" : "#FF2D95"}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function DisplayHeadline({
  as: Tag = "h1",
  align = "left",
  invert = false,
  size = "lg",
  accent,
  children,
  className,
}: {
  as?: "h1" | "h2" | "h3";
  align?: "left" | "center";
  invert?: boolean;
  size?: "md" | "lg" | "xl";
  accent?: string;
  children: string;
  className?: string;
}) {
  const parts = accent && children.includes(accent) ? children.split(accent) : null;

  return (
    <Tag
      className={cn(
        "font-extrabold tracking-tight text-black",
        size === "xl" && "text-6xl leading-[0.9] sm:text-8xl",
        size === "lg" && "text-5xl leading-[0.95] sm:text-7xl",
        size === "md" && "text-4xl leading-[1] sm:text-5xl",
        invert && "text-cream",
        align === "center" && "text-center",
        className,
      )}
    >
      {parts ? (
        <>
          {parts[0]}
          <Accent invert={invert}>{accent}</Accent>
          {parts.slice(1).join(accent)}
        </>
      ) : (
        children
      )}
    </Tag>
  );
}
