import { createAdminClient } from "@/lib/supabase/admin";
import {
  FREE_TRIAL,
  isTrialActivationTier,
  isTrialActive,
  PROMO_TRIAL_GATE_AT_MS,
  SIGNUP_EARLY_BIRD,
  TRIAL_ACTIVATED_TIER,
  trialEndsAtFromNow,
  type Profile,
} from "@/types/database";

export async function countSignupEarlyBirdUsed(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("signup_early_bird", true);
  if (error) throw error;
  return count ?? 0;
}

export async function getSignupEarlyBirdStatus(): Promise<{
  open: boolean;
  used: number;
  max: number;
  remaining: number;
  trialDays: number;
  label: string;
  description: string;
}> {
  const max = SIGNUP_EARLY_BIRD.maxUsers;
  let used = 0;
  try {
    used = await countSignupEarlyBirdUsed();
  } catch (error) {
    console.error("[signup-early-bird] count failed", error);
    used = 0;
  }
  const remaining = Math.max(0, max - used);
  return {
    open: used < max,
    used,
    max,
    remaining,
    trialDays: SIGNUP_EARLY_BIRD.trialDays,
    label: SIGNUP_EARLY_BIRD.label,
    description: SIGNUP_EARLY_BIRD.description,
  };
}

/** @deprecated Trial length is always FREE_TRIAL.durationDays after button start. */
export async function trialDaysForNewSignup(): Promise<number> {
  return FREE_TRIAL.durationDays;
}

export function trialEndsAtAfterDays(
  days: number,
  now: Date = new Date()
): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * DB trigger may still auto-set trial_ends_at / signup_early_bird on register.
 * Until migration 024 is applied, clear those for gated profiles that have not
 * activated via the dashboard button (keeps early-bird seats accurate).
 */
export async function neutralizeAutoStartedTrial(
  profile: Pick<
    Profile,
    | "id"
    | "created_at"
    | "plan_type"
    | "expires_at"
    | "trial_ends_at"
    | "discount_tier"
    | "is_early_bird"
    | "signup_early_bird"
  >
): Promise<Profile | null> {
  const createdMs = profile.created_at
    ? Date.parse(profile.created_at)
    : Number.POSITIVE_INFINITY;
  if (!Number.isNaN(createdMs) && createdMs < PROMO_TRIAL_GATE_AT_MS) {
    return null;
  }
  if (profile.expires_at) return null;
  if (isTrialActivationTier(profile.discount_tier) || profile.is_early_bird) {
    return null;
  }
  if (!profile.trial_ends_at && !profile.signup_early_bird) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      trial_ends_at: null,
      signup_early_bird: false,
    })
    .eq("id", profile.id)
    .select(
      "id, shop_name, shop_slug, shop_bio, bank_code, bank_account, line_user_id, plan_type, billing_cycle, trial_ends_at, expires_at, is_early_bird, discount_tier, signup_early_bird, monthly_usage_count, usage_month, created_at"
    )
    .maybeSingle();
  if (error) {
    console.error("[trial-gate] neutralize failed", error);
    return null;
  }
  return data as Profile | null;
}

export function canStartFreeTrial(
  profile: Pick<
    Profile,
    | "trial_ends_at"
    | "expires_at"
    | "discount_tier"
    | "is_early_bird"
    | "created_at"
    | "signup_early_bird"
  >
): { ok: true } | { ok: false; reason: string } {
  if (profile.expires_at) {
    return { ok: false, reason: "已正式訂閱，無需再開通試用" };
  }
  if (
    isTrialActive(profile.trial_ends_at, {
      createdAt: profile.created_at,
      discountTier: profile.discount_tier,
      isEarlyBird: profile.is_early_bird,
    })
  ) {
    return { ok: false, reason: "試用已進行中" };
  }
  if (isTrialActivationTier(profile.discount_tier)) {
    return { ok: false, reason: "已使用過免費試用，請直接升級方案" };
  }
  // Legacy pre-gate profiles that already consumed a trial window
  const createdMs = profile.created_at
    ? Date.parse(profile.created_at)
    : Number.NaN;
  if (
    !Number.isNaN(createdMs) &&
    createdMs < PROMO_TRIAL_GATE_AT_MS &&
    profile.trial_ends_at
  ) {
    return { ok: false, reason: "已使用過免費試用，請直接升級方案" };
  }
  return { ok: true };
}

export async function startFreeTrialForProfile(userId: string): Promise<{
  ok: boolean;
  error?: string;
  profile?: Profile;
  earlyBird?: boolean;
  trialEndsAt?: string;
  remainingEarlyBird?: number;
}> {
  const admin = createAdminClient();
  const { data: profile, error: readError } = await admin
    .from("profiles")
    .select(
      "id, shop_name, shop_slug, shop_bio, bank_code, bank_account, line_user_id, plan_type, billing_cycle, trial_ends_at, expires_at, is_early_bird, discount_tier, signup_early_bird, monthly_usage_count, usage_month, created_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (readError || !profile) {
    return { ok: false, error: "找不到賣家資料，請先完成註冊" };
  }

  const typed = profile as Profile;
  const gate = canStartFreeTrial(typed);
  if (!gate.ok) return { ok: false, error: gate.reason };

  const status = await getSignupEarlyBirdStatus();
  const claimEarly = status.open;
  const trialEndsAt = trialEndsAtFromNow();
  const discountTier = claimEarly
    ? SIGNUP_EARLY_BIRD.discountTier
    : TRIAL_ACTIVATED_TIER;

  const { data: updated, error: writeError } = await admin
    .from("profiles")
    .update({
      trial_ends_at: trialEndsAt,
      signup_early_bird: claimEarly,
      discount_tier: discountTier,
    })
    .eq("id", userId)
    .select(
      "id, shop_name, shop_slug, shop_bio, bank_code, bank_account, line_user_id, plan_type, billing_cycle, trial_ends_at, expires_at, is_early_bird, discount_tier, signup_early_bird, monthly_usage_count, usage_month, created_at"
    )
    .maybeSingle();

  if (writeError || !updated) {
    console.error("[trial-start] update failed", writeError);
    return { ok: false, error: "無法開通試用，請稍後再試" };
  }

  return {
    ok: true,
    profile: updated as Profile,
    earlyBird: claimEarly,
    trialEndsAt,
    remainingEarlyBird: Math.max(0, status.remaining - (claimEarly ? 1 : 0)),
  };
}
