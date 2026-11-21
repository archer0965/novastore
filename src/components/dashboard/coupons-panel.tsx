"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatTWD } from "@/lib/utils-format";
import type {
  Coupon,
  CouponDiscountType,
  CouponUsageType,
} from "@/types/database";

function describeCoupon(c: Coupon): string {
  if (c.discount_type === "percentage") {
    const fold = Number(c.discount_value) / 10;
    return `${fold % 1 === 0 ? fold : fold.toFixed(1)} 折`;
  }
  return `折 ${formatTWD(Number(c.discount_value))}`;
}

function describeUsage(c: Coupon): string {
  if (c.usage_type === "limited" && c.usage_limit != null) {
    return `總限量 ${c.usage_count}/${c.usage_limit} · 每人手機限用一次`;
  }
  return `不限總次數 · 已用 ${c.usage_count} · 每人手機限用一次`;
}

export function CouponsPanel({ initialCoupons }: { initialCoupons: Coupon[] }) {
  const router = useRouter();
  const [coupons, setCoupons] = useState(initialCoupons);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage" as CouponDiscountType,
    discount_value: "90",
    min_spend: "",
    usage_type: "unlimited" as CouponUsageType,
    usage_limit: "",
  });

  const activeCount = useMemo(
    () => coupons.filter((c) => c.is_active).length,
    [coupons]
  );

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/store/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          min_spend: form.min_spend.trim() === "" ? null : Number(form.min_spend),
          usage_type: form.usage_type,
          usage_limit:
            form.usage_type === "limited" && form.usage_limit.trim() !== ""
              ? Number(form.usage_limit)
              : null,
          is_active: true,
        }),
      });
      const json = await res.json().catch(() => ({} as { error?: string; coupon?: Coupon }));
      if (!res.ok) throw new Error(json.error || "建立失敗");
      if (json.coupon) {
        setCoupons((prev) => [json.coupon as Coupon, ...prev]);
      }
      setForm({
        code: "",
        discount_type: "percentage",
        discount_value: "90",
        min_spend: "",
        usage_type: "unlimited",
        usage_limit: "",
      });
      toast.success("優惠碼已建立");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "建立失敗");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(coupon: Coupon) {
    setBusyId(coupon.id);
    try {
      const res = await fetch(`/api/store/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      });
      const json = await res.json().catch(() => ({} as { error?: string; coupon?: Coupon }));
      if (!res.ok) throw new Error(json.error || "更新失敗");
      setCoupons((prev) =>
        prev.map((c) =>
          c.id === coupon.id
            ? { ...c, is_active: !coupon.is_active, ...(json.coupon || {}) }
            : c
        )
      );
      toast.success(coupon.is_active ? "已停用優惠碼" : "已啟用優惠碼");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setBusyId(null);
    }
  }

  async function removeCoupon(coupon: Coupon) {
    if (!window.confirm(`確定刪除優惠碼 ${coupon.code}？`)) return;
    setBusyId(coupon.id);
    try {
      const res = await fetch(`/api/store/coupons/${coupon.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) throw new Error(json.error || "刪除失敗");
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
      toast.success("已刪除優惠碼");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onCreate}
        className="space-y-4 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-50/80 via-background to-slate-50/60 p-4 sm:p-5"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">新增優惠碼</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              百分比請填成數（90＝九折）；固定金額則填折抵元數。
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="coupon-code">優惠碼</Label>
            <Input
              id="coupon-code"
              className="h-11 font-mono uppercase"
              value={form.code}
              onChange={(e) =>
                setForm({
                  ...form,
                  code: e.target.value.toUpperCase().replace(/\s+/g, ""),
                })
              }
              placeholder="例如 NEW2026"
              required
              maxLength={32}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>折扣類型</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "percentage" as const, label: "打折（成數）" },
                  { id: "fixed" as const, label: "折固定金額" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      discount_type: opt.id,
                      discount_value:
                        opt.id === "percentage" ? "90" : form.discount_value,
                    })
                  }
                  className={cn(
                    "rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition",
                    form.discount_type === opt.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coupon-value">
              {form.discount_type === "percentage"
                ? "折扣成數（90＝九折）"
                : "折抵金額（元）"}
            </Label>
            <Input
              id="coupon-value"
              className="h-11"
              inputMode="decimal"
              value={form.discount_value}
              onChange={(e) =>
                setForm({
                  ...form,
                  discount_value: e.target.value.replace(/[^\d.]/g, ""),
                })
              }
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coupon-min">最低消費（選填）</Label>
            <Input
              id="coupon-min"
              className="h-11"
              inputMode="numeric"
              value={form.min_spend}
              onChange={(e) =>
                setForm({
                  ...form,
                  min_spend: e.target.value.replace(/\D/g, ""),
                })
              }
              placeholder="不限"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>優惠次數模式</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    id: "unlimited" as const,
                    label: "無限總次數",
                    hint: "每人手機仍限用一次",
                  },
                  {
                    id: "limited" as const,
                    label: "設定總限量",
                    hint: "全店累計達上限即停",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      usage_type: opt.id,
                      usage_limit: opt.id === "unlimited" ? "" : form.usage_limit,
                    })
                  }
                  className={cn(
                    "rounded-xl border-2 px-3 py-2.5 text-left transition",
                    form.usage_type === opt.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="mt-0.5 text-[11px] opacity-80">{opt.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {form.usage_type === "limited" ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="coupon-limit">總使用上限次數</Label>
              <Input
                id="coupon-limit"
                className="h-11"
                inputMode="numeric"
                value={form.usage_limit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    usage_limit: e.target.value.replace(/\D/g, ""),
                  })
                }
                placeholder="例如 100"
                required
              />
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground sm:col-span-2">
            無論無限或限量，同一個手機號碼對同一優惠碼都只能使用一次。
          </p>
        </div>

        <Button type="submit" disabled={creating} className="h-11 gap-2">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
          建立優惠碼
        </Button>
      </form>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">我的優惠碼</h2>
          <p className="text-xs text-muted-foreground">
            啟用中 {activeCount}／共 {coupons.length}
          </p>
        </div>

        {!coupons.length ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
            <Ticket className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">尚無優惠碼</p>
            <p className="mt-1 text-sm text-muted-foreground">
              建立後，買家可在商品下單頁輸入優惠碼折抵。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon) => (
              <article
                key={coupon.id}
                className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-lg font-semibold tracking-wide">
                        {coupon.code}
                      </p>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                          coupon.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {coupon.is_active ? "啟用中" : "已停用"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {describeCoupon(coupon)}
                      {coupon.min_spend != null
                        ? ` · 滿 ${formatTWD(coupon.min_spend)}`
                        : " · 無門檻"}
                      {" · "}
                      {describeUsage(coupon)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === coupon.id}
                      onClick={() => void toggleActive(coupon)}
                    >
                      {coupon.is_active ? "停用" : "啟用"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busyId === coupon.id}
                      onClick={() => void removeCoupon(coupon)}
                    >
                      刪除
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
