import Image from "next/image";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: 28,
  md: 64,
  lg: 80,
  xl: 160,
} as const;

function unoptimizedSrc(src: string) {
  if (src.startsWith("/")) return false;
  try {
    const host = new URL(src).hostname;
    return !/(cdninstagram\.com|fbcdn\.net|supabase\.co|unsplash\.com|dicebear\.com|instagram\.com)$/i.test(host);
  } catch {
    return true;
  }
}

export function SmartImage({
  src,
  alt = "",
  size = "md",
  className,
  priority = false,
}: {
  src: string;
  alt?: string;
  size?: keyof typeof sizeMap;
  className?: string;
  priority?: boolean;
}) {
  const px = sizeMap[size];
  return (
    <Image
      src={src}
      alt={alt}
      width={px}
      height={px}
      className={cn("object-cover", className)}
      sizes={`${px}px`}
      priority={priority}
      unoptimized={unoptimizedSrc(src)}
    />
  );
}
