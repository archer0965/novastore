import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureShopSlug, getStoreProductUrl } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

const schema = z
  .object({
    title: z.string().trim().min(1, "請填寫商品名稱").max(120),
    price: z.coerce.number().min(0, "價格不可為負"),
    mode: z.enum(["agency", "group_buy"]),
    variant_note: z.string().trim().max(200).optional().default(""),
    color_options: z
      .array(z.string().trim().min(1).max(30))
      .max(20)
      .optional()
      .default([]),
    size_options: z
      .array(z.string().trim().min(1).max(30))
      .max(20)
      .optional()
      .default([]),
    image_url: z
      .string()
      .trim()
      .max(500)
      .optional()
      .default("")
      .refine(
        (v) => !v || /^https?:\/\//i.test(v),
        "圖片請使用 http(s) 連結"
      ),
    target_quantity: z.coerce.number().int().positive().optional().nullable(),
    deadline: z.string().trim().optional().nullable(),
    /** null / omit = unlimited stock */
    stock: z
      .union([z.coerce.number().int().min(0), z.null()])
      .optional()
      .nullable(),
    is_preorder: z.boolean().optional().default(false),
    preorder_notice: z.string().trim().max(200).optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "group_buy") {
      if (!data.target_quantity) {
        ctx.addIssue({
          code: "custom",
          message: "請填寫成團門檻數量",
          path: ["target_quantity"],
        });
      }
      if (!data.deadline) {
        ctx.addIssue({
          code: "custom",
          message: "請選擇結單時間",
          path: ["deadline"],
        });
      } else if (Number.isNaN(Date.parse(data.deadline))) {
        ctx.addIssue({
          code: "custom",
          message: "結單時間格式不正確",
          path: ["deadline"],
        });
      } else if (Date.parse(data.deadline) <= Date.now() + 60_000) {
        ctx.addIssue({
          code: "custom",
          message: "結單時間需晚於現在至少 1 分鐘",
          path: ["deadline"],
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

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[store/products GET]", error);
      return NextResponse.json({ error: "讀取失敗" }, { status: 500 });
    }

    return NextResponse.json({ products: data || [] });
  } catch (error) {
    console.error("[store/products GET]", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
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

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "資料無效" },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, shop_name, shop_slug")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "請先完成個人設定（店名）" },
        { status: 400 }
      );
    }

    const shopSlug = await ensureShopSlug(
      user.id,
      profile.shop_name || body.title,
      profile.shop_slug
    );

    const uniq = (list: string[]) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const raw of list) {
        const v = raw.trim();
        if (!v) continue;
        const key = v.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(v);
      }
      return out;
    };

    const isPreorder = Boolean(body.is_preorder);
    const stockValue =
      body.stock === null || body.stock === undefined
        ? null
        : Number(body.stock);
    const row = {
      user_id: user.id,
      title: body.title,
      price: body.price,
      mode: body.mode,
      variant_note: body.variant_note || "",
      color_options: uniq(body.color_options || []),
      size_options: uniq(body.size_options || []),
      image_url: body.image_url || "",
      target_quantity: body.mode === "group_buy" ? body.target_quantity : null,
      current_quantity: 0,
      is_target_reached: false,
      deadline:
        body.mode === "group_buy" && body.deadline
          ? new Date(body.deadline).toISOString()
          : null,
      stock:
        stockValue != null && Number.isFinite(stockValue) ? stockValue : null,
      is_preorder: isPreorder,
      preorder_notice: isPreorder ? body.preorder_notice || "" : "",
      status: "active" as const,
    };

    const { data, error } = await supabase
      .from("products")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.error("[store/products POST]", error);
      return NextResponse.json({ error: "建立失敗" }, { status: 500 });
    }

    const shareUrl = getStoreProductUrl(shopSlug, data.id);
    return NextResponse.json({ ok: true, product: data, shopSlug, shareUrl });
  } catch (error) {
    console.error("[store/products POST]", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
