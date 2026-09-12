import { cn } from "@/lib/utils";
import { SmartImage } from "@/components/media/SmartImage";

export function CreatorAvatar({
  name,
  imageUrl,
  className,
  size = "md",
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "size-12 text-lg rounded-xl",
    md: "size-16 text-xl rounded-2xl",
    lg: "size-24 text-5xl rounded-full",
    xl: "size-40 text-5xl rounded-3xl",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden border-[3px] border-border bg-sky",
        sizes[size],
        className,
      )}
    >
      {imageUrl ? (
        <SmartImage src={imageUrl} className="size-full" size={size === "xl" ? "xl" : size === "lg" ? "lg" : "md"} />
      ) : (
        <div className="flex size-full items-center justify-center font-extrabold">
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
}
