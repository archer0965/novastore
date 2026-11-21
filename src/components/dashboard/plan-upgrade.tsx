"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNovaOsUpgradeUrl } from "@/lib/novaos-hub";
import {
  BILLING_CYCLES,
  EARLY_BIRD,
  FREE_TRIAL,
  PRIMARY_PAID_PLAN_KEYS,
  PLAN_CATALOG,
  formatDiscountFold,
  getCheckoutAmount,
  getCycleAvgMonthly,
  getCycleLabel,
  getEarlyBirdMultiplier,
  getSignupEarlyBirdMultiplier,
  getPlanDisplayName,
  hasLifetimeSpecialDiscount,
  isDowngrade,
  isTrialActive,
  normalizeBillingCycle,
  normalizePlan,
  type BillingCycle,
  type PaidPlanKey,
  type Profile,
} from "@/types/database";
import { cn } from "@/lib/utils";

const CYCLE_OPTIONS: BillingCycle[] = ["monthly", "half_yearly", "yearly"];

/**
 * 價目以本站 PRICING_CONFIG 顯示；付費按鈕統一導向拓新雲端主站綠界 ECPay。
 */
export function PlanUpgrade({ profile }: { profile: Profile }) {
  const current = normalizePlan(profile.plan_type);
  const trialOn = isTrialActive(profile.trial_ends_at, {
    createdAt: profile.created_at,
    discountTier: profile.discount_tier,
    isEarlyBird: profile.is_early_bird,
  });
  const earlyBird = hasLifetimeSpecialDiscount(
    profile.discount_tier,
    profile.is_early_bird
  );
  const launchEarly =
    profile.signup_early_bird ||
    profile.discount_tier === "signup_early_bird";
  const [cycle, setCycle] = useState<BillingCycle>(
    normalizeBillingCycle(profile.billing_cycle)
  );
  const [loadingPlan, setLoadingPlan] = useState<PaidPlanKey | null>(null);

  function goToHubCheckout(plan: PaidPlanKey) {
    setLoadingPlan(plan);
    window.location.href = getNovaOsUpgradeUrl();
  }

  const trialLabel =
    trialOn && profile.trial_ends_at
      ? new Date(profile.trial_ends_at).toLocaleString("zh-TW", {
          timeZone: "Asia/Taipei",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <section
      id="upgrade"
      className="space-y-4 rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">目前方案</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">
            {getPlanDisplayName(current)}
            {current !== "free"
              ? `（${getCycleLabel(normalizeBillingCycle(profile.billing_cycle))}）`
              : ""}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {trialOn
              ? `${FREE_TRIAL.description}｜試用至 ${trialLabel}（台北時間）`
              : "付費升級統一走拓新雲端主站綠界 ECPay（同一帳號）。"}
          </p>
        </div>
        <div className="inline-flex flex-wrap rounded-xl bg-secondary p-1">
          {CYCLE_OPTIONS.map((value) => {
            const meta = BILLING_CYCLES[value];
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCycle(value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  cycle === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PRIMARY_PAID_PLAN_KEYS.map((key) => {
          const plan = PLAN_CATALOG[key];
          const listPrice = getCheckoutAmount(key, cycle);
          const price = getCheckoutAmount(key, cycle, {
            discountTier: profile.discount_tier,
            isEarlyBird: profile.is_early_bird,
            signupEarlyBird: profile.signup_early_bird,
          });
          const avg = getCycleAvgMonthly(key, cycle, {
            discountTier: profile.discount_tier,
            isEarlyBird: profile.is_early_bird,
            signupEarlyBird: profile.signup_early_bird,
          });
          const fold = formatDiscountFold(
            earlyBird
              ? getEarlyBirdMultiplier(cycle)
              : launchEarly
                ? getSignupEarlyBirdMultiplier(cycle)
                : 1
          );
          const isCurrent =
            current === key || (current === "unlimited" && key === "pro");
          const downgrade = isDowngrade(current, key) && !isCurrent;

          return (
            <div
              key={key}
              className={cn(
                "rounded-2xl border p-5",
                plan.isPopular
                  ? "border-2 border-accent bg-gradient-to-br from-primary to-primary/85 text-primary-foreground ring-2 ring-accent/30"
                  : "border-border bg-background/70"
              )}
            >
              <div className="flex items-center gap-2">
                <p className="font-display text-lg font-semibold">{plan.name}</p>
                {plan.isPopular ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                    {plan.popularBadge || "🔥 性價比之王"}
                  </span>
                ) : null}
              </div>
              <p
                className={cn(
                  "mt-1 text-sm",
                  plan.isPopular
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground"
                )}
              >
                {plan.blurb}
              </p>
              <p className="mt-4 font-display text-3xl font-bold">
                ${price}
                <span className="text-base font-medium opacity-80">
                  {" "}
                  /{" "}
                  {cycle === "yearly"
                    ? "年"
                    : cycle === "half_yearly"
                      ? "半年"
                      : "月"}
                </span>
              </p>
              {earlyBird && price < listPrice ? (
                <p
                  className={cn(
                    "mt-1 text-xs font-medium",
                    plan.isPopular ? "text-accent" : "text-amber-700"
                  )}
                >
                  {EARLY_BIRD.label} {fold}（原價 ${listPrice}，終身）
                </p>
              ) : null}
              {cycle !== "monthly" ? (
                <p
                  className={cn(
                    "mt-1 text-xs",
                    plan.isPopular
                      ? "text-primary-foreground/75"
                      : "text-muted-foreground"
                  )}
                >
                  約每月 ${avg}
                </p>
              ) : null}
              <ul className="mt-4 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                disabled={downgrade || loadingPlan !== null}
                onClick={() => goToHubCheckout(key)}
                className={cn(
                  "mt-5 h-11 w-full gap-1.5",
                  plan.isPopular
                    ? "bg-accent text-accent-foreground hover:bg-accent/90"
                    : ""
                )}
                variant={plan.isPopular ? "default" : "outline"}
              >
                {loadingPlan === key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {isCurrent
                  ? "主站綠界續費"
                  : downgrade
                    ? "已是更高方案"
                    : `主站綠界升級 ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        本頁價目為 NovaStore 獨立顯示；實際結帳於{" "}
        <a
          href={getNovaOsUpgradeUrl()}
          className="underline underline-offset-2 hover:text-foreground"
        >
          拓新雲端主站
        </a>{" "}
        以綠界 ECPay 完成（請使用同一組 Email 登入）。
      </p>
    </section>
  );
}
