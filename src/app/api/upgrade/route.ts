import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserEmailById } from "@/lib/admin";
import { buildAutoSubmitHtml, buildCheckoutParams } from "@/lib/ecpay";
import { sendSubscriptionConfirmedEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site";
import { calculateUpgradeProration } from "@/lib/subscription";
import {
  PLAN_CATALOG,
  getPlanDisplayName,
  isPaidPlan,
  normalizeBillingCycle,
  normalizePlan,
  type PaidPlanKey,
} from "@/types/database";

const bodySchema = z.object({
  plan: z.enum(["starter", "pro", "unlimited", "plus", "premium"]),
  /** quote = only calculate; confirm = create ECPay top-up (default quote for GET) */
  action: z.enum(["quote", "confirm"]).default("quote"),
});

function resolvePaidPlan(raw: string): PaidPlanKey {
  if (raw === "plus") return "starter";
  if (raw === "premium" || raw === "unlimited") return "pro";
  return raw as PaidPlanKey;
}

async function loadProfile(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, plan_type, billing_cycle, expires_at, trial_ends_at, is_early_bird, discount_tier"
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const planParam = new URL(request.url).searchParams.get("plan") || "";
    if (!["starter", "pro", "unlimited", "plus", "premium"].includes(planParam)) {
      return NextResponse.json({ error: "請指定有效方案" }, { status: 400 });
    }

    const profile = await loadProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: "找不到個人資料" }, { status: 404 });
    }

    const toPlan = resolvePaidPlan(planParam);
    const quote = calculateUpgradeProration({
      fromPlan: profile.plan_type,
      toPlan,
      cycle: normalizeBillingCycle(profile.billing_cycle),
      expiresAt: profile.expires_at,
      discountTier: profile.discount_tier,
      isEarlyBird: profile.is_early_bird,
    });

    return NextResponse.json({ ok: true, quote });
  } catch (error) {
    console.error("[upgrade/GET]", error);
    return NextResponse.json({ error: "無法計算升級差價" }, { status: 500 });
  }
}

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
      return NextResponse.json({ error: "請選擇有效方案" }, { status: 400 });
    }

    const toPlan = resolvePaidPlan(parsed.data.plan);
    if (!isPaidPlan(toPlan)) {
      return NextResponse.json({ error: "無效的付費方案" }, { status: 400 });
    }

    const profile = await loadProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: "找不到個人資料" }, { status: 404 });
    }

    const cycle = normalizeBillingCycle(profile.billing_cycle);
    const quote = calculateUpgradeProration({
      fromPlan: profile.plan_type,
      toPlan,
      cycle,
      expiresAt: profile.expires_at,
      discountTier: profile.discount_tier,
      isEarlyBird: profile.is_early_bird,
    });

    if (parsed.data.action === "quote") {
      return NextResponse.json({ ok: true, quote });
    }

    // confirm
    if (!quote.eligible) {
      return NextResponse.json(
        { error: quote.message, code: quote.reason, quote },
        { status: 400 }
      );
    }

    // Zero top-up (edge): apply upgrade immediately without ECPay
    if (quote.topUpAmount <= 0 && quote.keepExpiresAt) {
      const admin = createAdminClient();
      const { error } = await admin
        .from("profiles")
        .update({
          plan_type: toPlan,
          billing_cycle: cycle,
          expires_at: quote.keepExpiresAt,
          trial_ends_at: null,
        })
        .eq("id", user.id);
      if (error) {
        console.error("[upgrade] free upgrade failed", error);
        return NextResponse.json({ error: "升級失敗" }, { status: 500 });
      }

      try {
        const email = await getUserEmailById(user.id);
        if (email) {
          await sendSubscriptionConfirmedEmail({
            to: email,
            shopName: null,
            planType: toPlan,
            billingCycle: cycle,
            expiresAt: quote.keepExpiresAt,
            mode: "upgrade",
          });
        }
      } catch (notifyError) {
        console.error("[upgrade] confirm mail failed", notifyError);
      }

      return NextResponse.json({
        ok: true,
        applied: true,
        quote,
        message: "已套用升級（無需補差價）",
      });
    }

    const baseUrl = getSiteUrl();
    const stamp = Date.now().toString(36).toUpperCase();
    const uid = user.id.replace(/-/g, "").slice(0, 8).toUpperCase();
    const merchantTradeNo = `UPG${uid}${stamp}`.slice(0, 20);
    const fromName = getPlanDisplayName(normalizePlan(profile.plan_type));
    const toName = PLAN_CATALOG[toPlan].name;

    const { paymentUrl, params } = buildCheckoutParams({
      merchantTradeNo,
      totalAmount: quote.topUpAmount,
      tradeDesc: `PayCheck upgrade ${fromName}->${toName}`,
      itemName: `NovaStore 升級補差價 ${fromName}→${toName}（餘${quote.remainingDays}天）`,
      returnURL: `${baseUrl}/api/checkout/callback`,
      clientBackURL: `${baseUrl}/dashboard/settings?upgraded=proration`,
      customField1: user.id,
      // upgrade:<toPlan>:<cycle> — callback keeps expires_at
      customField2: `upgrade:${toPlan}:${cycle}`,
    });

    const html = buildAutoSubmitHtml(paymentUrl, params);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Upgrade-Topup": String(quote.topUpAmount),
        "X-Upgrade-Remaining-Days": String(quote.remainingDays),
      },
    });
  } catch (error) {
    console.error("[upgrade/POST]", error);
    return NextResponse.json(
      { error: "無法建立升級付款，請稍後再試" },
      { status: 500 }
    );
  }
}
