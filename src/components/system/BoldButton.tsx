import Link from "next/link";
import { cn } from "@/lib/utils";

type BoldButtonProps = {
  color?: "pink" | "yellow";
  href?: string;
  icon?: React.ReactNode;
  size?: "md" | "lg";
  fullWidth?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
};

const classes = ({
  color,
  size,
  fullWidth,
  className,
}: Pick<BoldButtonProps, "color" | "size" | "fullWidth" | "className">) =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-xl border-[3px] border-black font-extrabold text-black shadow-[4px_4px_0_#000] transition-[transform,box-shadow] active:translate-y-0.5 active:shadow-none disabled:pointer-events-none disabled:opacity-50",
    color === "yellow" ? "bg-lemon" : "bg-hot-pink",
    color === "pink" && "text-black",
    size === "lg" ? "h-14 px-6 text-base" : "h-11 px-4 text-sm",
    fullWidth && "w-full",
    className,
  );

export function BoldButton({
  color = "pink",
  href,
  icon,
  size = "md",
  fullWidth,
  type = "button",
  disabled,
  className,
  children,
  onClick,
}: BoldButtonProps) {
  const classNameResolved = classes({ color, size, fullWidth, className });
  const content = (
    <>
      {icon}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classNameResolved} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} className={classNameResolved} onClick={onClick}>
      {content}
    </button>
  );
}
