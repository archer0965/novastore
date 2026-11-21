import { getUserEmailById, isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentUsageMonth } from "@/lib/utils-format";
import {
  getPlanLimit,
  normalizePlan,
  type PlanType,
  type ShopPublic,
} from "@/types/database";

export type BuyerShopContext = {
  shop: ShopPublic;
  planType: PlanType;
  monthlyUsageCount: number;
  quotaFull: boolean;
  lineUserId: string | null;
  lineAccessToken: string | null;
};

/**
 * Load only public shop fields + quota flag for the buyer report page.
 * Never returns payment_reports history.
 */
export async function getBuyerShopContext(
  sellerId: string
): Promise<BuyerShopContext | null> {
  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select(
      "id, shop_name, bank_code, bank_account, plan_type, monthly_usage_count, usage_month, line_user_id, line_channel_access_token, trial_ends_at, expires_at"
    )
    .eq("id", sellerId)
    .maybeSingle();

  if (error) {
    console.error("[shop-public]", error);
    throw error;
  }

  if (!profile) return null;

  const month = currentUsageMonth();
  const usage =
    profile.usage_month === month ? profile.monthly_usage_count ?? 0 : 0;
  const planType = normalizePlan(profile.plan_type) as PlanType;
  const sellerEmail = await getUserEmailById(profile.id);
  const limit = getPlanLimit(planType, profile.trial_ends_at, {
    isAdmin: isAdminEmail(sellerEmail),
    expiresAt: profile.expires_at,
  });
  const quotaFull = limit !== null && usage >= limit;

  return {
    shop: {
      id: profile.id,
      shop_name: profile.shop_name || "",
      bank_code: profile.bank_code || "",
      bank_account: profile.bank_account || "",
    },
    planType,
    monthlyUsageCount: usage,
    quotaFull,
    lineUserId: profile.line_user_id ?? null,
    lineAccessToken: profile.line_channel_access_token ?? null,
  };
}
