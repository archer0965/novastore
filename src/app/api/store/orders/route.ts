import { NextResponse } from "next/server";
import { z } from "zod";
import {
  consumeCouponUsage,
  validateSellerCoupon,
} from "@/lib/coupons";
import {
  formatOrderItemsSummary,
  normalizeOrderItems,
  sumOrderItemQuantity,
} from "@/lib/order-items";
import {
  sendLineGroupBuyReachedNotification,
  sendLineTextMessage,
} from "@/lib/line";
import {
  bumpSellerMonthlyUsage,
  gateSellerMonthlyUsage,
} from "@/lib/seller-usage";
import { createStoreOrderAtomic } from "@/lib/create-store-order";
import { quoteShipping } from "@/lib/shipping";
import { getSiteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportToHub } from "@/lib/novaos-telemetry";

const lineItemSchema = z.object({
  color: z.string().trim().max(30).optional().default(""),
  size: z.string().trim().max(30).optional().default(""),
  quantity: z.coerce.number().int().min(1, "數量至少 1").max(999),
});

const schema = z
  .object({
    product_id: z.string().uuid(),
    buyer_name: z.string().trim().min(1, "請填寫姓名").max(40),
    atm_last5: z
      .string()
      .trim()
      .regex(/^\d{4,5}$/, "請輸入匯款帳號末四～五碼"),
    store_type: z.enum(["711", "family"], {
      message: "請選擇超商取貨方式",
    }),
    store_info: z
      .string()
      .trim()
      .min(2, "請填寫取件門市名稱與店號")
      .max(120, "門市資訊過長"),
    receiver_phone: z
      .string()
      .trim()
      .regex(/^09\d{8}$/, "請輸入正確手機號碼（09 開頭共 10 碼）"),
    /** Preferred: multi-variant lines */
    items: z.array(lineItemSchema).min(1).max(20).optional(),
    /** Legacy single-variant payload */
    quantity: z.coerce.number().int().min(1).max(999).optional(),
    selected_color: z.string().trim().max(30).optional().default(""),
    selected_size: z.string().trim().max(30).optional().default(""),
    /** Optional promo code; validated server-side against seller coupons */
    coupon_code: z.string().trim().max(32).optional().nullable(),
    /** Checkout payment path; myship_cod is handled client-side via redirect */
    payment_type: z.enum(["atm", "myship_cod"]).optional().default("atm"),
    /** Client idempotency token (UUID) — prevents duplicate orders on double-submit */
    client_request_id: z.string().uuid().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.items?.length && data.quantity == null) {
      ctx.addIssue({
        code: "custom",
        message: "請至少選擇一組規格與數量",
        path: ["items"],
      });
    }
  });

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "資料無效" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: product, error: productError } = await admin
      .from("products")
      .select(
        "id, title, price, mode, status, user_id, deadline, color_options, size_options, stock, is_preorder, preorder_notice, target_quantity, current_quantity, is_target_reached"
      )
      .eq("id", parsed.data.product_id)
      .maybeSingle();

    if (productError) throw productError;
    if (!product) {
      return NextResponse.json({ error: "找不到商品" }, { status: 404 });
    }
    if (
      product.mode === "group_buy" &&
      product.deadline &&
      new Date(product.deadline).getTime() < Date.now()
    ) {
      if (product.status === "active" || product.status === "success") {
        await admin
          .from("products")
          .update({ status: "closed" })
          .eq("id", product.id)
          .in("status", ["active", "success"]);
      }
      return NextResponse.json({ error: "已過結單時間" }, { status: 400 });
    }
    if (product.status === "closed") {
      return NextResponse.json({ error: "此開團已結束" }, { status: 400 });
    }
    if (product.status !== "active" && product.status !== "success") {
      return NextResponse.json({ error: "此商品目前無法下單" }, { status: 400 });
    }

    const colors = Array.isArray(product.color_options)
      ? (product.color_options as unknown[]).filter(
          (v): v is string => typeof v === "string" && v.trim().length > 0
        )
      : [];
    const sizes = Array.isArray(product.size_options)
      ? (product.size_options as unknown[]).filter(
          (v): v is string => typeof v === "string" && v.trim().length > 0
        )
      : [];

    const rawItems =
      parsed.data.items && parsed.data.items.length
        ? parsed.data.items
        : [
            {
              color: parsed.data.selected_color || "",
              size: parsed.data.selected_size || "",
              quantity: parsed.data.quantity || 1,
            },
          ];

    const items = normalizeOrderItems(rawItems);
    if (!items.length) {
      return NextResponse.json(
        { error: "請至少選擇一組規格與數量" },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (colors.length > 0 && !colors.includes(item.color)) {
        return NextResponse.json(
          { error: `請選擇有效顏色（${item.color || "未選"}）` },
          { status: 400 }
        );
      }
      if (sizes.length > 0 && !sizes.includes(item.size)) {
        return NextResponse.json(
          { error: `請選擇有效尺寸（${item.size || "未選"}）` },
          { status: 400 }
        );
      }
      if (colors.length === 0 && item.color) {
        return NextResponse.json({ error: "此商品未提供顏色選項" }, { status: 400 });
      }
      if (sizes.length === 0 && item.size) {
        return NextResponse.json({ error: "此商品未提供尺寸選項" }, { status: 400 });
      }
    }

    const quantity = sumOrderItemQuantity(items);
    if (quantity < 1 || quantity > 999) {
      return NextResponse.json(
        { error: "總數量需介於 1～999" },
        { status: 400 }
      );
    }

    const usageGate = await gateSellerMonthlyUsage(product.user_id);
    if (!usageGate.ok) {
      if (usageGate.code === "QUOTA_EXCEEDED" && usageGate.lineUserId) {
        try {
          await sendLineTextMessage(
            usageGate.lineUserId,
            [
              "⚠️ 買家嘗試下單但本月訂單額度已滿",
              `商品：${product.title}`,
              "請升級方案或私訊買家處理。",
              `${getSiteUrl()}/dashboard/settings#upgrade`,
            ].join("\n"),
            { accessToken: usageGate.lineAccessToken }
          );
        } catch (lineError) {
          console.error("[store/orders] quota LINE notify:", lineError);
        }
      }
      return NextResponse.json(
        { error: usageGate.error, code: usageGate.code },
        { status: usageGate.status }
      );
    }

    const subtotal = Number(product.price) * quantity;
    let merchandiseTotal = subtotal;
    let discountAmount = 0;
    let couponId: string | null = null;
    let couponCode: string | null = null;

    if (parsed.data.payment_type === "myship_cod") {
      return NextResponse.json(
        {
          error:
            "外部結帳請由結帳頁導向賣家連結（賣貨便／好賣+／蝦皮等），無需在本系統建立訂單",
        },
        { status: 400 }
      );
    }

    const requestedCode = parsed.data.coupon_code?.trim();
    if (requestedCode) {
      const applied = await validateSellerCoupon({
        sellerId: product.user_id,
        code: requestedCode,
        subtotal,
        phone: parsed.data.receiver_phone,
        requirePhone: true,
      });
      if (!applied.ok) {
        return NextResponse.json({ error: applied.error }, { status: 400 });
      }
      discountAmount = applied.discount_amount;
      merchandiseTotal = applied.total;
      couponId = applied.coupon.id;
      couponCode = applied.coupon.code;
    }

    const { data: shippingProfile } = await admin
      .from("profiles")
      .select("shipping_fee, free_shipping_enabled, free_shipping_threshold")
      .eq("id", product.user_id)
      .maybeSingle();

    const shippingQuote = quoteShipping(merchandiseTotal, {
      shipping_fee: Number(shippingProfile?.shipping_fee) || 0,
      free_shipping_enabled: Boolean(shippingProfile?.free_shipping_enabled),
      free_shipping_threshold:
        shippingProfile?.free_shipping_threshold == null
          ? null
          : Number(shippingProfile.free_shipping_threshold),
    });
    const total = shippingQuote.grandTotal;
    const orderShippingFee = shippingQuote.shippingFee;

    const itemsSummary = formatOrderItemsSummary(items);
    const primaryColor = items.find((i) => i.color)?.color || "";
    const primarySize = items.find((i) => i.size)?.size || "";
    const buyerName = parsed.data.buyer_name.trim().replace(/\s+/g, " ");

    const created = await createStoreOrderAtomic(admin, {
      product_id: product.id,
      buyer_name: buyerName,
      quantity,
      total_amount: total,
      subtotal_amount: subtotal,
      discount_amount: discountAmount,
      shipping_fee: orderShippingFee,
      coupon_id: couponId,
      coupon_code: couponCode,
      atm_last5: parsed.data.atm_last5,
      store_type: parsed.data.store_type,
      store_info: parsed.data.store_info,
      receiver_phone: parsed.data.receiver_phone,
      selected_color: primaryColor,
      selected_size: primarySize,
      items,
      items_summary: itemsSummary,
      client_request_id: parsed.data.client_request_id || null,
      stock: product.stock == null ? null : Number(product.stock),
    });

    if (!created.ok) {
      return NextResponse.json(
        { error: created.error, code: created.code },
        { status: created.status }
      );
    }

    const order = created.order;

    if (couponId && order?.id && !created.deduped) {
      const consumed = await consumeCouponUsage({
        couponId,
        sellerId: product.user_id,
        phone: parsed.data.receiver_phone,
        orderId: order.id,
      });
      if (!consumed.ok) {
        await admin.from("orders").delete().eq("id", order.id);
        return NextResponse.json(
          { error: consumed.error || "優惠碼無法使用" },
          { status: consumed.code === "PHONE_USED" ? 409 : 400 }
        );
      }
    }

    if (!created.deduped) {
      await bumpSellerMonthlyUsage(
        product.user_id,
        usageGate.usageCount,
        usageGate.month
      );
    }

    const seller = usageGate.seller;
    const lineOpts = {
      accessToken: seller.line_channel_access_token,
    };

    // 團購：同步累積數量；首次達標時原子鎖定並推播 LINE（只通知一次）
    let groupBuyReachedNotified = false;
    if (product.mode === "group_buy" && !created.deduped) {
      try {
        const { data: qtyRows } = await admin
          .from("orders")
          .select("quantity")
          .eq("product_id", product.id);
        const currentQuantity = (qtyRows || []).reduce(
          (sum, row) => sum + Number(row.quantity || 0),
          0
        );
        const targetQuantity =
          product.target_quantity != null
            ? Number(product.target_quantity)
            : null;

        // Only advance current_quantity (never regress under concurrent writers)
        await admin
          .from("products")
          .update({ current_quantity: currentQuantity })
          .eq("id", product.id)
          .or(
            `current_quantity.is.null,current_quantity.lt.${currentQuantity}`
          );

        if (
          targetQuantity != null &&
          targetQuantity > 0 &&
          currentQuantity >= targetQuantity
        ) {
          const { data: claimed, error: claimError } = await admin
            .from("products")
            .update({
              is_target_reached: true,
              status: "success",
              current_quantity: currentQuantity,
            })
            .eq("id", product.id)
            .eq("is_target_reached", false)
            .select("id, title, target_quantity, current_quantity")
            .maybeSingle();

          if (claimError) {
            console.error("[store/orders] target claim failed:", claimError);
          } else if (claimed && seller?.line_user_id) {
            try {
              const reachedPush = await sendLineGroupBuyReachedNotification(
                seller.line_user_id,
                {
                  product_title: claimed.title || product.title,
                  target_quantity: Number(
                    claimed.target_quantity ?? targetQuantity
                  ),
                  current_quantity: Number(
                    claimed.current_quantity ?? currentQuantity
                  ),
                },
                lineOpts
              );
              groupBuyReachedNotified = reachedPush.ok;
              if (!reachedPush.ok) {
                console.error(
                  "[store/orders] group-buy reached LINE failed:",
                  reachedPush.error
                );
                const fallback = await sendLineTextMessage(
                  seller.line_user_id,
                  [
                    "🎉 【NovaStore 團購達標捷報！】",
                    "您的團購商品已成功達到出貨門檻！",
                    "",
                    `📦 商品名稱：${product.title}`,
                    `🎯 設定目標：${targetQuantity} 件`,
                    `📊 目前已累積：${currentQuantity} 件 (已達標 100%)`,
                    "",
                    "請盡快前往後台查看訂單並安排與廠商叫貨與出貨！",
                    `${getSiteUrl()}/dashboard/store/stats`,
                  ].join("\n"),
                  lineOpts
                );
                groupBuyReachedNotified = fallback.ok;
              }
            } catch (reachedError) {
              console.error(
                "[store/orders] group-buy reached notify exception:",
                reachedError
              );
            }
          }
        }
      } catch (groupBuyError) {
        console.error("[store/orders] group-buy progress update:", groupBuyError);
      }
    }

    // Per-order LINE push removed — sellers get a daily digest instead.
    // Group-buy target-reached push above is retained (rare, high value).

    return NextResponse.json({
      ok: true,
      order,
      deduped: created.deduped,
      lineNotified: false,
      groupBuyReachedNotified,
      message: created.deduped
        ? "訂單已存在（重複送出已略過）"
        : groupBuyReachedNotified
          ? "訂單已送出，並已推播團購達標通知"
          : "訂單已送出。賣家將於每日帳務彙整收到通知（不再逐筆推播）",
    });
  } catch (error) {
    console.error("[store/orders]", error);
    void reportToHub({
      kind: "api_error",
      severity: "error",
      message: "store/orders POST failed",
      meta: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
