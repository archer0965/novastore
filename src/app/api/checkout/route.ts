import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildAutoSubmitHtml, buildCheckoutParams } from "@/lib/ecpay";
import { getSiteUrl } from "@/lib/site";
import {
  PLAN_CATALOG,
  getCheckoutAmount,
  getCycleLabel,
  isPaidPlan,
  normalizeBillingCycle,
  type BillingCycle,
  type PaidPlanKey,
} from "@/types/database";

const bodySchema = z.object({
  plan: z.enum(["starter", "pro", "unlimited", "plus", "premium"]),
  cycle: z
    .enum(["monthly", "half_yearly", "yearly", "halfYearly"])
    .default("monthly"),
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const json = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "請選擇有效的方案與計費週期" },
        { status: 400 }
      );
    }

    const planRaw = parsed.data.plan;
    const plan: PaidPlanKey =
      planRaw === "plus"
        ? "starter"
        : planRaw === "premium" || planRaw === "unlimited"
          ? "pro"
          : (planRaw as PaidPlanKey);

    if (!isPaidPlan(plan)) {
      return NextResponse.json({ error: "無效的付費方案" }, { status: 400 });
    }

    const cycle = normalizeBillingCycle(parsed.data.cycle) as BillingCycle;

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_early_bird, discount_tier")
      .eq("id", user.id)
      .maybeSingle();

    const amount = getCheckoutAmount(plan, cycle, {
      discountTier: profile?.discount_tier,
      isEarlyBird: profile?.is_early_bird,
    });
    const catalog = PLAN_CATALOG[plan];
    const cycleLabel = getCycleLabel(cycle);
    const earlyBird =
      profile?.discount_tier === "lifetime_special" || profile?.is_early_bird;

    const baseUrl = getSiteUrl();

    const stamp = Date.now().toString(36).toUpperCase();
    const uid = user.id.replace(/-/g, "").slice(0, 8).toUpperCase();
    const merchantTradeNo = `PCP${uid}${stamp}`.slice(0, 20);

    const { paymentUrl, params } = buildCheckoutParams({
      merchantTradeNo,
      totalAmount: amount,
      tradeDesc: `PayCheck ${catalog.name} ${cycleLabel}${
        earlyBird ? " 特約" : ""
      }`,
      itemName: `NovaStore ${catalog.name}（${cycleLabel}${
        earlyBird ? "·特約店家" : ""
      }）`,
      returnURL: `${baseUrl}/api/checkout/callback`,
      clientBackURL: `${baseUrl}/dashboard/settings?upgraded=1`,
      customField1: user.id,
      customField2: `${plan}:${cycle}`,
    });

    const html = buildAutoSubmitHtml(paymentUrl, params);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[checkout]", error);
    return NextResponse.json(
      { error: "無法建立綠界付款訂單，請確認金流設定" },
      { status: 500 }
    );
  }
}
