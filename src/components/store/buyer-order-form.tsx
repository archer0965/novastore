"use client";

import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatTWD } from "@/lib/utils-format";
import { getRemainingStock, isSoldOut } from "@/lib/product-stock";
import { quoteShipping } from "@/lib/shipping";
import type { PublicStoreProduct } from "@/lib/store";
import type { ConvenienceStoreType, OrderLineItem } from "@/types/database";

type DraftLine = OrderLineItem & { key: string };

function newLine(
  colorOptions: string[],
  sizeOptions: string[],
  quantity = 1
): DraftLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    color: colorOptions[0] || "",
    size: sizeOptions[0] || "",
    quantity,
  };
}

export function BuyerOrderForm({ product }: { product: PublicStoreProduct }) {
  const router = useRouter();
  const formId = useId();
  const colorOptions = product.color_options || [];
  const sizeOptions = product.size_options || [];
  const hasVariants = colorOptions.length > 0 || sizeOptions.length > 0;
  const unitPrice = Number(product.price);

  const [paymentType, setPaymentType] = useState<"atm" | "myship_cod">("atm");
  const [buyerName, setBuyerName] = useState("");
  const [atmLast5, setAtmLast5] = useState("");
  const [storeType, setStoreType] = useState<ConvenienceStoreType | "">("");
  const [storeInfo, setStoreInfo] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const codEnabled = Boolean(product.enable_cod && product.cod_url);
  const [lines, setLines] = useState<DraftLine[]>(() => [
    newLine(colorOptions, sizeOptions, 1),
  ]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [submittedPhone, setSubmittedPhone] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_amount: number;
    total: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const closed =
    product.status === "closed" ||
    (product.deadline && new Date(product.deadline).getTime() < Date.now());
  const remaining = getRemainingStock(product);
  const soldOut = isSoldOut(product);
  const cannotOrder = Boolean(closed || soldOut);

  const totalQty = useMemo(
    () => lines.reduce((sum, line) => sum + Math.max(1, line.quantity || 0), 0),
    [lines]
  );
  const subtotalAmount = useMemo(
    () => totalQty * unitPrice,
    [totalQty, unitPrice]
  );
  const discountAmount = appliedCoupon?.discount_amount || 0;
  const merchandiseTotal = Math.max(0, subtotalAmount - discountAmount);
  const shippingQuote = useMemo(
    () =>
      quoteShipping(merchandiseTotal, {
        shipping_fee: product.shipping_fee,
        free_shipping_enabled: product.free_shipping_enabled,
        free_shipping_threshold: product.free_shipping_threshold,
      }),
    [
      merchandiseTotal,
      product.shipping_fee,
      product.free_shipping_enabled,
      product.free_shipping_threshold,
    ]
  );
  const totalAmount = shippingQuote.grandTotal;
  const lastSubtotal = useRef(subtotalAmount);

  useEffect(() => {
    if (lastSubtotal.current === subtotalAmount) return;
    lastSubtotal.current = subtotalAmount;
    if (appliedCoupon) {
      setAppliedCoupon(null);
      setCouponError("數量已變更，請重新套用優惠碼");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to cart total changes
  }, [subtotalAmount]);

  function updateLine(key: string, patch: Partial<OrderLineItem>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  function addLine() {
    if (lines.length >= 20) {
      toast.error("最多 20 組規格");
      return;
    }
    setLines((prev) => [...prev, newLine(colorOptions, sizeOptions, 1)]);
  }

  function clearCoupon() {
    setAppliedCoupon(null);
    setCouponError(null);
  }

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) {
      setCouponError("請輸入優惠碼");
      return;
    }
    if (!/^09\d{8}$/.test(receiverPhone.trim())) {
      setCouponError("請先填寫正確收件手機（09 開頭共 10 碼）再套用");
      return;
    }
    setCouponApplying(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/store/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          code,
          quantity: totalQty,
          phone: receiverPhone.trim(),
        }),
      });
      const json = await res.json().catch(
        () =>
          ({} as {
            error?: string;
            code?: string;
            discount_amount?: number;
            total?: number;
          })
      );
      if (!res.ok) {
        clearCoupon();
        setCouponError(json.error || "優惠碼無效");
        return;
      }
      setAppliedCoupon({
        code: String(json.code || code).toUpperCase(),
        discount_amount: Number(json.discount_amount) || 0,
        total: Number(json.total) || subtotalAmount,
      });
      toast.success("已套用優惠碼");
    } catch (err) {
      clearCoupon();
      setCouponError(err instanceof Error ? err.message : "套用失敗");
    } finally {
      setCouponApplying(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (cannotOrder || loading || done || submittingRef.current) return;

    // 外部結帳（賣貨便／好賣+／蝦皮／其他）：導向連結，不在本系統建單
    if (paymentType === "myship_cod") {
      if (!codEnabled || !product.cod_url) {
        toast.error("賣家尚未設定外部結帳連結");
        return;
      }
      window.location.assign(product.cod_url);
      return;
    }

    if (remaining !== null && totalQty > remaining) {
      toast.error(`庫存不足，目前剩餘 ${remaining} 件`);
      return;
    }

    for (const line of lines) {
      if (colorOptions.length && !line.color) {
        toast.error("請為每一組選擇顏色");
        return;
      }
      if (sizeOptions.length && !line.size) {
        toast.error("請為每一組選擇尺寸");
        return;
      }
      if (!line.quantity || line.quantity < 1) {
        toast.error("數量至少為 1");
        return;
      }
    }
    if (!storeType) {
      toast.error("請選擇超商取貨方式");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          buyer_name: buyerName,
          atm_last5: atmLast5,
          store_type: storeType,
          store_info: storeInfo,
          receiver_phone: receiverPhone,
          payment_type: "atm",
          coupon_code: appliedCoupon?.code || null,
          items: lines.map(({ color, size, quantity }) => ({
            color,
            size,
            quantity,
          })),
        }),
      });
      const json = await res.json().catch(
        () =>
          ({} as {
            error?: string;
            message?: string;
            lineNotified?: boolean;
            order?: { id?: string };
          })
      );
      if (!res.ok) throw new Error(json.error || "送出失敗");
      setSubmittedOrderId(json.order?.id || null);
      setSubmittedPhone(receiverPhone.trim());
      setDone(true);
      toast.success(
        json.message || "訂單已送出（將納入賣家每日帳務彙整）"
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "送出失敗");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  if (done) {
    const trackQ = submittedOrderId || submittedPhone;
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
        <h2 className="mt-3 font-display text-lg font-semibold">訂單已送出</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          賣家會依帳號末碼核對匯款，並依超商門市資訊出貨。請保留轉帳紀錄。
        </p>
        {submittedOrderId ? (
          <p className="mt-3 break-all font-mono text-[11px] text-muted-foreground">
            訂單編號 {submittedOrderId}
          </p>
        ) : null}
        {trackQ ? (
          <Button asChild className="mt-4" variant="outline">
            <Link href={`/track?q=${encodeURIComponent(trackQ)}`}>
              前往自助查單
            </Link>
          </Button>
        ) : null}
      </div>
    );
  }

  if (soldOut) {
    return (
      <div className="rounded-2xl border border-border bg-secondary/50 p-5 text-center">
        <h2 className="font-display text-lg font-semibold">已售完</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          此商品目前沒有可下單庫存，請改選其他商品或稍後再來。
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm"
    >
      <h2 className="font-display text-lg font-semibold">填寫訂單與取貨資訊</h2>

      {product.is_preorder ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-3 text-sm text-amber-950">
          <p className="font-semibold">預購商品提醒</p>
          <p className="mt-1 leading-relaxed">
            {product.preorder_notice?.trim() ||
              "此為預購品，出貨時程請依賣家公告為準。"}
          </p>
        </div>
      ) : null}

      {remaining !== null ? (
        <p className="text-sm text-muted-foreground">
          目前可下單庫存{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {remaining}
          </span>{" "}
          件
        </p>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">付款方式</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setPaymentType("atm")}
            className={cn(
              "rounded-xl border-2 px-3 py-3 text-left transition",
              paymentType === "atm"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/40"
            )}
          >
            <p className="text-sm font-semibold">ATM 轉帳</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              匯款後填寫末五碼，賣家後台對帳
            </p>
          </button>
          {codEnabled ? (
            <button
              type="button"
              onClick={() => setPaymentType("myship_cod")}
              className={cn(
                "rounded-xl border-2 px-3 py-3 text-left transition",
                paymentType === "myship_cod"
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-border hover:border-emerald-500/40"
              )}
            >
              <p className="text-sm font-semibold">{product.cod_label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                結帳後導向賣家的外部賣場／專屬連結
              </p>
            </button>
          ) : null}
        </div>
      </fieldset>

      {paymentType === "myship_cod" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-3 text-sm text-emerald-950">
          點擊下方按鈕後，將前往「{product.cod_label}」完成下單（賣貨便、好賣+、蝦皮或其他專屬頁皆可）。
        </div>
      ) : product.bank_code || product.bank_account ? (
        <div className="rounded-xl bg-secondary/60 px-3 py-3 text-sm">
          <p className="font-medium">匯款資訊</p>
          <p className="mt-1 text-muted-foreground">
            銀行代碼 {product.bank_code || "—"}｜帳號{" "}
            {product.bank_account || "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            請先完成轉帳，再填寫帳號末四～五碼送出。
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-3 text-sm text-amber-950">
          賣家尚未設定匯款帳號。請先向賣家確認匯款方式後再填寫末碼送出。
        </div>
      )}

      {paymentType === "atm" ? (
      <>
      <div className="space-y-2">
        <Label htmlFor={`${formId}-buyer_name`}>買家姓名</Label>
        <Input
          id={`${formId}-buyer_name`}
          className="h-12"
          required
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          placeholder="方便賣家出貨辨識"
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">規格與數量</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {hasVariants
                ? "可一次加購多組顏色／尺寸"
                : "調整購買數量"}
            </p>
          </div>
          <p className="text-xs tabular-nums text-muted-foreground">
            單價 {formatTWD(unitPrice)}
          </p>
        </div>

        <div className="space-y-3">
          {lines.map((line, index) => {
            const lineTotal = Math.max(1, line.quantity) * unitPrice;
            return (
              <div
                key={line.key}
                className="rounded-xl border border-border/80 bg-background/80 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    規格 {index + 1}
                  </p>
                  {lines.length > 1 ? (
                    <button
                      type="button"
                      aria-label="移除此規格"
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      onClick={() => removeLine(line.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                {colorOptions.length ? (
                  <fieldset className="mb-3 space-y-2">
                    <legend className="text-sm font-medium">顏色</legend>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((opt) => {
                        const active = line.color === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => updateLine(line.key, { color: opt })}
                            className={cn(
                              "rounded-xl border-2 px-3 py-2 text-sm font-medium transition",
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            )}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}

                {sizeOptions.length ? (
                  <fieldset className="mb-3 space-y-2">
                    <legend className="text-sm font-medium">尺寸</legend>
                    <div className="flex flex-wrap gap-2">
                      {sizeOptions.map((opt) => {
                        const active = line.size === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => updateLine(line.key, { size: opt })}
                            className={cn(
                              "rounded-xl border-2 px-3 py-2 text-sm font-medium transition",
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            )}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">數量</span>
                    <div className="inline-flex items-center rounded-xl border border-border">
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:bg-secondary"
                        aria-label="減少數量"
                        onClick={() =>
                          updateLine(line.key, {
                            quantity: Math.max(1, line.quantity - 1),
                          })
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <Input
                        className="h-10 w-14 border-0 bg-transparent px-0 text-center shadow-none focus-visible:ring-0"
                        inputMode="numeric"
                        value={String(line.quantity)}
                        onChange={(e) => {
                          const n = Number(
                            e.target.value.replace(/\D/g, "").slice(0, 3)
                          );
                          updateLine(line.key, {
                            quantity: Math.max(1, n || 1),
                          });
                        }}
                      />
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:bg-secondary"
                        aria-label="增加數量"
                        onClick={() =>
                          updateLine(line.key, {
                            quantity: Math.min(999, line.quantity + 1),
                          })
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    小計 {formatTWD(lineTotal)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {hasVariants ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-2"
            onClick={addLine}
            disabled={lines.length >= 20 || Boolean(closed)}
          >
            <Plus className="h-4 w-4" />
            新增其他規格
          </Button>
        ) : null}

        <div className="rounded-xl bg-secondary/50 px-3 py-3 text-sm">
          <div className="flex justify-between tabular-nums">
            <span className="text-muted-foreground">總購買件數</span>
            <span className="font-semibold">{totalQty} 件</span>
          </div>
          <div className="mt-1.5 flex justify-between tabular-nums">
            <span className="text-muted-foreground">小計</span>
            <span className="font-medium">{formatTWD(subtotalAmount)}</span>
          </div>
        </div>
      </section>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium leading-none">超商取貨</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "711" as const, label: "7-11 超商取貨" },
              { id: "family" as const, label: "全家超商取貨" },
            ] as const
          ).map((opt) => {
            const active = storeType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStoreType(opt.id)}
                className={cn(
                  "rounded-xl border-2 px-3 py-3 text-sm font-medium transition",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-store_info`}>取件門市</Label>
        <Input
          id={`${formId}-store_info`}
          className="h-12"
          required
          value={storeInfo}
          onChange={(e) => setStoreInfo(e.target.value)}
          placeholder="請輸入 7-11/全家 店名與店號（例：逢甲門市，店號 123456）"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-receiver_phone`}>收件手機</Label>
        <Input
          id={`${formId}-receiver_phone`}
          className="h-12"
          inputMode="tel"
          autoComplete="tel"
          required
          maxLength={10}
          value={receiverPhone}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 10);
            setReceiverPhone(next);
            if (appliedCoupon) {
              clearCoupon();
              setCouponError("手機已變更，請重新套用優惠碼");
            }
          }}
          placeholder="09xxxxxxxx（超商取貨簡訊）"
        />
      </div>

      <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-background/70 px-3 py-3">
        <Label htmlFor={`${formId}-coupon`}>優惠碼</Label>
        <p className="text-[11px] text-muted-foreground">
          需搭配上方收件手機驗證；每個手機號碼對同一優惠碼限用一次。
        </p>
        <div className="flex gap-2">
          <Input
            id={`${formId}-coupon`}
            className="h-11 font-mono uppercase"
            value={couponInput}
            onChange={(e) => {
              setCouponInput(e.target.value.toUpperCase());
              if (appliedCoupon) clearCoupon();
            }}
            placeholder="輸入 Promo Code"
            disabled={Boolean(closed)}
            maxLength={32}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0"
            disabled={couponApplying || Boolean(closed) || !couponInput.trim()}
            onClick={() => void applyCoupon()}
          >
            {couponApplying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "套用"
            )}
          </Button>
        </div>
        {couponError ? (
          <p className="text-xs text-destructive">{couponError}</p>
        ) : null}
        {appliedCoupon ? (
          <p className="text-xs text-emerald-700">
            已套用 {appliedCoupon.code}，折抵{" "}
            {formatTWD(appliedCoupon.discount_amount)}
            <button
              type="button"
              className="ml-2 underline"
              onClick={clearCoupon}
            >
              移除
            </button>
          </p>
        ) : null}
        <div className="mt-2 space-y-1 border-t border-border/60 pt-2 text-sm">
          <div className="flex justify-between tabular-nums text-muted-foreground">
            <span>商品小計</span>
            <span>{formatTWD(subtotalAmount)}</span>
          </div>
          {discountAmount > 0 ? (
            <div className="flex justify-between tabular-nums text-emerald-700">
              <span>優惠折抵</span>
              <span className="font-medium">-{formatTWD(discountAmount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between tabular-nums">
            <span className="text-muted-foreground">運費</span>
            <span className="font-medium">
              {shippingQuote.freeShippingApplied
                ? "免運 $0"
                : formatTWD(shippingQuote.shippingFee)}
            </span>
          </div>
          {shippingQuote.freeShippingApplied ? (
            <p className="text-xs font-medium text-emerald-700">
              🎉 已享
              {shippingQuote.storewideFreeShipping ? "全館免運" : "滿額免運"}
              優惠
            </p>
          ) : shippingQuote.remainingToFreeShipping != null ? (
            <p className="text-xs text-muted-foreground">
              再買 {formatTWD(shippingQuote.remainingToFreeShipping)} 即可免運
              {shippingQuote.freeShippingThreshold
                ? `（門檻 ${formatTWD(shippingQuote.freeShippingThreshold)}）`
                : ""}
            </p>
          ) : null}
          <div className="flex justify-between tabular-nums">
            <span className="text-muted-foreground">應付總額（含運費）</span>
            <span className="font-display text-lg font-semibold">
              {formatTWD(totalAmount)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            ATM 轉帳請以此總金額匯款，方便賣家對帳。
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-atm_last5`}>匯款帳號末四～五碼</Label>
        <Input
          id={`${formId}-atm_last5`}
          className="h-12 font-display text-lg tracking-[0.3em] tabular-nums"
          inputMode="numeric"
          required
          maxLength={5}
          value={atmLast5}
          onChange={(e) =>
            setAtmLast5(e.target.value.replace(/\D/g, "").slice(0, 5))
          }
          placeholder="12345"
        />
      </div>
      </>
      ) : null}

      <Button
        type="submit"
        className="h-12 w-full"
        disabled={loading || cannotOrder}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {closed
          ? "已結束接單"
          : soldOut
            ? "已售完"
            : paymentType === "myship_cod"
              ? `前往「${product.cod_label}」結帳`
              : `送出訂單 · ${formatTWD(totalAmount)}`}
      </Button>
    </form>
  );
}
