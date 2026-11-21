"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FREE_TRIAL,
  getPlanDisplayName,
  getPlanLimit,
  isTrialActive,
  normalizePlan,
  type PlanType,
} from "@/types/database";

export function UsageCard({
  planType,
  monthlyUsageCount,
  trialEndsAt,
  expiresAt,
  isAdmin = false,
}: {
  planType: PlanType | string;
  monthlyUsageCount: number;
  trialEndsAt?: string | null;
  expiresAt?: string | null;
  isAdmin?: boolean;
}) {
  const plan = normalizePlan(planType);
  const trialOn = isTrialActive(trialEndsAt) && !isAdmin;
  const limit = getPlanLimit(plan, trialEndsAt, { isAdmin, expiresAt });
  const unlimited = limit === null;
  const nearLimit = !unlimited && monthlyUsageCount >= limit - 3;
  const overLimit = !unlimited && monthlyUsageCount >= limit;
  const pct = unlimited
    ? 12
    : Math.min(100, Math.round((monthlyUsageCount / limit) * 100));

  const trialLabel =
    trialOn && trialEndsAt
      ? new Date(trialEndsAt).toLocaleString("zh-TW", {
          timeZone: "Asia/Taipei",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <section className="rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">本月已處理訂單</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight">
            {unlimited ? (
              <>
                {monthlyUsageCount}{" "}
                <span className="text-lg font-medium text-muted-foreground">
                  筆（
                  {isAdmin
                    ? "管理者・全功能無限"
                    : trialOn
                      ? `試用中・全功能至 ${trialLabel}`
                      : `${getPlanDisplayName(plan)}・無限`}
                  ）
                </span>
              </>
            ) : (
              <>
                {monthlyUsageCount} / {limit}{" "}
                <span className="text-lg font-medium text-muted-foreground">
                  筆（{getPlanDisplayName(plan)}）
                </span>
              </>
            )}
          </p>
          {trialOn ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {FREE_TRIAL.description}
            </p>
          ) : null}
          {isAdmin ? (
            <p className="mt-1 text-xs text-muted-foreground">
              管理者帳號：所有功能開通，對帳次數無上限
            </p>
          ) : null}
        </div>
        {!isAdmin &&
          (nearLimit || overLimit || plan === "free" || trialOn) &&
          plan !== "unlimited" && (
            <Button
              asChild
              className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link href="/dashboard/settings#upgrade">
                <Sparkles className="h-4 w-4" />
                {overLimit ? "升級方案解除額度" : "查看升級方案"}
              </Link>
            </Button>
          )}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            overLimit
              ? "bg-destructive"
              : nearLimit
                ? "bg-accent"
                : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}
