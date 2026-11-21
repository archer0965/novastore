"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button";
import { OrderAmountBreakdown } from "@/components/dashboard/order-amount-breakdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRemainingStock } from "@/lib/product-stock";
import { getStoreProductUrl } from "@/lib/store";
import { formatDateTime, formatTWD } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import { coerceOrderItems } from "@/lib/order-items";
import type { StoreStatsItem } from "@/lib/store";
import { STORE_TYPE_LABELS, type ConvenienceStoreType } from "@/types/database";

type FulfillmentFilter = "all" | "unfulfilled" | "fulfilled";
type PaymentFilter = "all" | "pending" | "matched";

export function StoreStatsPanel({
  items,
  shopSlug,
}: {
  items: StoreStatsItem[];
  shopSlug: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "group_buy" | "agency">("all");
  const [fulfillmentFilter, setFulfillmentFilter] =
    useState<FulfillmentFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [localPayment, setLocalPayment] = useState<
    Record<string, "pending" | "matched">
  >({});
  const [localFulfillment, setLocalFulfillment] = useState<
    Record<string, "unfulfilled" | "fulfilled">
  >({});

  useEffect(() => {
    const byId = new Map(
      items.flatMap((item) => item.orders.map((o) => [o.id, o] as const))
    );
    setLocalPayment((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of Object.keys(next)) {
        const order = byId.get(id);
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
        const order = byId.get(id);
        const server = order?.fulfillment_status || "unfulfilled";
        if (!order || server === next[id]) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  const visible = useMemo(
    () =>
      filter === "all" ? items : items.filter((item) => item.mode === filter),
    [filter, items]
  );

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
      // Keep optimistic values until refreshed props catch up
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

  async function closeProduct(productId: string) {
    setBusyId(productId);
    try {
      const res = await fetch(`/api/store/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) throw new Error(json.error || "更新失敗");
      toast.success("已結束此開團／商品");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setBusyId(null);
    }
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
        <p className="font-display text-lg font-semibold">尚無開團或微商/代購商品</p>
        <p className="mt-2 text-sm text-muted-foreground">
          先建立第一個商品，即可在此查看成團進度與對帳狀態。
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/store/create">前往開團／上架</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-2xl border border-sky-500/15 bg-gradient-to-br from-sky-50/80 via-background to-slate-50/60 p-3 sm:p-4 dark:from-sky-950/40 dark:via-background dark:to-slate-950/40">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: "全部" },
              { id: "group_buy", label: "團購" },
              { id: "agency", label: "微商/代購" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium transition",
                filter === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <FilterRow
          label="出貨篩選"
          value={fulfillmentFilter}
          onChange={setFulfillmentFilter}
          options={[
            { id: "all", label: "全部" },
            { id: "unfulfilled", label: "未出貨" },
            { id: "fulfilled", label: "已出貨" },
          ]}
        />
        <FilterRow
          label="對帳篩選"
          value={paymentFilter}
          onChange={setPaymentFilter}
          options={[
            { id: "all", label: "全部" },
            { id: "pending", label: "未對帳" },
            { id: "matched", label: "已對帳" },
          ]}
        />
      </div>

      {!visible.length ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          此分類目前沒有商品
        </div>
      ) : null}

      {visible.map((item) => {
        const target = item.target_quantity || 0;
        const progress =
          item.mode === "group_buy" && target > 0
            ? Math.min(100, Math.round((item.ordered_quantity / target) * 100))
            : null;
        const shareUrl = getStoreProductUrl(shopSlug, item.id);
        const reached =
          item.mode === "group_buy" &&
          target > 0 &&
          item.ordered_quantity >= target;

        return (
          <section
            key={item.id}
            className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-semibold">
                    {item.title}
                  </h2>
                  <StatusPill
                    status={item.status}
                    reached={reached || Boolean(item.is_target_reached)}
                  />
                  {item.is_preorder ? (
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                      預購
                    </span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {item.mode === "group_buy" ? "團購" : "微商/代購"} ·{" "}
                    {formatTWD(item.price)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  下單 {item.order_count} 人 · 銷售 {item.ordered_quantity} 件 ·
                  待對帳 {item.pending_count} · 已對帳 {item.matched_count} ·
                  未出貨 {item.unfulfilled_count} · 已出貨 {item.fulfilled_count}
                  {item.stock != null
                    ? ` · 庫存剩餘 ${getRemainingStock(item) ?? 0}/${item.stock}`
                    : " · 庫存不限"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton value={shareUrl} label="複製連結" />
                {item.status !== "closed" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busyId === item.id}
                    onClick={() => closeProduct(item.id)}
                  >
                    結束接單
                  </Button>
                ) : null}
              </div>
            </div>

            {progress !== null ? (
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>
                    成團進度 {item.ordered_quantity} / {target}
                  </span>
                  <span className="font-medium text-foreground">{progress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-sky-100">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      reached ? "bg-emerald-600" : "bg-primary"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : null}

            <ProductStockEditor
              productId={item.id}
              stock={item.stock ?? null}
              isPreorder={Boolean(item.is_preorder)}
              preorderNotice={item.preorder_notice || ""}
              busy={busyId === item.id}
              onBusy={setBusyId}
            />

            {(() => {
              const filteredOrders = item.orders.filter((order) => {
                const payment =
                  localPayment[order.id] || order.payment_status;
                const fulfillment =
                  localFulfillment[order.id] ||
                  order.fulfillment_status ||
                  "unfulfilled";
                if (
                  paymentFilter !== "all" &&
                  payment !== paymentFilter
                ) {
                  return false;
                }
                if (
                  fulfillmentFilter !== "all" &&
                  fulfillment !== fulfillmentFilter
                ) {
                  return false;
                }
                return true;
              });

              return (
                <>
                  {/* Mobile card view */}
                  <div className="mt-4 space-y-3 md:hidden">
                    {item.orders.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">
                        尚無訂單
                      </p>
                    ) : filteredOrders.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">
                        沒有符合篩選條件的訂單
                      </p>
                    ) : (
                      filteredOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          payment={
                            localPayment[order.id] || order.payment_status
                          }
                          fulfillment={
                            localFulfillment[order.id] ||
                            order.fulfillment_status ||
                            "unfulfilled"
                          }
                          busy={busyId === order.id}
                          onPatch={patchOrder}
                        />
                      ))
                    )}
                  </div>

                  {/* Desktop table */}
                  <div className="mt-4 hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[920px] text-left text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr className="border-b border-border/70">
                          <th className="py-2 pr-3 font-medium">買家／取貨</th>
                          <th className="py-2 pr-3 font-medium">數量</th>
                          <th className="py-2 pr-3 font-medium">金額</th>
                          <th className="py-2 pr-3 font-medium">末五碼</th>
                          <th className="py-2 pr-3 font-medium">對帳</th>
                          <th className="py-2 pr-3 font-medium">出貨</th>
                          <th className="py-2 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.orders.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="py-4 text-muted-foreground"
                            >
                              尚無訂單
                            </td>
                          </tr>
                        ) : filteredOrders.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="py-4 text-muted-foreground"
                            >
                              沒有符合篩選條件的訂單
                            </td>
                          </tr>
                        ) : (
                          filteredOrders.map((order) => {
                            const payment =
                              localPayment[order.id] || order.payment_status;
                            const fulfillment =
                              localFulfillment[order.id] ||
                              order.fulfillment_status ||
                              "unfulfilled";
                            const storeLabel = order.store_type
                              ? STORE_TYPE_LABELS[
                                  order.store_type as ConvenienceStoreType
                                ]
                              : null;
                            const lineItems = coerceOrderItems(order);
                            return (
                              <tr
                                key={order.id}
                                className="border-b border-border/50 last:border-0"
                              >
                                <td className="py-2.5 pr-3">
                                  <div className="font-medium">
                                    {order.buyer_name}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {formatDateTime(order.created_at)}
                                  </div>
                                  <div className="mt-1.5 space-y-0.5 text-[11px] leading-relaxed text-foreground/80">
                                    {lineItems.length ? (
                                      <div className="rounded-lg bg-secondary/60 px-2 py-1.5">
                                        <p className="font-medium text-foreground">
                                          規格明細
                                        </p>
                                        <ul className="mt-1 space-y-0.5">
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
                                      </div>
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
                                <td className="py-2.5 pr-3 tabular-nums">
                                  {order.quantity}
                                </td>
                                <td className="py-2.5 pr-3">
                                  <OrderAmountBreakdown
                                    compact
                                    subtotalAmount={order.subtotal_amount}
                                    discountAmount={order.discount_amount}
                                    shippingFee={order.shipping_fee}
                                    totalAmount={order.total_amount}
                                  />
                                </td>
                                <td className="py-2.5 pr-3 font-mono tabular-nums">
                                  {order.atm_last5}
                                </td>
                                <td className="py-2.5 pr-3">
                                  {payment === "matched" ? (
                                    <span className="text-emerald-700">
                                      已對帳
                                    </span>
                                  ) : (
                                    <span className="text-amber-700">
                                      待對帳
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 pr-3">
                                  {fulfillment === "fulfilled" ? (
                                    <span className="text-sky-700">
                                      已出貨
                                    </span>
                                  ) : (
                                    <span className="text-rose-700">
                                      未出貨
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5">
                                  <div className="flex flex-wrap gap-1.5">
                                    {payment === "pending" ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        disabled={busyId === order.id}
                                        onClick={() =>
                                          patchOrder(order.id, {
                                            payment_status: "matched",
                                          })
                                        }
                                      >
                                        ✅ 已對帳成功
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={busyId === order.id}
                                        onClick={() =>
                                          patchOrder(order.id, {
                                            payment_status: "pending",
                                          })
                                        }
                                      >
                                        撤銷對帳
                                      </Button>
                                    )}
                                    {fulfillment === "unfulfilled" ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={busyId === order.id}
                                        onClick={() =>
                                          patchOrder(order.id, {
                                            fulfillment_status: "fulfilled",
                                          })
                                        }
                                      >
                                        標記已出貨
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={busyId === order.id}
                                        onClick={() =>
                                          patchOrder(order.id, {
                                            fulfillment_status: "unfulfilled",
                                          })
                                        }
                                      >
                                        標記未出貨
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </section>
        );
      })}
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
  order: StoreStatsItem["orders"][number];
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
  const storeLabel = order.store_type
    ? STORE_TYPE_LABELS[order.store_type as ConvenienceStoreType]
    : null;
  const lineItems = coerceOrderItems(order);

  return (
    <article className="rounded-xl border border-border/80 bg-secondary/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{order.buyer_name}</p>
          <p className="text-[11px] text-muted-foreground">
            {formatDateTime(order.created_at)}
          </p>
        </div>
        <div className="text-right">
          <OrderAmountBreakdown
            compact
            className="text-right"
            subtotalAmount={order.subtotal_amount}
            discountAmount={order.discount_amount}
            shippingFee={order.shipping_fee}
            totalAmount={order.total_amount}
          />
          <p className="text-[11px] text-muted-foreground tabular-nums">
            ×{order.quantity} · 末五碼 {order.atm_last5}
          </p>
        </div>
      </div>

      {lineItems.length ? (
        <ul className="mt-2 space-y-0.5 rounded-lg bg-background/70 px-2 py-1.5 text-[11px]">
          {lineItems.map((line, idx) => {
            const spec = [line.color, line.size].filter(Boolean).join(" / ");
            return (
              <li key={`${order.id}-m-${idx}`} className="tabular-nums">
                {spec ? `${spec} ×${line.quantity}` : `共 ${line.quantity} 件`}
              </li>
            );
          })}
        </ul>
      ) : null}

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
          {payment === "matched" ? "已對帳" : "待對帳"}
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
          {payment === "pending" ? "✅ 已對帳成功" : "撤銷對帳"}
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

function ProductStockEditor({
  productId,
  stock,
  isPreorder,
  preorderNotice,
  busy,
  onBusy,
}: {
  productId: string;
  stock: number | null;
  isPreorder: boolean;
  preorderNotice: string;
  busy: boolean;
  onBusy: (id: string | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stockInput, setStockInput] = useState(
    stock == null ? "" : String(stock)
  );
  const [preorder, setPreorder] = useState(isPreorder);
  const [notice, setNotice] = useState(preorderNotice);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    onBusy(productId);
    try {
      const stockRaw = stockInput.trim();
      const res = await fetch(`/api/store/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock: stockRaw === "" ? null : Number(stockRaw),
          is_preorder: preorder,
          preorder_notice: preorder ? notice.trim() : "",
        }),
      });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) throw new Error(json.error || "更新失敗");
      toast.success("已更新庫存／預購設定");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新失敗");
    } finally {
      onBusy(null);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-secondary/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">庫存與預購</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "收合" : "編輯"}
        </Button>
      </div>
      {!open ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {stock == null ? "不限量" : `上限 ${stock} 件`}
          {" · "}
          {isPreorder
            ? `預購${preorderNotice ? `：${preorderNotice}` : ""}`
            : "現貨"}
        </p>
      ) : (
        <form onSubmit={onSave} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`stock-${productId}`}>庫存數量</Label>
            <Input
              id={`stock-${productId}`}
              className="h-10"
              inputMode="numeric"
              value={stockInput}
              onChange={(e) =>
                setStockInput(e.target.value.replace(/[^\d]/g, ""))
              }
              placeholder="空白＝不限量"
            />
          </div>
          <div className="space-y-1.5">
            <Label>販售模式</Label>
            <div className="flex gap-2">
              <button
                type="button"
                className={cn(
                  "h-10 flex-1 rounded-lg border text-sm font-medium",
                  !preorder
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border"
                )}
                onClick={() => setPreorder(false)}
              >
                現貨
              </button>
              <button
                type="button"
                className={cn(
                  "h-10 flex-1 rounded-lg border text-sm font-medium",
                  preorder
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border"
                )}
                onClick={() => setPreorder(true)}
              >
                預購
              </button>
            </div>
          </div>
          {preorder ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`notice-${productId}`}>預購出貨說明</Label>
              <Input
                id={`notice-${productId}`}
                className="h-10"
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
                placeholder="例如：預計 12/20 從日本發貨"
                maxLength={200}
              />
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={busy}>
              儲存設定
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function StatusPill({
  status,
  reached,
}: {
  status: string;
  reached?: boolean;
}) {
  const label =
    status === "closed"
      ? "已結束"
      : status === "success" || reached
        ? "已成團"
        : "進行中";
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-[11px] font-semibold",
        status === "closed"
          ? "bg-secondary text-muted-foreground"
          : status === "success" || reached
            ? "bg-emerald-100 text-emerald-800"
            : "bg-sky-100 text-sky-900"
      )}
    >
      {label}
    </span>
  );
}
