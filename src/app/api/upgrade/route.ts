import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getNovaOsUpgradeUrl } from "@/lib/novaos-hub";
import { calculateUpgradeProration } from "@/lib/subscription";
import {
  isPaidPlan,
  normalizeBillingCycle,
  type PaidPlanKey,
} from "@/types/database";

const bodySchema = z.object({
  plan: z.enum(["starter", "pro", "unlimited", "plus", "premium"]),
  /** quote = informational only; confirm = redirect to hub ECPay */
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

/** Informational proration quote (payment itself is on NovaOS hub). */
export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planRaw = searchParams.get("plan") || "pro";
    const toPlan = resolvePaidPlan(planRaw);
    if (!isPaidPlan(toPlan)) {
      return NextResponse.json({ error: "無效的付費方案" }, { status: 400 });
    }

    const profile = await loadProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: "找不到賣家資料" }, { status: 404 });
    }

    const quote = calculateUpgradeProration({
      fromPlan: profile.plan_type,
      toPlan,
      cycle: normalizeBillingCycle(profile.billing_cycle),
      expiresAt: profile.expires_at,
      discountTier: profile.discount_tier,
      isEarlyBird: profile.is_early_bird,
    });

    return NextResponse.json({
      quote,
      checkoutUrl: getNovaOsUpgradeUrl(),
      hub: true,
    });
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
      return NextResponse.json(
        { error: "請選擇有效方案" },
        { status: 400 }
      );
    }

    const toPlan = resolvePaidPlan(parsed.data.plan);
    if (!isPaidPlan(toPlan)) {
      return NextResponse.json({ error: "無效的付費方案" }, { status: 400 });
    }

    if (parsed.data.action === "quote") {
      const profile = await loadProfile(user.id);
      if (!profile) {
        return NextResponse.json({ error: "找不到賣家資料" }, { status: 404 });
      }
      const quote = calculateUpgradeProration({
        fromPlan: profile.plan_type,
        toPlan,
        cycle: normalizeBillingCycle(profile.billing_cycle),
        expiresAt: profile.expires_at,
        discountTier: profile.discount_tier,
        isEarlyBird: profile.is_early_bird,
      });
      return NextResponse.json({
        quote,
        checkoutUrl: getNovaOsUpgradeUrl(),
        hub: true,
      });
    }

    // confirm → 統一主站綠界
    return NextResponse.json({
      checkoutUrl: getNovaOsUpgradeUrl(),
      gateway: "ecpay",
      hub: true,
      message: "請至拓新雲端主站完成綠界付款",
    });
  } catch (error) {
    console.error("[upgrade/POST]", error);
    return NextResponse.json({ error: "無法建立升級導向" }, { status: 500 });
  }
}
