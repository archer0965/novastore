"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, PackageCheck, PackageX } from "lucide-react";
import { toast } from "sonner";
import { OrderAmountBreakdown } from "@/components/dashboard/order-amount-breakdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { coerceOrderItems } from "@/lib/order-items";
import { formatDateTime } from "@/lib/utils-format";
import type { SellerOrderListItem } from "@/lib/store";
import { STORE_TYPE_LABELS, type ConvenienceStoreType } from "@/types/database";

type FulfillmentFilter = "all" | "unfulfilled" | "fulfilled";
type PaymentFilter = "all" | "pending" | "matched";

export function SellerOrdersPanel({
  orders,
}: {
  orders: SellerOrderListItem[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fulfillmentFilter, setFulfillmentFilter] =
    useState<FulfillmentFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [localPayment, setLocalPayment] = useState<
    Record<string, "pending" | "matched">
  >({});
  const [localFulfillment, setLocalFulfillment] = useState<
    Record<string, "unfulfilled" | "fulfilled">
  >({});

  // Drop optimistic overrides once refreshed props match
  useEffect(() => {
    setLocalPayment((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of Object.keys(next)) {
        const order = orders.find((o) => o.id === id);
        if (!order || order.payment_status === next[id]) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setLocalFulfillment((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of Object.keys(next)) {
        const order = orders.find((o) => o.id === id);
        const server = order?.fulfillment_status || "unfulfilled";
        if (!order || server === next[id]) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [orders]);

  const counts = useMemo(() => {
    let unfulfilled = 0;
    let fulfilled = 0;
    let pending = 0;
    let matched = 0;
    for (const order of orders) {
      const payment = localPayment[order.id] || order.payment_status;
      const fulfillment =
        localFulfillment[order.id] ||
        order.fulfillment_status ||
        "unfulfilled";
      if (fulfillment === "fulfilled") fulfilled += 1;
      else unfulfilled += 1;
      if (payment === "matched") matched += 1;
      else pending += 1;
    }
    return {
      all: orders.length,
      unfulfilled,
      fulfilled,
      pending,
      matched,
    };
  }, [orders, localPayment, localFulfillment]);

  const visible = useMemo(() => {
    return orders.filter((order) => {
      const payment = localPayment[order.id] || order.payment_status;
      const fulfillment =
        localFulfillment[order.id] ||
        order.fulfillment_status ||
        "unfulfilled";
      if (paymentFilter !== "all" && payment !== paymentFilter) return false;
      if (fulfillmentFilter !== "all" && fulfillment !== fulfillmentFilter) {
        return false;
      }
      return true;
    });
  }, [
    orders,
    paymentFilter,
    fulfillmentFilter,
    localPayment,
    localFulfillment,
  ]);

  async function patchOrder(
    orderId: string,
    body: {
      payment_status?: "matched" | "pending";
      fulfillment_status?: "unfulfilled" | "fulfilled";
    }
  ) {
    setBusyId(orderId);
    if (body.payment_status) {
      setLocalPayment((prev) => ({ ...prev, [orderId]: body.payment_status! }));
    }
    if (body.fulfillment_status) {
      setLocalFulfillment((prev) => ({
        ...prev,
        [orderId]: body.fulfillment_status!,
      }));
    }
    try {
      const res = await fetch(`/api/store/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) throw new Error(json.error || "更新失敗");
      if (body.payment_status) {
        toast.success(
          body.payment_status === "matched" ? "已標記對帳成功" : "已改回待對帳"
        );
      }
      if (body.fulfillment_status) {
        toast.success(
          body.fulfillment_status === "fulfilled"
            ? "已標記已出貨"
            : "已改回未出貨"
        );
      }
      // Keep optimistic values until server props catch up after refresh
      router.refresh();
    } catch (err) {
      setLocalPayment((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setLocalFulfillment((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      toast.error(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setBusyId(null);
    }
  }

  if (!orders.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
        <Package className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 font-display text-lg font-semibold">尚無訂單</p>
        <p className="mt-2 text-sm text-muted-foreground">
          買家下單後，可在此篩選對帳與出貨狀態並快速標記。
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/store/create">前往開團／上架</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-sky-500/15 bg-gradient-to-br from-sky-50/80 via-background to-slate-50/60 p-3 sm:p-4">
        <FilterRow
          label="出貨篩選"
          value={fulfillmentFilter}
          onChange={setFulfillmentFilter}
          options={[
            { id: "all", label: `全部 (${counts.all})` },
            { id: "unfulfilled", label: `未出貨 (${counts.unfulfilled})` },
            { id: "fulfilled", label: `已出貨 (${counts.fulfilled})` },
          ]}
        />
        <FilterRow
          label="對帳篩選"
          value={paymentFilter}
          onChange={setPaymentFilter}
          options={[
            { id: "all", label: `全部 (${counts.all})` },
            { id: "pending", label: `未對帳 (${counts.pending})` },
            { id: "matched", label: `已對帳 (${counts.matched})` },
          ]}
        />
        <p className="text-[11px] text-muted-foreground">
          可組合篩選，例如「未出貨 × 已對帳」方便一次包貨出貨。
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground">
          顯示 <span className="font-semibold text-foreground">{visible.length}</span>{" "}
          / {orders.length} 筆
        </p>
        {(fulfillmentFilter !== "all" || paymentFilter !== "all") && (
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => {
              setFulfillmentFilter("all");
              setPaymentFilter("all");
            }}
          >
            清除篩選
          </button>
        )}
      </div>

      {!visible.length ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          沒有符合目前篩選條件的訂單
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {visible.map((order) => {
              const payment = localPayment[order.id] || order.payment_status;
              const fulfillment =
                localFulfillment[order.id] ||
                order.fulfillment_status ||
                "unfulfilled";
              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  payment={payment}
                  fulfillment={fulfillment}
                  busy={busyId === order.id}
                  onPatch={patchOrder}
                />
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-border/80 md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-secondary/40 text-xs text-muted-foreground">
                <tr className="border-b border-border/70">
                  <th className="px-4 py-3 font-medium">商品／買家</th>
                  <th className="px-3 py-3 font-medium">數量</th>
                  <th className="px-3 py-3 font-medium">金額</th>
                  <th className="px-3 py-3 font-medium">末五碼</th>
                  <th className="px-3 py-3 font-medium">對帳</th>
                  <th className="px-3 py-3 font-medium">出貨</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => {
                  const payment =
                    localPayment[order.id] || order.payment_status;
                  const fulfillment =
                    localFulfillment[order.id] ||
                    order.fulfillment_status ||
                    "unfulfilled";
                  const lineItems = coerceOrderItems(order);
                  const storeLabel = order.store_type
                    ? STORE_TYPE_LABELS[
                        order.store_type as ConvenienceStoreType
                      ]
                    : null;
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium">{order.product_title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {order.product_mode === "group_buy"
                            ? "團購"
                            : "微商/代購"}{" "}
                          · {formatDateTime(order.created_at)}
                        </p>
                        <p className="mt-1 font-medium">{order.buyer_name}</p>
                        <div className="mt-1 space-y-0.5 text-[11px] text-foreground/80">
                          {lineItems.length ? (
                            <ul className="rounded-lg bg-secondary/50 px-2 py-1.5">
                              {lineItems.map((line, idx) => {
                                const spec = [line.color, line.size]
                                  .filter(Boolean)
                                  .join(" / ");
                                return (
                                  <li
                                    key={`${order.id}-${idx}`}
                                    className="tabular-nums"
                                  >
                                    {spec
                                      ? `${spec} ×${line.quantity}`
                                      : `共 ${line.quantity} 件`}
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null}
                          {storeLabel ? (
                            <p className="font-medium text-primary">
                              {storeLabel}
                            </p>
                          ) : null}
                          {order.store_info ? (
                            <p>門市：{order.store_info}</p>
                          ) : null}
                          {order.receiver_phone ? (
                            <p className="tabular-nums">
                              手機：{order.receiver_phone}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums align-top">
                        {order.quantity}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <OrderAmountBreakdown
                          compact
                          subtotalAmount={order.subtotal_amount}
                          discountAmount={order.discount_amount}
                          shippingFee={order.shipping_fee}
                          totalAmount={order.total_amount}
                        />
                      </td>
                      <td className="px-3 py-3 font-mono tabular-nums align-top">
                        {order.atm_last5}
                      </td>
                      <td className="px-3 py-3 align-top">
                        {payment === "matched" ? (
                          <span className="text-emerald-700">已對帳</span>
                        ) : (
                          <span className="text-amber-700">未對帳</span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">
                        {fulfillment === "fulfilled" ? (
                          <span className="inline-flex items-center gap-1 text-sky-700">
                            <PackageCheck className="h-3.5 w-3.5" />
                            已出貨
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700">
                            <PackageX className="h-3.5 w-3.5" />
                            未出貨
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              payment === "pending" ? "default" : "ghost"
                            }
                            disabled={busyId === order.id}
                            onClick={() =>
                              patchOrder(order.id, {
                                payment_status:
                                  payment === "pending" ? "matched" : "pending",
                              })
                            }
                          >
                            {payment === "pending"
                              ? "✅ 已對帳成功"
                              : "撤銷對帳"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              fulfillment === "unfulfilled"
                                ? "outline"
                                : "ghost"
                            }
                            disabled={busyId === order.id}
                            onClick={() =>
                              patchOrder(order.id, {
                                fulfillment_status:
                                  fulfillment === "unfulfilled"
                                    ? "fulfilled"
                                    : "unfulfilled",
                              })
                            }
                          >
                            {fulfillment === "unfulfilled"
                              ? "標記已出貨"
                              : "標記未出貨"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function FilterRow<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground sm:w-20">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:text-sm",
              value === opt.id
                ? "bg-sky-600 text-white shadow-sm shadow-sky-600/25"
                : "bg-background/80 text-muted-foreground ring-1 ring-border hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  payment,
  fulfillment,
  busy,
  onPatch,
}: {
  order: SellerOrderListItem;
  payment: "pending" | "matched";
  fulfillment: "unfulfilled" | "fulfilled";
  busy: boolean;
  onPatch: (
    orderId: string,
    body: {
      payment_status?: "matched" | "pending";
      fulfillment_status?: "unfulfilled" | "fulfilled";
    }
  ) => void;
}) {
  const lineItems = coerceOrderItems(order);
  const storeLabel = order.store_type
    ? STORE_TYPE_LABELS[order.store_type as ConvenienceStoreType]
    : null;

  return (
    <article className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display font-semibold">{order.product_title}</p>
          <p className="text-[11px] text-muted-foreground">
            {order.buyer_name} · {formatDateTime(order.created_at)}
          </p>
        </div>
        <OrderAmountBreakdown
          compact
          className="text-right"
          subtotalAmount={order.subtotal_amount}
          discountAmount={order.discount_amount}
          shippingFee={order.shipping_fee}
          totalAmount={order.total_amount}
        />
      </div>

      {lineItems.length ? (
        <ul className="mt-2 space-y-0.5 rounded-lg bg-secondary/50 px-2 py-1.5 text-[11px]">
          {lineItems.map((line, idx) => {
            const spec = [line.color, line.size].filter(Boolean).join(" / ");
            return (
              <li key={`${order.id}-m-${idx}`} className="tabular-nums">
                {spec ? `${spec} ×${line.quantity}` : `共 ${line.quantity} 件`}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">
          數量 {order.quantity} · 末五碼 {order.atm_last5}
        </p>
      )}

      <div className="mt-2 rounded-lg bg-secondary/40 px-2 py-1.5">
        <OrderAmountBreakdown
          subtotalAmount={order.subtotal_amount}
          discountAmount={order.discount_amount}
          shippingFee={order.shipping_fee}
          totalAmount={order.total_amount}
        />
      </div>

      {(storeLabel || order.store_info || order.receiver_phone) && (
        <div className="mt-2 space-y-0.5 text-[11px] text-foreground/80">
          {storeLabel ? (
            <p className="font-medium text-primary">{storeLabel}</p>
          ) : null}
          {order.store_info ? <p>門市：{order.store_info}</p> : null}
          {order.receiver_phone ? (
            <p className="tabular-nums">手機：{order.receiver_phone}</p>
          ) : null}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 font-medium",
            payment === "matched"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-900"
          )}
        >
          {payment === "matched" ? "已對帳" : "未對帳"}
        </span>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 font-medium",
            fulfillment === "fulfilled"
              ? "bg-sky-100 text-sky-900"
              : "bg-rose-100 text-rose-900"
          )}
        >
          {fulfillment === "fulfilled" ? "已出貨" : "未出貨"}
        </span>
        <span className="rounded-md bg-secondary px-2 py-0.5 font-mono tabular-nums">
          末五碼 {order.atm_last5}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          variant={payment === "pending" ? "default" : "ghost"}
          disabled={busy}
          onClick={() =>
            onPatch(order.id, {
              payment_status: payment === "pending" ? "matched" : "pending",
            })
          }
        >
          {payment === "pending" ? "標記已對帳" : "撤銷對帳"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={fulfillment === "unfulfilled" ? "outline" : "ghost"}
          disabled={busy}
          onClick={() =>
            onPatch(order.id, {
              fulfillment_status:
                fulfillment === "unfulfilled" ? "fulfilled" : "unfulfilled",
            })
          }
        >
          {fulfillment === "unfulfilled" ? "標記已出貨" : "標記未出貨"}
        </Button>
      </div>
    </article>
  );
}
