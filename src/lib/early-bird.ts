import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReportShareUrl } from "@/lib/utils-format";
import {
  EARLY_BIRD,
  getPlanDisplayName,
  normalizeBillingCycle,
  normalizePlan,
} from "@/types/database";

function refreshPartnerSurfaces(partnerId?: string) {
  try {
    revalidatePath("/");
    revalidatePath("/dashboard/admin");
    if (partnerId) {
      revalidatePath(`/dashboard/admin/partners/${partnerId}`);
    }
  } catch (error) {
    console.warn("[partner-store] revalidatePath skipped", error);
  }
}

/** List row for admin 特約店家 table */
export type PartnerStoreListItem = {
  id: string;
  email: string | null;
  shop_name: string | null;
  line_user_id: string | null;
  plan_type: string | null;
  billing_cycle: string | null;
  trial_ends_at: string | null;
  expires_at: string | null;
  discount_tier: string | null;
  is_early_bird: boolean;
  created_at: string;
  partner_since?: string | null;
};

/** Full detail for campaign / contact outreach */
export type PartnerStoreDetail = PartnerStoreListItem & {
  bank_code: string | null;
  bank_account: string | null;
  monthly_usage_count: number;
  usage_month: string | null;
  signup_early_bird: boolean;
  auth_created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  phone: string | null;
  report_counts: {
    total: number;
    pending: number;
    confirmed: number;
    needs_contact: number;
  };
  share_url: string;
  benefits: {
    trialDays: number;
    cycleMultipliers: typeof EARLY_BIRD.cycleMultipliers;
    label: string;
    discountActive: boolean;
  };
};

/** @deprecated use PartnerStoreListItem */
export type EarlyBirdSeat = PartnerStoreListItem;

export async function countEarlyBirdSeats(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_early_bird", true);
  if (error) throw error;
  return count ?? 0;
}

export async function listEarlyBirdSeats(): Promise<PartnerStoreListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(
      "id, shop_name, line_user_id, plan_type, billing_cycle, trial_ends_at, expires_at, discount_tier, is_early_bird, created_at"
    )
    .eq("is_early_bird", true)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = data || [];
  const withEmail: PartnerStoreListItem[] = [];
  for (const row of rows) {
    let email: string | null = null;
    try {
      const { data: userData } = await admin.auth.admin.getUserById(row.id);
      email = userData.user?.email ?? null;
    } catch {
      email = null;
    }
    withEmail.push({
      id: row.id,
      email,
      shop_name: row.shop_name,
      line_user_id: row.line_user_id,
      plan_type: row.plan_type,
      billing_cycle: row.billing_cycle,
      trial_ends_at: row.trial_ends_at,
      expires_at: row.expires_at,
      discount_tier: row.discount_tier,
      is_early_bird: Boolean(row.is_early_bird),
      created_at: row.created_at,
    });
  }
  return withEmail;
}

export async function getPartnerStoreDetail(
  userId: string
): Promise<PartnerStoreDetail | null> {
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select(
      "id, shop_name, bank_code, bank_account, line_user_id, plan_type, billing_cycle, trial_ends_at, expires_at, discount_tier, is_early_bird, signup_early_bird, monthly_usage_count, usage_month, created_at"
    )
    .eq("id", userId)
    .eq("is_early_bird", true)
    .maybeSingle();

  if (error) throw error;
  if (!profile) return null;

  let email: string | null = null;
  let auth_created_at: string | null = null;
  let last_sign_in_at: string | null = null;
  let email_confirmed_at: string | null = null;
  let phone: string | null = null;
  try {
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const u = userData.user;
    email = u?.email ?? null;
    auth_created_at = u?.created_at ?? null;
    last_sign_in_at = u?.last_sign_in_at ?? null;
    email_confirmed_at = u?.email_confirmed_at ?? null;
    phone = (u?.phone as string | undefined) || null;
  } catch {
    /* ignore */
  }

  const statuses = ["pending", "confirmed", "auto_confirmed", "needs_contact", "rejected"] as const;
  const report_counts = {
    total: 0,
    pending: 0,
    confirmed: 0,
    needs_contact: 0,
  };
  for (const status of statuses) {
    const { count } = await admin
      .from("payment_reports")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", userId)
      .eq("status", status);
    const n = count ?? 0;
    report_counts.total += n;
    if (status === "pending") report_counts.pending = n;
    if (status === "confirmed" || status === "auto_confirmed") {
      report_counts.confirmed += n;
    }
    if (status === "needs_contact") report_counts.needs_contact = n;
  }

  return {
    id: profile.id,
    email,
    shop_name: profile.shop_name,
    line_user_id: profile.line_user_id,
    plan_type: profile.plan_type,
    billing_cycle: profile.billing_cycle,
    trial_ends_at: profile.trial_ends_at,
    expires_at: profile.expires_at,
    discount_tier: profile.discount_tier,
    is_early_bird: Boolean(profile.is_early_bird),
    created_at: profile.created_at,
    bank_code: profile.bank_code,
    bank_account: profile.bank_account,
    monthly_usage_count: profile.monthly_usage_count ?? 0,
    usage_month: profile.usage_month,
    signup_early_bird: Boolean(profile.signup_early_bird),
    auth_created_at,
    last_sign_in_at,
    email_confirmed_at,
    phone,
    report_counts,
    share_url: getReportShareUrl(profile.id),
    benefits: {
      trialDays: EARLY_BIRD.trialDays,
      cycleMultipliers: EARLY_BIRD.cycleMultipliers,
      label: EARLY_BIRD.label,
      discountActive:
        profile.discount_tier === EARLY_BIRD.discountTier ||
        Boolean(profile.is_early_bird),
    },
  };
}

async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const hit = data.users.find(
      (u) => (u.email || "").trim().toLowerCase() === normalized
    );
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

/**
 * Admin grants 特約店家 and immediately wires lifetime discounts + 14-day trial.
 */
export async function assignEarlyBird(options: {
  targetUserEmail: string;
  now?: Date;
}): Promise<{
  success: true;
  message: string;
  used: number;
  userId: string;
  email: string;
  trialEndsAt: string;
  benefitsApplied: true;
}> {
  const admin = createAdminClient();
  const email = options.targetUserEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("請輸入有效的信箱");
  }

  const user = await findAuthUserByEmail(email);
  if (!user) {
    throw new Error("找不到此信箱的註冊帳號，請確認客戶已先註冊");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, is_early_bird, trial_ends_at, discount_tier")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) {
    throw new Error("此帳號尚無 profile，請請客戶重新登入後再試");
  }

  const now = options.now ?? new Date();
  const trialEnds = new Date(
    now.getTime() + EARLY_BIRD.trialDays * 24 * 60 * 60 * 1000
  );

  // Always (re)apply full partner benefits immediately
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      is_early_bird: true,
      discount_tier: EARLY_BIRD.discountTier,
      trial_ends_at: trialEnds.toISOString(),
    })
    .eq("id", user.id);

  if (updateError) throw updateError;

  const after = await countEarlyBirdSeats();
  refreshPartnerSurfaces(user.id);

  const already = Boolean(profile.is_early_bird);
  return {
    success: true,
    message: already
      ? `已重新套用特約店家優惠（${EARLY_BIRD.trialDays} 天試用＋終身折扣）`
      : "成功開通特約店家，優惠已立即生效！",
    used: after,
    userId: user.id,
    email,
    trialEndsAt: trialEnds.toISOString(),
    benefitsApplied: true,
  };
}

export async function revokeEarlyBird(targetUserEmail: string): Promise<{
  success: true;
  message: string;
  used: number;
}> {
  const admin = createAdminClient();
  const email = targetUserEmail.trim().toLowerCase();
  const user = await findAuthUserByEmail(email);
  if (!user) throw new Error("找不到此信箱的註冊帳號");

  const { error } = await admin
    .from("profiles")
    .update({
      is_early_bird: false,
      discount_tier: null,
    })
    .eq("id", user.id);

  if (error) throw error;
  const used = await countEarlyBirdSeats();
  refreshPartnerSurfaces(user.id);
  return {
    success: true,
    message: "已取消特約店家資格與專屬折扣",
    used,
  };
}

export function partnerPlanLabel(plan: string | null | undefined): string {
  return getPlanDisplayName(normalizePlan(plan));
}

export function partnerCycleLabel(cycle: string | null | undefined): string {
  const c = normalizeBillingCycle(cycle);
  if (c === "yearly") return "年繳";
  if (c === "half_yearly") return "半年繳";
  return "月繳";
}
