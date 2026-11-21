import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z
  .object({
    payment_status: z.enum(["pending", "matched"]).optional(),
    fulfillment_status: z.enum(["unfulfilled", "fulfilled"]).optional(),
  })
  .refine(
    (data) =>
      data.payment_status !== undefined ||
      data.fulfillment_status !== undefined,
    { message: "沒有可更新的欄位" }
  );

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

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "資料無效" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: order, error: findError } = await admin
      .from("orders")
      .select("id, product_id")
      .eq("id", context.params.id)
      .maybeSingle();

    if (findError) {
      console.error("[store/orders PATCH find]", findError);
      return NextResponse.json({ error: "讀取失敗" }, { status: 500 });
    }
    if (!order) {
      return NextResponse.json({ error: "找不到訂單" }, { status: 404 });
    }

    const { data: product } = await admin
      .from("products")
      .select("id, user_id")
      .eq("id", order.product_id)
      .maybeSingle();

    if (!product || product.user_id !== user.id) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const patch: Record<string, string> = {};
    if (parsed.data.payment_status !== undefined) {
      patch.payment_status = parsed.data.payment_status;
    }
    if (parsed.data.fulfillment_status !== undefined) {
      patch.fulfillment_status = parsed.data.fulfillment_status;
    }

    const { data, error } = await admin
      .from("orders")
      .update(patch)
      .eq("id", context.params.id)
      .select("*")
      .single();

    if (error) {
      console.error("[store/orders PATCH]", error);
      return NextResponse.json({ error: "更新失敗" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, order: data });
  } catch (error) {
    console.error("[store/orders PATCH]", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
