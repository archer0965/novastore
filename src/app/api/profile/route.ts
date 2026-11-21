import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  shop_name: z.string().trim().min(1, "請填寫店名").max(80),
  shop_bio: z
    .string()
    .trim()
    .max(200, "賣場簡介最多 200 字")
    .optional()
    .default(""),
  bank_code: z.string().trim().min(1, "請填寫銀行代碼").max(20),
  bank_account: z.string().trim().min(1, "請填寫銀行帳號").max(40),
  line_user_id: z
    .string()
    .trim()
    .max(64)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .refine(
      (v) => v === null || /^U[0-9a-f]{32}$/i.test(v),
      "LINE User ID 格式不正確。應為 U 開頭加上 32 位英數字，例如 Ua1b2c3...（不是 LINE 顯示名稱）"
    ),
  /** Empty string = keep existing; non-empty = replace; null with clear flag handled below */
  line_channel_access_token: z
    .string()
    .max(500)
    .optional()
    .nullable(),
  line_channel_secret: z.string().max(200).optional().nullable(),
  clear_line_channel_credentials: z.boolean().optional().default(false),
  enable_cod: z.boolean().optional(),
  cod_url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v ? v : null)),
  cod_label: z
    .string()
    .trim()
    .max(40)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v ? v : null)),
  shipping_fee: z.coerce.number().int().min(0).max(99999).optional(),
  free_shipping_enabled: z.boolean().optional(),
  free_shipping_threshold: z
    .union([z.coerce.number().int().min(0).max(9999999), z.null()])
    .optional(),
});

export async function PATCH(request: Request) {
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

    const {
      shop_name,
      shop_bio,
      bank_code,
      bank_account,
      line_user_id,
      line_channel_access_token,
      line_channel_secret,
      clear_line_channel_credentials,
      enable_cod,
      cod_url,
      cod_label,
      shipping_fee,
      free_shipping_enabled,
      free_shipping_threshold,
    } = parsed.data;

    if (enable_cod === true && !cod_url) {
      return NextResponse.json(
        { error: "啟用外部結帳時，請填寫連結（賣貨便／好賣+／蝦皮／其他皆可）" },
        { status: 400 }
      );
    }
    if (cod_url && !/^https?:\/\//i.test(cod_url)) {
      return NextResponse.json(
        { error: "外部結帳連結需為 http(s) 開頭的完整網址" },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {
      shop_name,
      shop_bio,
      bank_code,
      bank_account,
      line_user_id,
    };

    if (typeof enable_cod === "boolean") {
      update.enable_cod = enable_cod;
      update.cod_url = enable_cod ? cod_url || null : null;
      update.cod_label = enable_cod ? cod_label || null : null;
    } else {
      if (cod_url !== undefined) update.cod_url = cod_url;
      if (cod_label !== undefined) update.cod_label = cod_label;
    }

    if (shipping_fee !== undefined) {
      update.shipping_fee = shipping_fee;
    }
    if (typeof free_shipping_enabled === "boolean") {
      update.free_shipping_enabled = free_shipping_enabled;
      if (free_shipping_enabled) {
        update.free_shipping_threshold =
          free_shipping_threshold == null ? 0 : free_shipping_threshold;
      } else if (free_shipping_threshold !== undefined) {
        update.free_shipping_threshold = free_shipping_threshold;
      }
    } else if (free_shipping_threshold !== undefined) {
      update.free_shipping_threshold = free_shipping_threshold;
    }

    if (clear_line_channel_credentials) {
      update.line_channel_access_token = null;
      update.line_channel_secret = null;
    } else {
      const token = line_channel_access_token?.trim();
      if (token) {
        update.line_channel_access_token = token;
      }
      const secret = line_channel_secret?.trim();
      if (secret) {
        update.line_channel_secret = secret;
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id)
      .select(
        "id, shop_name, shop_bio, bank_code, bank_account, line_user_id, plan_type, monthly_usage_count, usage_month, line_channel_access_token, line_channel_secret, enable_cod, cod_url, cod_label, shipping_fee, free_shipping_enabled, free_shipping_threshold"
      )
      .single();

    if (error) {
      console.error("[profile]", error);
      return NextResponse.json({ error: "儲存失敗" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      profile: {
        ...data,
        line_channel_access_token: undefined,
        line_channel_secret: undefined,
        line_channel_access_token_set: Boolean(data.line_channel_access_token),
        line_channel_secret_set: Boolean(data.line_channel_secret),
      },
    });
  } catch (error) {
    console.error("[profile]", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
