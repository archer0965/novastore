"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNovaOsUpgradeUrl } from "@/lib/novaos-hub";
import {
  BILLING_CYCLES,
  LANDING_PLAN_KEYS,
  PLAN_CATALOG,
  type BillingCycle,
} from "@/types/database";
import { cn } from "@/lib/utils";

const CYCLE_OPTIONS: BillingCycle[] = ["monthly", "yearly"];

export function LandingPricing() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <section id="pricing" className="relative z-10 scroll-mt-20 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          定價與方案
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          1 款免費＋2 款收費（專業版／旗艦版；既有 unlimited 與旗艦同權益）。方案權益對齊拓新雲端
          NovaOS 主站；付費升級統一走主站綠界 ECPay。
        </p>

        <div className="mt-6 inline-flex flex-wrap rounded-xl bg-secondary p-1">
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
                {value === "yearly" ? "年繳" : meta.label}
                {value === "yearly" ? (
                  <span className="ml-1 opacity-80">（更省）</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {LANDING_PLAN_KEYS.map((key) => {
            const plan = PLAN_CATALOG[key];
            const price = plan.prices[cycle];
            const period = cycle === "yearly" ? "年" : "月";
            const isFree = key === "free";
            const ctaHref = isFree ? "/signup" : getNovaOsUpgradeUrl();

            return (
              <div
                key={key}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-6",
                  plan.isPopular
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/80 bg-background/70"
                )}
              >
                {plan.isPopular ? (
                  <p className="absolute right-4 top-4 text-xs font-semibold text-accent">
                    {plan.popularBadge || "主推方案"}
                  </p>
                ) : null}
                <p
                  className={cn(
                    "text-sm font-medium",
                    plan.isPopular
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  {plan.name}
                </p>
                <p className="mt-3 font-display text-4xl font-bold tracking-tight">
                  {isFree ? (
                    "免費"
                  ) : (
                    <>
                      NT${price.total.toLocaleString("zh-TW")}
                      <span
                        className={cn(
                          "text-base font-medium",
                          plan.isPopular
                            ? "text-primary-foreground/75"
                            : "text-muted-foreground"
                        )}
                      >
                        {" "}
                        / {period}
                      </span>
                    </>
                  )}
                </p>
                <p
                  className={cn(
                    "mt-2 text-sm",
                    plan.isPopular
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  {plan.blurb}
                </p>
                {!isFree && cycle === "yearly" ? (
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      plan.isPopular
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    約每月 NT${price.avgMonthly.toLocaleString("zh-TW")}
                  </p>
                ) : null}
                <ul
                  className={cn(
                    "mt-6 flex-1 space-y-2.5 text-sm",
                    plan.isPopular ? "text-primary-foreground/95" : ""
                  )}
                >
                  {plan.features.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          plan.isPopular ? "" : "text-primary"
                        )}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={cn(
                    "mt-8 w-full",
                    plan.isPopular
                      ? "bg-accent text-accent-foreground hover:bg-accent/90"
                      : ""
                  )}
                  variant={plan.isPopular ? "default" : "outline"}
                >
                  <Link
                    href={ctaHref}
                    {...(isFree
                      ? {}
                      : { target: "_blank", rel: "noopener noreferrer" })}
                  >
                    {isFree ? "免費開始" : "主站綠界付款升級"}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
