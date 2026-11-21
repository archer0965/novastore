import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z
  .object({
    status: z.enum(["active", "success", "closed"]).optional(),
    stock: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
    is_preorder: z.boolean().optional(),
    preorder_notice: z.string().trim().max(200).optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.stock !== undefined ||
      data.is_preorder !== undefined ||
      data.preorder_notice !== undefined,
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

    const patch: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) patch.status = parsed.data.status;
    if (parsed.data.stock !== undefined) patch.stock = parsed.data.stock;
    if (parsed.data.is_preorder !== undefined) {
      patch.is_preorder = parsed.data.is_preorder;
      if (!parsed.data.is_preorder) {
        patch.preorder_notice = "";
      }
    }
    if (parsed.data.preorder_notice !== undefined) {
      patch.preorder_notice = parsed.data.preorder_notice;
    }

    const { data, error } = await supabase
      .from("products")
      .update(patch)
      .eq("id", context.params.id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[store/products PATCH]", error);
      return NextResponse.json({ error: "更新失敗" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "找不到商品" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, product: data });
  } catch (error) {
    console.error("[store/products PATCH]", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
