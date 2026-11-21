import { NextResponse } from "next/server";
import { getBuyerShopContext } from "@/lib/shop-public";

/**
 * Public shop endpoint for buyer pages.
 * Returns only safe shop fields + quota flag — never payment_reports history.
 */
export async function GET(
  _request: Request,
  { params }: { params: { sellerId: string } }
) {
  try {
    const ctx = await getBuyerShopContext(params.sellerId);

    if (!ctx) {
      return NextResponse.json({ error: "找不到此賣家" }, { status: 404 });
    }

    return NextResponse.json({
      shop: ctx.shop,
      quota_full: ctx.quotaFull,
      plan_type: ctx.planType,
      // Do not expose monthly_usage_count details beyond the boolean flag
    });
  } catch (error) {
    console.error("[shop]", error);
    return NextResponse.json(
      { error: "暫時無法取得店家資料，請稍後再試" },
      { status: 503 }
    );
  }
}
