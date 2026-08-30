import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  href = "/",
  size = "md",
}: {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: { img: 32, text: "text-base" },
    md: { img: 40, text: "text-lg sm:text-xl" },
    lg: { img: 56, text: "text-2xl" },
  } as const;
  const dim = sizes[size];

  return (
    <Link
      href={href}
      className={cn("inline-flex shrink-0 items-center gap-2.5", className)}
      aria-label="ViralRank.buzz home"
    >
      <Image
        src="/viralrank-logo.jpg"
        alt=""
        width={dim.img}
        height={dim.img}
        className="size-8 rounded-lg border-2 border-black shadow-[2px_2px_0_#000] sm:size-10"
        priority
      />
      <span className={cn("font-extrabold tracking-tight text-black", dim.text)}>
        ViralRank.buzz
      </span>
    </Link>
  );
}
