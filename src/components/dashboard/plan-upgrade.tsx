"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  BILLING_CYCLES,
  EARLY_BIRD,
  FREE_TRIAL,
  PAID_PLAN_KEYS,
  PLAN_CATALOG,
  PLAN_RANK,
  formatDiscountFold,
  getCheckoutAmount,
  getCycleAvgMonthly,
  getCycleLabel,
  getEarlyBirdMultiplier,
  getPlanDisplayName,
  hasLifetimeSpecialDiscount,
  isDowngrade,
  isPaidPlan,
  isTrialActive,
  normalizeBillingCycle,
  normalizePlan,
  type BillingCycle,
  type PaidPlanKey,
  type Profile,
} from "@/types/database";
import { isSubscriptionExpired } from "@/lib/subscription";
import type { UpgradeProrationQuote } from "@/lib/subscription";
import { cn } from "@/lib/utils";

const CYCLE_OPTIONS: BillingCycle[] = ["monthly", "half_yearly", "yearly"];

function canProrateUpgrade(profile: Profile, target: PaidPlanKey): boolean {
  const current = normalizePlan(profile.plan_type);
  if (!isPaidPlan(current)) return false;
  if (isSubscriptionExpired(profile.expires_at)) return false;
  return PLAN_RANK[target] > PLAN_RANK[current];
}

export function PlanUpgrade({ profile }: { profile: Profile }) {
  const current = normalizePlan(profile.plan_type);
  const trialOn = isTrialActive(profile.trial_ends_at);
  const earlyBird = hasLifetimeSpecialDiscount(
    profile.discount_tier,
    profile.is_early_bird
  );
  const [cycle, setCycle] = useState<BillingCycle>(
    normalizeBillingCycle(profile.billing_cycle)
  );
  const [loadingPlan, setLoadingPlan] = useState<PaidPlanKey | null>(null);
  const [quote, setQuote] = useState<UpgradeProrationQuote | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function submitHtmlCheckout(
    url: string,
    body: Record<string, unknown>
  ) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || "無法建立付款訂單");
    }
    if (contentType.includes("application/json")) {
      const json = await res.json();
      if (json.applied) {
        toast.success(json.message || "升級成功");
        window.location.reload();
        return;
      }
      throw new Error(json.error || "付款回應格式錯誤");
    }
    if (contentType.includes("text/html")) {
      const html = await res.text();
      // Submit the ECPay form from this origin (avoid blob: pages — some
      // gateways reject or mishandle posts that start from blob URLs).
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const srcForm = doc.querySelector("form");
      if (!srcForm?.action) {
        throw new Error("綠界付款表單無效");
      }
      const form = document.createElement("form");
      form.method = "post";
      form.action = srcForm.action;
      form.acceptCharset = "UTF-8";
      form.style.display = "none";
      srcForm.querySelectorAll("input").forEach((input) => {
        const field = document.createElement("input");
        field.type = "hidden";
        field.name = input.name;
        field.value = input.value;
        form.appendChild(field);
      });
      document.body.appendChild(form);
      form.submit();
      return;
    }
    throw new Error("付款回應格式錯誤");
  }

  async function checkoutFull(plan: PaidPlanKey) {
    setLoadingPlan(plan);
    try {
      await submitHtmlCheckout("/api/checkout", { plan, cycle });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "升級失敗");
      setLoadingPlan(null);
    }
  }

  async function onSelectPlan(plan: PaidPlanKey) {
    if (canProrateUpgrade(profile, plan)) {
      setLoadingPlan(plan);
      try {
        const res = await fetch("/api/upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, action: "quote" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "無法計算差價");
        if (!json.quote?.eligible) {
          // Fall back to full purchase
          await checkoutFull(plan);
          return;
        }
        setQuote(json.quote as UpgradeProrationQuote);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "無法計算升級差價");
      } finally {
        setLoadingPlan(null);
      }
      return;
    }
    await checkoutFull(plan);
  }

  async function confirmProration() {
    if (!quote) return;
    setConfirming(true);
    try {
      await submitHtmlCheckout("/api/upgrade", {
        plan: quote.toPlan,
        action: "confirm",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "升級付款失敗");
      setConfirming(false);
    }
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
              : "有效期內升級可折抵剩餘金額；提前續費自原到期日累加。"}
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

      <div className="grid gap-4 lg:grid-cols-3">
        {PAID_PLAN_KEYS.map((key) => {
          const plan = PLAN_CATALOG[key];
          const listPrice = getCheckoutAmount(key, cycle);
          const price = getCheckoutAmount(key, cycle, {
            discountTier: profile.discount_tier,
            isEarlyBird: profile.is_early_bird,
          });
          const avg = getCycleAvgMonthly(key, cycle, {
            discountTier: profile.discount_tier,
            isEarlyBird: profile.is_early_bird,
          });
          const fold = formatDiscountFold(getEarlyBirdMultiplier(cycle));
          const isCurrent = current === key;
          const downgrade = isDowngrade(current, key);
          const prorate = canProrateUpgrade(profile, key);

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
                    plan.isPopular
                      ? "text-accent"
                      : "text-amber-700"
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
              {prorate ? (
                <p
                  className={cn(
                    "mt-2 text-xs font-medium",
                    plan.isPopular
                      ? "text-accent"
                      : "text-primary"
                  )}
                >
                  有效期內升級可折抵剩餘天數差價
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
                onClick={() =>
                  isCurrent ? checkoutFull(key) : onSelectPlan(key)
                }
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
                  ? "立即續費（天數累加）"
                  : downgrade
                    ? "已是更高方案"
                    : prorate
                      ? `補差價升級 ${plan.name}`
                      : `升級 ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      {quote ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-proration-title"
          onClick={() => !confirming && setQuote(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h3
                  id="upgrade-proration-title"
                  className="font-display text-lg font-semibold"
                >
                  升級差價折抵
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                  {quote.message}
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 rounded-xl bg-secondary/60 px-4 py-3 text-sm">
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">剩餘天數</span>
                <span className="font-medium">{quote.remainingDays} 天</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">折抵金額</span>
                <span className="font-medium">NT${quote.creditAmount}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">應付補差價</span>
                <span className="font-semibold text-primary">
                  NT${quote.topUpAmount}
                </span>
              </li>
              <li className="text-xs text-muted-foreground">
                升級後到期日維持不變，剩餘天數不會歸零。
              </li>
            </ul>
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1"
                disabled={confirming}
                onClick={() => setQuote(null)}
              >
                再想想
              </Button>
              <Button
                type="button"
                className="h-11 flex-[1.4] gap-1.5"
                disabled={confirming}
                onClick={confirmProration}
              >
                {confirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                確認補差價 NT${quote.topUpAmount}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
