import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeCouponCode } from "@/lib/coupons";
import { createClient } from "@/lib/supabase/server";

const patchSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(32)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    discount_type: z.enum(["percentage", "fixed"]).optional(),
    discount_value: z.coerce.number().positive().optional(),
    min_spend: z.coerce.number().min(0).nullable().optional(),
    usage_type: z.enum(["unlimited", "limited"]).optional(),
    usage_limit: z.coerce.number().int().positive().nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.discount_type === "percentage" &&
      data.discount_value != null &&
      (data.discount_value < 1 || data.discount_value > 99)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "打折成數請填 1～99（例如 90＝九折）",
        path: ["discount_value"],
      });
    }
    if (data.usage_type === "limited") {
      if (data.usage_limit == null || data.usage_limit < 1) {
        ctx.addIssue({
          code: "custom",
          message: "限量模式請設定總使用上限次數",
          path: ["usage_limit"],
        });
      }
    }
  });

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "資料無效" },
        { status: 400 }
      );
    }

    // When switching to percentage without a new value, validate the stored value.
    if (
      parsed.data.discount_type === "percentage" &&
      parsed.data.discount_value == null
    ) {
      const { data: existing } = await supabase
        .from("coupons")
        .select("discount_value")
        .eq("id", context.params.id)
        .eq("seller_id", user.id)
        .maybeSingle();
      const currentValue = Number(existing?.discount_value);
      if (
        !Number.isFinite(currentValue) ||
        currentValue < 1 ||
        currentValue > 99
      ) {
        return NextResponse.json(
          {
            error:
              "改為折扣百分比時，請同時設定 1～99 的折扣成數（例如 90＝九折）",
          },
          { status: 400 }
        );
      }
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.code !== undefined) {
      patch.code = normalizeCouponCode(parsed.data.code);
    }
    if (parsed.data.discount_type !== undefined) {
      patch.discount_type = parsed.data.discount_type;
    }
    if (parsed.data.discount_value !== undefined) {
      patch.discount_value = parsed.data.discount_value;
    }
    if (parsed.data.min_spend !== undefined) {
      patch.min_spend = parsed.data.min_spend;
    }
    if (parsed.data.usage_type !== undefined) {
      patch.usage_type = parsed.data.usage_type;
      if (parsed.data.usage_type === "unlimited") {
        patch.usage_limit = null;
      }
    }
    if (parsed.data.usage_limit !== undefined) {
      if (parsed.data.usage_type === "unlimited") {
        patch.usage_limit = null;
      } else {
        patch.usage_limit = parsed.data.usage_limit;
      }
    }
    if (parsed.data.is_active !== undefined) {
      patch.is_active = parsed.data.is_active;
    }

    const { data, error } = await supabase
      .from("coupons")
      .update(patch)
      .eq("id", context.params.id)
      .eq("seller_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[store/coupons PATCH]", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "此優惠碼已存在，請換一個" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "更新失敗" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "找不到優惠碼" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, coupon: data });
  } catch (error) {
    console.error("[store/coupons PATCH]", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("id", context.params.id)
      .eq("seller_id", user.id);

    if (error) {
      console.error("[store/coupons DELETE]", error);
      return NextResponse.json({ error: "刪除失敗" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[store/coupons DELETE]", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
