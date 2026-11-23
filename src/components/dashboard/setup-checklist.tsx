"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  BellRing,
  Check,
  Link2,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

const DISMISS_KEY = "paycheck_onboarding_done_v1";

type StepDef = {
  id: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
  done: boolean;
  icon: typeof BellRing;
};

function buildSteps(profile: Profile): StepDef[] {
  return [
    {
      id: "line",
      title: "綁定 LINE 通知",
      desc: "填寫 User ID；可再設定自有官方帳號 Token 獨立推播。",
      href: "/dashboard/settings#line",
      cta: "前往綁定",
      done: Boolean(profile.line_user_id?.trim()),
      icon: BellRing,
    },
    {
      id: "bank",
      title: "設定收款帳號",
      desc: "填寫銀行代碼與帳號，顯示在買家填單頁供對帳。",
      href: "/dashboard/settings#bank",
      cta: "前往設定",
      done: Boolean(
        profile.bank_code?.trim() && profile.bank_account?.trim()
      ),
      icon: Banknote,
    },
    {
      id: "link",
      title: "建立第一個對帳連結",
      desc: "填好店名後即可產出專屬買家填單頁，複製分享即可。",
      href: "/dashboard#share-link",
      cta: "查看連結",
      done: Boolean(profile.shop_name?.trim()),
      icon: Link2,
    },
  ];
}

/** New-user onboarding: 3-step progress until shop is ready. */
export function SetupChecklist({ profile }: { profile: Profile }) {
  const steps = useMemo(() => buildSteps(profile), [profile]);
  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const percent = Math.round((doneCount / total) * 100);
  const allDone = doneCount === total;

  const [dismissed, setDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  // Avoid hydration flash; wait until we know dismiss state.
  if (!mounted) {
    if (allDone) return null;
    return (
      <section
        aria-hidden
        className="h-40 animate-pulse rounded-2xl bg-secondary/60"
      />
    );
  }

  if (allDone && dismissed) return null;

  if (allDone) {
    return (
      <section className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-sky-50/80 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <PartyPopper className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-emerald-950">
                恭喜！新手設定已全部完成
              </p>
              <p className="mt-1 text-sm text-emerald-900/75">
                進度 100%。現在可以把對帳連結傳給買家，開始用儀表板處理回報。
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={dismiss}
            className="h-11 shrink-0 gap-1.5 bg-emerald-700 hover:bg-emerald-700/90"
          >
            開始使用儀表板
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-emerald-800/80">
            <span>上手進度</span>
            <span>3 / 3</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-emerald-200/70">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-500"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50/90 via-card to-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              新手快速上手
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              完成 3 步驟即可開始收單與末五碼核對，約需幾分鐘。
            </p>
          </div>
        </div>
        <p className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary">
          {doneCount} / {total} · {percent}%
        </p>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>上手進度</span>
          <span className="font-medium text-foreground">{percent}%</span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-sky-100"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="新手上手進度"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ol className="mt-6 space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.id}
              className={cn(
                "flex flex-col gap-3 rounded-xl border px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between",
                step.done
                  ? "border-emerald-200/80 bg-emerald-50/50"
                  : "border-border/80 bg-background/80"
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    step.done
                      ? "bg-emerald-600 text-white"
                      : "bg-secondary text-muted-foreground"
                  )}
                  aria-hidden
                >
                  {step.done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : index + 1}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5",
                        step.done ? "text-emerald-700" : "text-primary"
                      )}
                      aria-hidden
                    />
                    <p
                      className={cn(
                        "font-display text-sm font-semibold",
                        step.done && "text-emerald-950"
                      )}
                    >
                      {step.title}
                    </p>
                    {step.done ? (
                      <span className="text-[11px] font-medium text-emerald-700">
                        已完成
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {step.desc}
                  </p>
                </div>
              </div>
              {!step.done ? (
                <Button
                  asChild
                  size="sm"
                  className="h-10 w-full shrink-0 gap-1 sm:h-9 sm:w-auto"
                >
                  <Link href={step.href}>
                    {step.cta}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-10 w-full shrink-0 sm:h-9 sm:w-auto"
                >
                  <Link href={step.href}>查看</Link>
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
