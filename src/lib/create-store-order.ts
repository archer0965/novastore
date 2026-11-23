/**
 * Atomic store-order insert with stock gate + idempotency.
 * Prefers DB RPC (single transaction); falls back to insert + post-check.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderLineItem, StoreOrder } from "@/types/database";

export type CreateStoreOrderInput = {
  product_id: string;
  buyer_name: string;
  quantity: number;
  total_amount: number;
  subtotal_amount: number;
  discount_amount: number;
  shipping_fee: number;
  coupon_id: string | null;
  coupon_code: string | null;
  atm_last5: string;
  store_type: string;
  store_info: string;
  receiver_phone: string;
  selected_color: string;
  selected_size: string;
  items: OrderLineItem[];
  items_summary: string;
  /** UUID from client — dedupes double-submit */
  client_request_id?: string | null;
  /** Known product stock (null = unlimited); used by fallback path */
  stock?: number | null;
};

export type CreateStoreOrderResult =
  | { ok: true; order: StoreOrder; deduped: boolean }
  | { ok: false; error: string; code?: string; status: number };

function mapRow(row: Record<string, unknown>): StoreOrder {
  return row as unknown as StoreOrder;
}

async function findByClientRequestId(
  admin: SupabaseClient,
  clientRequestId: string
): Promise<StoreOrder | null> {
  const { data, error } = await admin
    .from("orders")
    .select("*")
    .eq("client_request_id", clientRequestId)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

async function fallbackInsert(
  admin: SupabaseClient,
  input: CreateStoreOrderInput
): Promise<CreateStoreOrderResult> {
  if (input.client_request_id) {
    const existing = await findByClientRequestId(admin, input.client_request_id);
    if (existing) {
      return { ok: true, order: existing, deduped: true };
    }
  }

  if (input.stock != null) {
    const { data: orderRows } = await admin
      .from("orders")
      .select("quantity")
      .eq("product_id", input.product_id);
    const ordered = (orderRows || []).reduce(
      (sum, row) => sum + Number((row as { quantity?: number }).quantity || 0),
      0
    );
    const remaining = Math.max(0, Number(input.stock) - ordered);
    if (remaining <= 0) {
      return { ok: false, error: "已售完", code: "STOCK", status: 400 };
    }
    if (input.quantity > remaining) {
      return {
        ok: false,
        error: `庫存不足，目前剩餘 ${remaining} 件`,
        code: "STOCK",
        status: 400,
      };
    }
  }

  const insertPayload: Record<string, unknown> = {
    product_id: input.product_id,
    buyer_name: input.buyer_name,
    quantity: input.quantity,
    total_amount: input.total_amount,
    subtotal_amount: input.subtotal_amount,
    discount_amount: input.discount_amount,
    shipping_fee: input.shipping_fee,
    coupon_id: input.coupon_id,
    coupon_code: input.coupon_code,
    atm_last5: input.atm_last5,
    store_type: input.store_type,
    store_info: input.store_info,
    receiver_phone: input.receiver_phone,
    selected_color: input.selected_color,
    selected_size: input.selected_size,
    items: input.items,
    items_summary: input.items_summary,
    payment_status: "pending",
    payment_type: "atm",
    fulfillment_status: "unfulfilled",
  };
  if (input.client_request_id) {
    insertPayload.client_request_id = input.client_request_id;
  }

  const { data: order, error } = await admin
    .from("orders")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    // Unique violation on client_request_id → return original
    if (
      input.client_request_id &&
      (error.code === "23505" || /duplicate|unique/i.test(error.message || ""))
    ) {
      const existing = await findByClientRequestId(
        admin,
        input.client_request_id
      );
      if (existing) {
        return { ok: true, order: existing, deduped: true };
      }
    }
    // Column missing (migration not applied) — retry without token
    if (
      input.client_request_id &&
      /client_request_id/i.test(error.message || "")
    ) {
      delete insertPayload.client_request_id;
      const retry = await admin
        .from("orders")
        .insert(insertPayload)
        .select("*")
        .single();
      if (retry.error || !retry.data) {
        console.error("[create-store-order] fallback insert", retry.error);
        return { ok: false, error: "下單失敗", status: 500 };
      }
      const created = mapRow(retry.data as Record<string, unknown>);
      return await postInsertStockGuard(admin, input, created, false);
    }
    console.error("[create-store-order] insert", error);
    return { ok: false, error: "下單失敗", status: 500 };
  }

  const created = mapRow(order as Record<string, unknown>);
  return await postInsertStockGuard(admin, input, created, false);
}

async function postInsertStockGuard(
  admin: SupabaseClient,
  input: CreateStoreOrderInput,
  order: StoreOrder,
  deduped: boolean
): Promise<CreateStoreOrderResult> {
  if (input.stock == null || deduped) {
    return { ok: true, order, deduped };
  }
  const { data: orderRows } = await admin
    .from("orders")
    .select("quantity")
    .eq("product_id", input.product_id);
  const ordered = (orderRows || []).reduce(
    (sum, row) => sum + Number((row as { quantity?: number }).quantity || 0),
    0
  );
  if (ordered > Number(input.stock)) {
    await admin.from("orders").delete().eq("id", order.id);
    return {
      ok: false,
      error: "庫存不足，請減少數量後再試",
      code: "STOCK",
      status: 409,
    };
  }
  return { ok: true, order, deduped };
}

export async function createStoreOrderAtomic(
  admin: SupabaseClient,
  input: CreateStoreOrderInput
): Promise<CreateStoreOrderResult> {
  const payload = {
    product_id: input.product_id,
    buyer_name: input.buyer_name,
    quantity: input.quantity,
    total_amount: input.total_amount,
    subtotal_amount: input.subtotal_amount,
    discount_amount: input.discount_amount,
    shipping_fee: input.shipping_fee,
    coupon_id: input.coupon_id,
    coupon_code: input.coupon_code,
    atm_last5: input.atm_last5,
    store_type: input.store_type,
    store_info: input.store_info,
    receiver_phone: input.receiver_phone,
    selected_color: input.selected_color,
    selected_size: input.selected_size,
    items: input.items,
    items_summary: input.items_summary,
    client_request_id: input.client_request_id || null,
  };

  const { data, error } = await admin.rpc("insert_store_order_atomic", {
    p_payload: payload,
  });

  if (!error && data && typeof data === "object") {
    const result = data as {
      ok?: boolean;
      deduped?: boolean;
      error?: string;
      code?: string;
      order?: Record<string, unknown>;
    };
    if (result.ok && result.order) {
      return {
        ok: true,
        order: mapRow(result.order),
        deduped: Boolean(result.deduped),
      };
    }
    if (result.ok === false) {
      const status =
        result.code === "STOCK"
          ? 409
          : result.code === "NOT_FOUND"
            ? 404
            : 400;
      return {
        ok: false,
        error: result.error || "下單失敗",
        code: result.code,
        status,
      };
    }
  }

  // RPC missing or unexpected — fall back
  if (error) {
    console.warn(
      "[create-store-order] rpc unavailable, using fallback:",
      error.message
    );
  }
  return fallbackInsert(admin, input);
}
