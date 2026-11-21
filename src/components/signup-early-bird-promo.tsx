import Link from "next/link";
import { SIGNUP_EARLY_BIRD } from "@/types/database";

/** Compact early-bird signup promo (hidden by parent when seats full). */
export function SignupEarlyBirdPromo({
  used,
  max,
  className = "",
}: {
  used: number;
  max: number;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-accent/35 bg-accent/10 px-2.5 py-1.5 text-sm text-accent-foreground ${className}`}
    >
      <span className="font-semibold">{SIGNUP_EARLY_BIRD.label}</span>
      <span className="text-accent-foreground/90">
        {SIGNUP_EARLY_BIRD.description}
      </span>
      <span className="tabular-nums text-xs text-accent-foreground/70">
        已登記 {used}/{max}
      </span>
    </div>
  );
}

export function SignupEarlyBirdCtaNote({ open }: { open: boolean }) {
  if (!open) return null;
  return (
    <p className="mt-3 text-sm font-medium text-amber-800">
      {SIGNUP_EARLY_BIRD.description} —{" "}
      <Link href="/signup" className="underline underline-offset-2">
        立即註冊
      </Link>
    </p>
  );
}
