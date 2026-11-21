import { NextResponse } from "next/server";
import { z } from "zod";
import { listSellerCoupons, normalizeCouponCode } from "@/lib/coupons";
import { createClient } from "@/lib/supabase/server";

const createSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, "優惠碼至少 2 碼")
      .max(32, "優惠碼最多 32 碼")
      .regex(/^[A-Za-z0-9_-]+$/, "僅允許英數、底線與連字號"),
    discount_type: z.enum(["percentage", "fixed"]),
    discount_value: z.coerce.number().positive("折扣數值須大於 0"),
    min_spend: z.coerce.number().min(0).optional().nullable(),
    usage_type: z.enum(["unlimited", "limited"]).default("unlimited"),
    usage_limit: z.coerce.number().int().positive().optional().nullable(),
    is_active: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.discount_type === "percentage") {
      if (data.discount_value < 1 || data.discount_value > 99) {
        ctx.addIssue({
          code: "custom",
          message: "打折成數請填 1～99（例如 90＝九折）",
          path: ["discount_value"],
        });
      }
    }
    if (data.usage_type === "limited") {
      if (!data.usage_limit || data.usage_limit < 1) {
        ctx.addIssue({
          code: "custom",
          message: "限量模式請設定總使用上限次數",
          path: ["usage_limit"],
        });
      }
    }
  });

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const coupons = await listSellerCoupons(user.id);
    return NextResponse.json({ ok: true, coupons });
  } catch (error) {
    console.error("[store/coupons GET]", error);
    return NextResponse.json({ error: "讀取失敗" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "資料無效" },
        { status: 400 }
      );
    }

    const code = normalizeCouponCode(parsed.data.code);
    const usageType = parsed.data.usage_type;
    const { data, error } = await supabase
      .from("coupons")
      .insert({
        seller_id: user.id,
        code,
        discount_type: parsed.data.discount_type,
        discount_value: parsed.data.discount_value,
        min_spend:
          parsed.data.min_spend === undefined || parsed.data.min_spend === null
            ? null
            : parsed.data.min_spend,
        usage_type: usageType,
        usage_limit:
          usageType === "limited" ? parsed.data.usage_limit ?? null : null,
        is_active: parsed.data.is_active,
        usage_count: 0,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[store/coupons POST]", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "此優惠碼已存在，請換一個" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "建立失敗" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, coupon: data });
  } catch (error) {
    console.error("[store/coupons POST]", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
