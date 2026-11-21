import {
  BILLING_CYCLES,
  PLAN_RANK,
  getCheckoutAmount,
  getPlanDisplayName,
  isPaidPlan,
  isTrialActive,
  normalizeBillingCycle,
  normalizePlan,
  type BillingCycle,
  type PaidPlanKey,
  type PlanType,
  type Profile,
} from "@/types/database";

export type SubscriptionStatus =
  | "admin"
  | "trial"
  | "active"
  | "expiring_soon"
  | "expired"
  | "free";

const MS_DAY = 24 * 60 * 60 * 1000;

export function cycleDurationMonths(cycle: BillingCycle): number {
  return BILLING_CYCLES[normalizeBillingCycle(cycle)].months;
}

/** Add calendar months in UTC (stable for billing). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  // Handle month-end overflow (e.g. Jan 31 + 1 month)
  if (d.getUTCDate() < day) {
    d.setUTCDate(0);
  }
  return d;
}

/**
 * Extension logic:
 * - if current expires_at is still in the future → extend from that date
 * - if missing / already expired → extend from now
 */
export function computeExtendedExpiresAt(options: {
  currentExpiresAt?: string | null;
  cycle: BillingCycle;
  now?: Date;
}): string {
  const now = options.now ?? new Date();
  const months = cycleDurationMonths(options.cycle);
  const current = options.currentExpiresAt
    ? new Date(options.currentExpiresAt)
    : null;
  const base =
    current && !Number.isNaN(current.getTime()) && current.getTime() > now.getTime()
      ? current
      : now;
  return addMonths(base, months).toISOString();
}

export function isSubscriptionExpired(
  expiresAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!expiresAt) return false; // null = no expiry (admin / legacy)
  const ends = new Date(expiresAt);
  if (Number.isNaN(ends.getTime())) return false;
  return ends.getTime() <= now.getTime();
}

function taipeiDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Calendar days from today (Taipei) until expiry date (can be negative if past). */
export function daysUntilExpiry(
  expiresAt: string | null | undefined,
  now: Date = new Date()
): number | null {
  if (!expiresAt) return null;
  const ends = new Date(expiresAt);
  if (Number.isNaN(ends.getTime())) return null;
  const today = new Date(`${taipeiDateKey(now)}T00:00:00+08:00`);
  const endDay = new Date(`${taipeiDateKey(ends)}T00:00:00+08:00`);
  return Math.round((endDay.getTime() - today.getTime()) / MS_DAY);
}

/** Paid plan that is past expires_at is treated as free for entitlements. */
export function getEffectivePlan(
  plan: PlanType | string | null | undefined,
  options?: {
    expiresAt?: string | null;
    trialEndsAt?: string | null;
    isAdmin?: boolean;
    now?: Date;
  }
): PlanType {
  if (options?.isAdmin) return "unlimited";
  if (isTrialActive(options?.trialEndsAt, options?.now)) {
    return normalizePlan(plan) === "free" ? "unlimited" : normalizePlan(plan);
  }
  const p = normalizePlan(plan);
  if (isPaidPlan(p) && isSubscriptionExpired(options?.expiresAt, options?.now)) {
    return "free";
  }
  return p;
}

export function getSubscriptionStatus(options: {
  planType: PlanType | string | null | undefined;
  expiresAt?: string | null;
  trialEndsAt?: string | null;
  isAdmin?: boolean;
  now?: Date;
}): SubscriptionStatus {
  if (options.isAdmin) return "admin";
  if (isTrialActive(options.trialEndsAt, options.now)) return "trial";

  const plan = normalizePlan(options.planType);
  if (!isPaidPlan(plan)) return "free";

  if (isSubscriptionExpired(options.expiresAt, options.now)) return "expired";

  const days = daysUntilExpiry(options.expiresAt, options.now);
  if (days !== null && days <= 3) return "expiring_soon";
  return "active";
}

export function formatExpiresAtTaipei(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function subscriptionFromProfile(
  profile: Pick<Profile, "plan_type" | "expires_at" | "trial_ends_at">,
  isAdmin = false,
  now: Date = new Date()
) {
  const status = getSubscriptionStatus({
    planType: profile.plan_type,
    expiresAt: profile.expires_at,
    trialEndsAt: profile.trial_ends_at,
    isAdmin,
    now,
  });
  const effectivePlan = getEffectivePlan(profile.plan_type, {
    expiresAt: profile.expires_at,
    trialEndsAt: profile.trial_ends_at,
    isAdmin,
    now,
  });
  return {
    status,
    effectivePlan,
    daysLeft: daysUntilExpiry(profile.expires_at, now),
  };
}

export type ApplySubscriptionInput = {
  plan: PaidPlanKey;
  cycle: BillingCycle;
  currentExpiresAt?: string | null;
  now?: Date;
};

export function buildSubscriptionUpdate(input: ApplySubscriptionInput) {
  const expiresAt = computeExtendedExpiresAt({
    currentExpiresAt: input.currentExpiresAt,
    cycle: input.cycle,
    now: input.now,
  });
  return {
    plan_type: input.plan,
    billing_cycle: input.cycle,
    expires_at: expiresAt,
    trial_ends_at: null,
    // Reset reminder markers so new cycle can notify again
    expiry_reminder_3d_for: null,
    expiry_reminder_1d_for: null,
  };
}

export type UpgradeProrationQuote = {
  eligible: boolean;
  reason?: string;
  fromPlan: PlanType;
  toPlan: PaidPlanKey;
  cycle: BillingCycle;
  remainingDays: number;
  periodDays: number;
  currentPeriodPrice: number;
  targetPeriodPrice: number;
  creditAmount: number;
  targetRemainingCost: number;
  topUpAmount: number;
  keepExpiresAt: string | null;
  message: string;
};

/**
 * Mid-cycle upgrade proration (same billing cycle):
 * credit unused value of current plan, charge difference for remaining days.
 * expires_at is kept — unused days are not wiped.
 */
export function calculateUpgradeProration(options: {
  fromPlan: PlanType | string;
  toPlan: PaidPlanKey;
  cycle: BillingCycle;
  expiresAt?: string | null;
  now?: Date;
  discountTier?: string | null;
  isEarlyBird?: boolean | null;
}): UpgradeProrationQuote {
  const now = options.now ?? new Date();
  const fromPlan = normalizePlan(options.fromPlan);
  const toPlan = options.toPlan;
  const cycle = normalizeBillingCycle(options.cycle);
  const remainingDays = Math.max(0, daysUntilExpiry(options.expiresAt, now) ?? 0);
  const periodDays = Math.max(1, cycleDurationMonths(cycle) * 30);
  const keepExpiresAt = options.expiresAt ?? null;
  const priceOpts = {
    discountTier: options.discountTier,
    isEarlyBird: options.isEarlyBird,
  };

  const empty = {
    fromPlan,
    toPlan,
    cycle,
    remainingDays,
    periodDays,
    currentPeriodPrice: 0,
    targetPeriodPrice: 0,
    creditAmount: 0,
    targetRemainingCost: 0,
    topUpAmount: 0,
    keepExpiresAt,
  };

  if (!isPaidPlan(fromPlan)) {
    return {
      ...empty,
      eligible: false,
      reason: "NOT_PAID_ACTIVE",
      message: "目前非有效付費方案，請直接購買目標方案。",
    };
  }
  if (isSubscriptionExpired(options.expiresAt, now)) {
    return {
      ...empty,
      eligible: false,
      reason: "EXPIRED",
      message: "方案已到期，請重新訂閱（可自當下起算新效期）。",
    };
  }
  if (PLAN_RANK[toPlan] <= PLAN_RANK[fromPlan]) {
    return {
      ...empty,
      eligible: false,
      reason: "NOT_UPGRADE",
      message: "目標方案需高於目前方案才可補差價升級。",
    };
  }
  if (remainingDays <= 0) {
    return {
      ...empty,
      eligible: false,
      reason: "NO_REMAINING_DAYS",
      message: "沒有可折抵的剩餘天數。",
    };
  }

  const currentPeriodPrice = getCheckoutAmount(fromPlan, cycle, priceOpts);
  const targetPeriodPrice = getCheckoutAmount(toPlan, cycle, priceOpts);
  const creditAmount = Math.round(
    (currentPeriodPrice / periodDays) * remainingDays
  );
  const targetRemainingCost = Math.round(
    (targetPeriodPrice / periodDays) * remainingDays
  );
  const topUpAmount = Math.max(0, targetRemainingCost - creditAmount);
  const fromName = getPlanDisplayName(fromPlan);
  const toName = getPlanDisplayName(toPlan);

  return {
    eligible: true,
    fromPlan,
    toPlan,
    cycle,
    remainingDays,
    periodDays,
    currentPeriodPrice,
    targetPeriodPrice,
    creditAmount,
    targetRemainingCost,
    topUpAmount,
    keepExpiresAt,
    message: `您目前「${fromName}」尚餘 ${remainingDays} 天，升級至「${toName}」將自動折抵剩餘金額 NT$${creditAmount}，只需補差價 NT$${topUpAmount} 即可立即升級！`,
  };
}

/** Mid-cycle tier upgrade: change plan only, keep original expires_at. */
export function buildProrationUpgradeUpdate(options: {
  toPlan: PaidPlanKey;
  cycle: BillingCycle;
  keepExpiresAt: string;
}) {
  return {
    plan_type: options.toPlan,
    billing_cycle: options.cycle,
    expires_at: options.keepExpiresAt,
    trial_ends_at: null,
  };
}
