"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Gift, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "novastore-early-bird-banner-dismissed";

type Props = {
  used: number;
  max: number;
  trialDays: number;
  remaining: number;
};

/**
 * Fixed floating promo bar pinned to the viewport top while scrolling.
 * (Avoid sticky — parent overflow-x-hidden breaks it.)
 */
export function SignupEarlyBirdTopBanner({
  used,
  max,
  trialDays,
  remaining,
}: Props) {
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(72);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReady(true);
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") {
        setVisible(false);
      }
    } catch {
      // ignore
    }
  }, []);

  useLayoutEffect(() => {
    if (!visible || !ready) return;
    const el = barRef.current;
    if (!el) return;

    const update = () => setHeight(el.offsetHeight || 72);
    update();

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(update)
        : null;
    ro?.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [visible, ready]);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!ready || !visible) return null;

  return (
    <>
      {/* Spacer keeps page content below the fixed bar */}
      <div aria-hidden style={{ height }} className="w-full shrink-0" />

      <div
        ref={barRef}
        role="region"
        aria-label="早鳥優惠"
        className={cn(
          "fixed inset-x-0 top-0 z-[70] w-full border-b border-amber-300/50",
          "bg-gradient-to-r from-amber-400 via-yellow-300 to-sky-400",
          "pt-[env(safe-area-inset-top)]",
          "shadow-[0_10px_36px_-10px_rgba(251,191,36,0.85)]"
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -left-1/4 top-0 h-full w-1/2 animate-pulse bg-white/25 blur-2xl" />
          <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-sky-500/30 to-transparent" />
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-amber-300 shadow-md sm:mt-0 sm:h-10 sm:w-10">
              <Gift className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-display text-sm font-bold tracking-tight text-slate-950 sm:text-base md:text-lg">
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-950 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-300 sm:text-xs">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  早鳥優惠
                </span>
                <span>
                  後台開始試用即享{" "}
                  <span className="rounded bg-slate-950/90 px-1.5 text-amber-300">
                    {trialDays} 天
                  </span>{" "}
                  全功能
                </span>
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-800/90 sm:text-xs">
                限量前 {max} 名・剩餘{" "}
                <span className="font-bold tabular-nums text-slate-950">
                  {remaining}
                </span>{" "}
                席（已登記 {used}/{max}）・全功能可用
              </p>
            </div>
          </div>

          <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto sm:shrink-0">
            <Button
              asChild
              size="sm"
              className="h-9 flex-1 bg-slate-950 text-amber-300 shadow-md hover:bg-slate-900 hover:text-amber-200 sm:flex-none sm:px-4"
            >
              <Link href="/signup" prefetch>
                立刻搶早鳥席次
              </Link>
            </Button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="關閉早鳥優惠橫幅"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-900/70 transition hover:bg-black/10 hover:text-slate-950"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
