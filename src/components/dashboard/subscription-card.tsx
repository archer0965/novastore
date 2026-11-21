"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  daysUntilExpiry,
  formatExpiresAtTaipei,
  getSubscriptionStatus,
} from "@/lib/subscription";
import {
  EARLY_BIRD,
  getCycleLabel,
  getPlanDisplayName,
  hasLifetimeSpecialDiscount,
  isPaidPlan,
  normalizeBillingCycle,
  normalizePlan,
  type Profile,
} from "@/types/database";
import { cn } from "@/lib/utils";

function remainingDaysLabel(
  daysLeft: number | null,
  status: ReturnType<typeof getSubscriptionStatus>
): string | null {
  if (daysLeft === null) return null;
  if (status === "expired" || daysLeft < 0) {
    return `已過期 ${Math.abs(daysLeft)} 天`;
  }
  if (daysLeft === 0) return "今天到期";
  return `剩餘 ${daysLeft} 天`;
}

export function SubscriptionCard({
  profile,
  isAdmin = false,
}: {
  profile: Profile;
  isAdmin?: boolean;
}) {
  const plan = normalizePlan(profile.plan_type);
  const status = getSubscriptionStatus({
    planType: profile.plan_type,
    expiresAt: profile.expires_at,
    trialEndsAt: profile.trial_ends_at,
    isAdmin,
  });
  const daysLeft =
    status === "trial"
      ? daysUntilExpiry(profile.trial_ends_at)
      : daysUntilExpiry(profile.expires_at);
  const daysText = remainingDaysLabel(daysLeft, status);

  const cycleLabel =
    plan === "free"
      ? "—"
      : getCycleLabel(normalizeBillingCycle(profile.billing_cycle));

  const showRenew =
    !isAdmin && (isPaidPlan(plan) || status === "expired");
  const showUpgrade = !isAdmin && plan !== "unlimited";
  const earlyBird = hasLifetimeSpecialDiscount(
    profile.discount_tier,
    profile.is_early_bird
  );

  const banner =
    status === "expired"
      ? {
          className: "border-rose-300 bg-rose-50 text-rose-950",
          title: "方案已到期",
          body: "付費功能與額度已降為免費體驗版限制，請立即續費以恢復完整權益。",
        }
      : status === "expiring_soon"
        ? {
            className: "border-amber-300 bg-amber-50 text-amber-950",
            title: "方案即將到期",
            body: "建議儘早續費。提前續費會從原到期日往後累加，不會損失剩餘天數。",
          }
        : null;

  return (
    <section className="space-y-4 rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">目前方案等級</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              {isAdmin ? "管理者（全功能）" : getPlanDisplayName(plan)}
              {!isAdmin && plan !== "free" ? (
                <span className="ml-2 text-base font-medium text-muted-foreground">
                  · {cycleLabel}
                </span>
              ) : null}
            </h2>
            {earlyBird && !isAdmin ? (
              <p className="mt-1 text-sm font-medium text-amber-700">
                {EARLY_BIRD.label} · 月 8 折／半年 75 折／年 7 折（終身）
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 shrink-0" />
              {isAdmin ? (
                <span>無到期日</span>
              ) : status === "trial" ? (
                <span>
                  試用到期日：
                  <strong className="ml-1 text-foreground">
                    {formatExpiresAtTaipei(profile.trial_ends_at)}
                  </strong>
                  <span className="ml-1">（台北時間）</span>
                </span>
              ) : plan === "free" ? (
                <span>免費體驗版無訂閱到期日</span>
              ) : (
                <span>
                  方案到期日：
                  <strong className="ml-1 text-foreground">
                    {formatExpiresAtTaipei(profile.expires_at)}
                  </strong>
                  <span className="ml-1">（台北時間）</span>
                </span>
              )}
            </div>

            {!isAdmin && daysText ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
                  status === "expired"
                    ? "bg-rose-100 text-rose-800"
                    : status === "expiring_soon" ||
                        (typeof daysLeft === "number" && daysLeft <= 3)
                      ? "bg-amber-100 text-amber-900"
                      : "bg-secondary text-secondary-foreground"
                )}
              >
                {daysText}
              </span>
            ) : null}
          </div>
        </div>

        {!isAdmin ? (
          <div className="flex flex-wrap gap-2">
            {showRenew ? (
              <Button
                asChild
                className={cn(
                  "h-11 gap-1.5",
                  status === "expired" || status === "expiring_soon"
                    ? "bg-accent text-accent-foreground hover:bg-accent/90"
                    : ""
                )}
              >
                <Link href="/dashboard/settings#upgrade">
                  <RefreshCw className="h-4 w-4" />
                  立即續費
                </Link>
              </Button>
            ) : null}
            {showUpgrade ? (
              <Button asChild variant="outline" className="h-11 gap-1.5">
                <Link href="/dashboard/settings#upgrade">
                  <ArrowUpRight className="h-4 w-4" />
                  升級方案
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {banner ? (
        <div
          className={cn(
            "flex gap-2 rounded-xl border px-4 py-3 text-sm",
            banner.className
          )}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{banner.title}</p>
            <p className="mt-0.5 opacity-90">{banner.body}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
