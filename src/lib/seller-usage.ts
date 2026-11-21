import { getUserEmailById, isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentUsageMonth } from "@/lib/utils-format";
import { getPlanLimit, normalizePlan } from "@/types/database";

export type SellerUsageGate =
  | {
      ok: true;
      seller: {
        id: string;
        line_user_id: string | null;
        line_channel_access_token: string | null;
        shop_name: string | null;
      };
      usageCount: number;
      month: string;
    }
  | {
      ok: false;
      status: 403 | 404 | 500;
      error: string;
      code?: "QUOTA_EXCEEDED";
      lineUserId?: string | null;
      lineAccessToken?: string | null;
    };

/** Shared monthly order quota gate for store orders / reports. */
export async function gateSellerMonthlyUsage(
  sellerId: string
): Promise<SellerUsageGate> {
  const admin = createAdminClient();
  const month = currentUsageMonth();

  const { data: seller, error } = await admin
    .from("profiles")
    .select(
      "id, shop_name, plan_type, monthly_usage_count, usage_month, line_user_id, line_channel_access_token, trial_ends_at, expires_at, discount_tier, is_early_bird, created_at"
    )
    .eq("id", sellerId)
    .maybeSingle();

  if (error) {
    console.error("[seller-usage]", error);
    return { ok: false, status: 500, error: "無法取得賣家資料" };
  }
  if (!seller) {
    return { ok: false, status: 404, error: "找不到此賣家" };
  }

  let usageCount = seller.monthly_usage_count ?? 0;
  if (seller.usage_month !== month) usageCount = 0;

  const plan = normalizePlan(seller.plan_type);
  const sellerEmail = await getUserEmailById(seller.id);
  const limit = getPlanLimit(plan, seller.trial_ends_at, {
    isAdmin: isAdminEmail(sellerEmail),
    expiresAt: seller.expires_at,
    createdAt: seller.created_at,
    discountTier: seller.discount_tier,
    isEarlyBird: seller.is_early_bird,
  });

  if (limit !== null && usageCount >= limit) {
    return {
      ok: false,
      status: 403,
      code: "QUOTA_EXCEEDED",
      error:
        "該賣家本月訂單額度已滿，已自動通知賣家處理。若需急迫下單，請直接私訊賣家，謝謝！",
      lineUserId: seller.line_user_id,
      lineAccessToken: seller.line_channel_access_token,
    };
  }

  return {
    ok: true,
    seller: {
      id: seller.id,
      line_user_id: seller.line_user_id,
      line_channel_access_token: seller.line_channel_access_token,
      shop_name: seller.shop_name,
    },
    usageCount,
    month,
  };
}

export async function bumpSellerMonthlyUsage(
  sellerId: string,
  usageCount: number,
  month: string
): Promise<void> {
  const admin = createAdminClient();

  // Optimistic CAS when still on the same usage month
  const { data: sameMonth, error: sameErr } = await admin
    .from("profiles")
    .update({
      monthly_usage_count: usageCount + 1,
      usage_month: month,
    })
    .eq("id", sellerId)
    .eq("usage_month", month)
    .eq("monthly_usage_count", usageCount)
    .select("id")
    .maybeSingle();

  if (sameErr) {
    console.error("[seller-usage] bump:", sameErr);
    return;
  }
  if (sameMonth) return;

  // Month rolled / first bump of the month: only reset when usage_month differs
  const { data: rolled, error: rollErr } = await admin
    .from("profiles")
    .update({
      monthly_usage_count: 1,
      usage_month: month,
    })
    .eq("id", sellerId)
    .neq("usage_month", month)
    .select("id")
    .maybeSingle();

  if (rollErr) {
    console.error("[seller-usage] bump month-roll:", rollErr);
    return;
  }
  if (rolled) return;

  // Concurrent bump already advanced the counter — best-effort absolute increment
  const { data: current } = await admin
    .from("profiles")
    .select("monthly_usage_count, usage_month")
    .eq("id", sellerId)
    .maybeSingle();
  if (!current) return;
  if (current.usage_month !== month) {
    await admin
      .from("profiles")
      .update({ monthly_usage_count: 1, usage_month: month })
      .eq("id", sellerId)
      .neq("usage_month", month);
    return;
  }
  await admin
    .from("profiles")
    .update({
      monthly_usage_count: Number(current.monthly_usage_count || 0) + 1,
      usage_month: month,
    })
    .eq("id", sellerId)
    .eq("usage_month", month)
    .eq("monthly_usage_count", current.monthly_usage_count);
}
