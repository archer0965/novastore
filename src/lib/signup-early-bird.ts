import { createAdminClient } from "@/lib/supabase/admin";
import { FREE_TRIAL, SIGNUP_EARLY_BIRD } from "@/types/database";

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
    // Fail open for marketing while slots likely remain
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

/** Trial length for a brand-new signup (also enforced in DB trigger). */
export async function trialDaysForNewSignup(): Promise<number> {
  const status = await getSignupEarlyBirdStatus();
  return status.open
    ? SIGNUP_EARLY_BIRD.trialDays
    : FREE_TRIAL.durationDays;
}

export function trialEndsAtAfterDays(
  days: number,
  now: Date = new Date()
): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}
