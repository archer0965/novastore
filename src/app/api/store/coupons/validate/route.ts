import { NextResponse } from "next/server";
import { z } from "zod";
import { validateSellerCoupon } from "@/lib/coupons";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  product_id: z.string().uuid(),
  code: z.string().trim().min(1, "請輸入優惠碼").max(32),
  /** Preferred: server computes subtotal from product price × quantity */
  quantity: z.coerce.number().int().min(1).max(999).optional(),
  /** Legacy client-provided subtotal (ignored when quantity is set) */
  subtotal: z.coerce.number().min(0).optional(),
  /** Receiver phone — required to enforce per-phone one-time use */
  phone: z.string().trim().min(1, "請填寫手機號碼").max(20),
});

/** Public: preview a promo code against seller + cart + phone anti-reuse. */
export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "資料無效" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: product, error } = await admin
      .from("products")
      .select("id, user_id, price")
      .eq("id", parsed.data.product_id)
      .maybeSingle();

    if (error) {
      console.error("[coupons/validate]", error);
      return NextResponse.json({ error: "查詢失敗" }, { status: 500 });
    }
    if (!product) {
      return NextResponse.json({ error: "找不到商品" }, { status: 404 });
    }

    const unit = Number(product.price) || 0;
    const qty = parsed.data.quantity;
    const subtotal =
      qty != null
        ? unit * qty
        : Math.min(parsed.data.subtotal ?? 0, unit * 999);

    const result = await validateSellerCoupon({
      sellerId: product.user_id,
      code: parsed.data.code,
      subtotal,
      phone: parsed.data.phone,
      requirePhone: true,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, code: result.code },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      code: result.coupon.code,
      discount_type: result.coupon.discount_type,
      discount_value: result.coupon.discount_value,
      usage_type: result.coupon.usage_type,
      subtotal: result.subtotal,
      discount_amount: result.discount_amount,
      total: result.total,
      min_spend: result.coupon.min_spend,
    });
  } catch (error) {
    console.error("[coupons/validate]", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
