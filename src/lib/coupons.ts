import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Coupon,
  CouponDiscountType,
  CouponUsageType,
} from "@/types/database";

export type CouponApplyResult =
  | {
      ok: true;
      coupon: Coupon;
      subtotal: number;
      discount_amount: number;
      total: number;
    }
  | {
      ok: false;
      error: string;
      code?:
        | "NOT_FOUND"
        | "INACTIVE"
        | "MIN_SPEND"
        | "USAGE_LIMIT"
        | "PHONE_USED"
        | "PHONE_REQUIRED"
        | "INVALID";
    };

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeCouponPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("886") && digits.length >= 11) {
    digits = `0${digits.slice(3)}`;
  }
  if (/^09\d{8}$/.test(digits)) return digits;
  return null;
}

/** Compute discount. percentage value 90 = 九折 (pay 90%). */
export function computeCouponDiscount(
  subtotal: number,
  discountType: CouponDiscountType,
  discountValue: number
): number {
  const base = Math.max(0, Number(subtotal) || 0);
  const value = Number(discountValue) || 0;
  if (base <= 0 || value <= 0) return 0;

  if (discountType === "percentage") {
    const payableRatio = Math.min(99, Math.max(1, value)) / 100;
    const payable = Math.round(base * payableRatio);
    return Math.max(0, base - payable);
  }

  return Math.min(base, Math.round(value));
}

function mapCouponRow(data: Record<string, unknown>): Coupon {
  const usageType =
    data.usage_type === "limited" ? "limited" : "unlimited";
  return {
    ...(data as unknown as Coupon),
    discount_value: Number(data.discount_value),
    min_spend: data.min_spend == null ? null : Number(data.min_spend),
    usage_type: usageType,
    usage_limit:
      usageType === "limited" && data.usage_limit != null
        ? Number(data.usage_limit)
        : null,
    usage_count: Number(data.usage_count) || 0,
  };
}

export function applyCouponToSubtotal(
  coupon: Pick<
    Coupon,
    | "discount_type"
    | "discount_value"
    | "min_spend"
    | "usage_type"
    | "usage_limit"
    | "usage_count"
    | "is_active"
  >,
  subtotal: number
): CouponApplyResult {
  if (!coupon.is_active) {
    return { ok: false, error: "此優惠碼已停用", code: "INACTIVE" };
  }

  const usageType: CouponUsageType =
    coupon.usage_type === "limited" ? "limited" : "unlimited";

  if (
    usageType === "limited" &&
    coupon.usage_limit != null &&
    coupon.usage_count >= coupon.usage_limit
  ) {
    return {
      ok: false,
      error: "此優惠碼已達使用上限",
      code: "USAGE_LIMIT",
    };
  }

  const amount = Math.max(0, Number(subtotal) || 0);
  if (coupon.min_spend != null && amount < Number(coupon.min_spend)) {
    return {
      ok: false,
      error: `未達最低消費門檻（需滿 NT$${Math.round(Number(coupon.min_spend))}）`,
      code: "MIN_SPEND",
    };
  }

  const discount = computeCouponDiscount(
    amount,
    coupon.discount_type,
    Number(coupon.discount_value)
  );
  if (discount <= 0) {
    return { ok: false, error: "此優惠碼目前無法折抵", code: "INVALID" };
  }

  return {
    ok: true,
    coupon: coupon as Coupon,
    subtotal: amount,
    discount_amount: discount,
    total: Math.max(0, amount - discount),
  };
}

export async function findSellerCouponByCode(
  sellerId: string,
  codeRaw: string
): Promise<Coupon | null> {
  const code = normalizeCouponCode(codeRaw);
  if (!code) return null;

  const admin = createAdminClient();
  // Exact match only — codes may contain `_` which is a LIKE wildcard
  const { data, error } = await admin
    .from("coupons")
    .select("*")
    .eq("seller_id", sellerId)
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("[coupons] find:", error);
    throw error;
  }
  if (!data) return null;
  return mapCouponRow(data as Record<string, unknown>);
}

export async function hasPhoneUsedCoupon(
  couponId: string,
  phone: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("coupon_usages")
    .select("id")
    .eq("coupon_id", couponId)
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    console.error("[coupons] phone used:", error);
    throw error;
  }
  return Boolean(data);
}

export async function validateSellerCoupon(input: {
  sellerId: string;
  code: string;
  subtotal: number;
  /** Required for phone anti-reuse check */
  phone?: string | null;
  /** When true, missing/invalid phone fails validation */
  requirePhone?: boolean;
}): Promise<CouponApplyResult> {
  const coupon = await findSellerCouponByCode(input.sellerId, input.code);
  if (!coupon) {
    return { ok: false, error: "優惠碼不存在或無效", code: "NOT_FOUND" };
  }

  const applied = applyCouponToSubtotal(coupon, input.subtotal);
  if (!applied.ok) return applied;

  const phone = input.phone ? normalizeCouponPhone(input.phone) : null;
  if (input.requirePhone) {
    if (!phone) {
      return {
        ok: false,
        error: "請先填寫正確手機號碼（09 開頭共 10 碼）再套用優惠碼",
        code: "PHONE_REQUIRED",
      };
    }
  }

  if (phone) {
    const used = await hasPhoneUsedCoupon(coupon.id, phone);
    if (used) {
      return {
        ok: false,
        error: "此優惠碼每人限用一次",
        code: "PHONE_USED",
      };
    }
  }

  return { ...applied, coupon };
}

/**
 * Record phone redemption + bump global usage_count for LIMITED coupons.
 * Unique (coupon_id, phone) prevents duplicate redemptions under race.
 */
export async function consumeCouponUsage(input: {
  couponId: string;
  sellerId: string;
  phone: string;
  orderId?: string | null;
}): Promise<{ ok: boolean; error?: string; code?: "PHONE_USED" | "USAGE_LIMIT" | "INVALID" }> {
  const phone = normalizeCouponPhone(input.phone);
  if (!phone) {
    return { ok: false, error: "手機號碼無效", code: "INVALID" };
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("coupons")
    .select("id, seller_id, usage_type, usage_limit, usage_count, is_active")
    .eq("id", input.couponId)
    .maybeSingle();

  if (error || !row || !row.is_active || row.seller_id !== input.sellerId) {
    return { ok: false, error: "優惠碼無效", code: "INVALID" };
  }

  const usageType: CouponUsageType =
    row.usage_type === "limited" ? "limited" : "unlimited";

  if (
    usageType === "limited" &&
    row.usage_limit != null &&
    row.usage_count >= row.usage_limit
  ) {
    return { ok: false, error: "此優惠碼已達使用上限", code: "USAGE_LIMIT" };
  }

  const { error: insertError } = await admin.from("coupon_usages").insert({
    coupon_id: input.couponId,
    seller_id: input.sellerId,
    phone,
    order_id: input.orderId || null,
  });

  if (insertError) {
    // unique violation = phone already used this coupon
    if (insertError.code === "23505") {
      return {
        ok: false,
        error: "此優惠碼每人限用一次",
        code: "PHONE_USED",
      };
    }
    console.error("[coupons] usage insert:", insertError);
    return { ok: false, error: "無法記錄優惠碼使用", code: "INVALID" };
  }

  if (usageType === "limited") {
    const nextCount = Number(row.usage_count) + 1;
    let query = admin
      .from("coupons")
      .update({
        usage_count: nextCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.couponId)
      .eq("usage_count", row.usage_count);

    if (row.usage_limit != null) {
      query = query.lt("usage_count", row.usage_limit);
    }

    const { data: updated, error: updError } = await query
      .select("id")
      .maybeSingle();

    if (updError || !updated) {
      // Roll back phone usage so the order route can delete the order
      await admin
        .from("coupon_usages")
        .delete()
        .eq("coupon_id", input.couponId)
        .eq("phone", phone);
      console.warn(
        "[coupons] usage_count bump raced/failed; rolled back phone usage",
        input.couponId,
        updError
      );
      return {
        ok: false,
        error: "此優惠碼已達使用上限",
        code: "USAGE_LIMIT",
      };
    }
  } else {
    // Still track aggregate redemptions for seller analytics
    await admin
      .from("coupons")
      .update({
        usage_count: Number(row.usage_count) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.couponId)
      .eq("usage_count", row.usage_count);
  }

  return { ok: true };
}

export async function listSellerCoupons(sellerId: string): Promise<Coupon[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("coupons")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row) =>
    mapCouponRow(row as Record<string, unknown>)
  );
}
