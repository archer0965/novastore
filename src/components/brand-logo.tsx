import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const MARK_SIZES = {
  sm: 28,
  md: 36,
  lg: 52,
} as const;

/** NovaStore circular brand mark (transparent PNG). */
export function NovaMark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src="/brand-mark.png"
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full", className)}
      priority={size >= 36}
    />
  );
}

export function BrandLogo({
  className,
  href = "/",
  size = "md",
  markOnly = false,
}: {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
  markOnly?: boolean;
}) {
  const textSizes = {
    sm: "text-lg",
    md: "text-xl md:text-2xl",
    lg: "text-3xl md:text-5xl",
  };
  const markPx = MARK_SIZES[size];

  return (
    <Link
      href={href}
      className={cn(
        "font-display inline-flex items-center gap-2 font-bold tracking-tight text-primary",
        textSizes[size],
        className
      )}
    >
      <NovaMark size={markPx} />
      {markOnly ? (
        <span className="sr-only">NovaStore</span>
      ) : (
        <span>NovaStore</span>
      )}
    </Link>
  );
}
