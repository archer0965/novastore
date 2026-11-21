import { NextResponse } from "next/server";
import { z } from "zod";
import { coerceOrderItems } from "@/lib/order-items";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  STORE_TYPE_LABELS,
  type ConvenienceStoreType,
  type StoreOrder,
} from "@/types/database";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const schema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "請輸入訂單編號或買家姓名")
    .max(64),
});

type QueryType = "order_id" | "phone" | "name";

function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("886") && digits.length >= 11) {
    digits = `0${digits.slice(3)}`;
  }
  if (/^09\d{8}$/.test(digits)) return digits;
  return null;
}

function normalizeBuyerName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) return null;
  // Reject pure digits / UUID-like noise; allow CJK + letters
  if (/^\d+$/.test(name)) return null;
  if (!/[\u4e00-\u9fffA-Za-z]/.test(name)) return null;
  return name;
}

function maskName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 1) return "*";
  if (trimmed.length === 2) return `${trimmed[0]}*`;
  return `${trimmed[0]}${"*".repeat(Math.min(4, trimmed.length - 2))}${trimmed.slice(-1)}`;
}

function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return "***";
  return `${digits.slice(0, 4)}****${digits.slice(-2)}`;
}

type ProductEmbed = {
  title?: string | null;
  mode?: string | null;
  user_id?: string | null;
};

type TrackOrderRow = {
  id: string;
  buyer_name_masked: string;
  quantity: number;
  total_amount: number;
  atm_last5: string;
  payment_status: "pending" | "matched";
  payment_label: string;
  fulfillment_status: "unfulfilled" | "fulfilled";
  fulfillment_label: string;
  items: ReturnType<typeof coerceOrderItems>;
  items_summary: string;
  store_type: ConvenienceStoreType | null;
  store_type_label: string | null;
  store_info: string | null;
  receiver_phone: string | null;
  product_title: string;
  product_mode: "agency" | "group_buy" | null;
  shop_name: string | null;
  created_at: string;
};

function toPublicOrder(
  order: StoreOrder & { products?: ProductEmbed | ProductEmbed[] | null },
  shopNameByUserId: Map<string, string>,
  queryType: QueryType
): TrackOrderRow {
  const product = Array.isArray(order.products)
    ? order.products[0]
    : order.products;
  const items = coerceOrderItems(order);
  const fulfillment =
    order.fulfillment_status === "fulfilled" ? "fulfilled" : "unfulfilled";
  const payment = order.payment_status === "matched" ? "matched" : "pending";
  const storeType = (order.store_type as ConvenienceStoreType | null) || null;
  const sellerId = product?.user_id || "";
  // Unauthenticated track: only exact order id may see full logistics PII.
  // Phone / name lookups stay masked to limit enumeration leaks.
  const hidePii = queryType !== "order_id";

  return {
    id: order.id,
    buyer_name_masked: maskName(order.buyer_name || ""),
    quantity: Number(order.quantity) || 0,
    total_amount: Number(order.total_amount) || 0,
    atm_last5: hidePii ? "" : order.atm_last5 || "",
    payment_status: payment,
    payment_label: payment === "matched" ? "已對帳（已確認收款）" : "未對帳",
    fulfillment_status: fulfillment,
    fulfillment_label: fulfillment === "fulfilled" ? "已出貨" : "未出貨",
    items,
    items_summary: order.items_summary || "",
    store_type: storeType,
    store_type_label: storeType ? STORE_TYPE_LABELS[storeType] : null,
    store_info: hidePii ? null : order.store_info || null,
    receiver_phone: hidePii
      ? maskPhone(order.receiver_phone || null)
      : order.receiver_phone || null,
    product_title: product?.title || "商品",
    product_mode:
      product?.mode === "group_buy" || product?.mode === "agency"
        ? product.mode
        : null,
    shop_name: sellerId ? shopNameByUserId.get(sellerId) || null : null,
    created_at: order.created_at,
  };
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "資料無效" },
        { status: 400 }
      );
    }

    const q = parsed.data.q.trim();
    const phone = normalizePhone(q);
    const isUuid = UUID_RE.test(q);
    const buyerName = !isUuid && !phone ? normalizeBuyerName(q) : null;

    let queryType: QueryType;
    if (isUuid) queryType = "order_id";
    else if (phone) queryType = "phone";
    else if (buyerName) queryType = "name";
    else {
      return NextResponse.json(
        {
          error:
            "請輸入完整訂單編號，或下單時的買家姓名（亦可使用手機號碼）",
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    let builder = admin
      .from("orders")
      .select(
        `
        id,
        product_id,
        buyer_name,
        quantity,
        total_amount,
        atm_last5,
        payment_status,
        fulfillment_status,
        store_type,
        store_info,
        receiver_phone,
        selected_color,
        selected_size,
        items,
        items_summary,
        created_at,
        products!inner (
          title,
          mode,
          user_id
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(queryType === "name" ? 20 : 30);

    if (queryType === "order_id") {
      builder = builder.eq("id", q.toLowerCase());
    } else if (queryType === "phone") {
      builder = builder.eq("receiver_phone", phone!);
    } else {
      // Exact match on buyer_name (trim spaces already normalized)
      builder = builder.eq("buyer_name", buyerName!);
    }

    const { data, error } = await builder;
    if (error) {
      console.error("[orders/track]", error);
      return NextResponse.json({ error: "查詢失敗，請稍後再試" }, { status: 500 });
    }

    const rows = (data || []) as unknown as Array<
      StoreOrder & { products?: ProductEmbed | ProductEmbed[] | null }
    >;

    const sellerIds = Array.from(
      new Set(
        rows
          .map((row) => {
            const product = Array.isArray(row.products)
              ? row.products[0]
              : row.products;
            return product?.user_id || "";
          })
          .filter(Boolean)
      )
    );

    const shopNameByUserId = new Map<string, string>();
    if (sellerIds.length) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, shop_name")
        .in("id", sellerIds);
      for (const profile of profiles || []) {
        if (profile.shop_name) {
          shopNameByUserId.set(profile.id, profile.shop_name);
        }
      }
    }

    const orders = rows.map((row) =>
      toPublicOrder(row, shopNameByUserId, queryType)
    );

    return NextResponse.json({
      ok: true,
      query_type: queryType,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("[orders/track]", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
