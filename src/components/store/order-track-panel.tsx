"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  PackageCheck,
  PackageX,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDateTime, formatTWD } from "@/lib/utils-format";

type TrackOrder = {
  id: string;
  buyer_name_masked: string;
  quantity: number;
  total_amount: number;
  atm_last5: string;
  payment_status: "pending" | "matched";
  payment_label: string;
  fulfillment_status: "unfulfilled" | "fulfilled";
  fulfillment_label: string;
  items: Array<{ color: string; size: string; quantity: number }>;
  items_summary: string;
  store_type_label: string | null;
  store_info: string | null;
  receiver_phone: string | null;
  product_title: string;
  product_mode: "agency" | "group_buy" | null;
  shop_name: string | null;
  created_at: string;
};

export function OrderTrackPanel() {
  const searchParams = useSearchParams();
  const initialQ = useMemo(
    () => (searchParams.get("q") || searchParams.get("order") || "").trim(),
    [searchParams]
  );

  const [query, setQuery] = useState(initialQ);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [orders, setOrders] = useState<TrackOrder[]>([]);
  const autoSearched = useRef(false);

  async function runSearch(raw: string) {
    const q = raw.trim();
    if (!q) {
      toast.error("請輸入訂單編號或買家姓名");
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
      });
      const json = await res.json().catch(
        () => ({} as { error?: string; orders?: TrackOrder[] })
      );
      if (!res.ok) throw new Error(json.error || "查詢失敗");
      setOrders(json.orders || []);
      if (!(json.orders || []).length) {
        toast.message("找不到符合的訂單");
      }
    } catch (err) {
      setOrders([]);
      toast.error(err instanceof Error ? err.message : "查詢失敗");
    } finally {
      setLoading(false);
    }
  }

  async function onSearch(e?: FormEvent) {
    e?.preventDefault();
    await runSearch(query);
  }

  useEffect(() => {
    if (!initialQ || autoSearched.current) return;
    autoSearched.current = true;
    void runSearch(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link search
  }, [initialQ]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-slate-950 via-sky-950 to-slate-900 p-5 text-sky-50 shadow-[0_24px_70px_-36px_rgba(14,165,233,0.55)] sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            backgroundImage:
              "radial-gradient(circle at 14% 20%, rgba(56,189,248,0.32), transparent 40%), radial-gradient(circle at 86% 16%, rgba(14,165,233,0.24), transparent 34%)",
          }}
        />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300/90">
            NovaStore Order Track
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            買家自助查單
          </h1>
          <p className="mt-2 max-w-xl text-sm text-sky-100/75">
            免登入即可查詢對帳與出貨進度。輸入訂單編號或買家姓名，二選一即可。
          </p>

          <form onSubmit={onSearch} className="mt-6 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="track-q" className="text-sky-100/80">
                訂單編號或買家姓名
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="track-q"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="訂單 UUID 或下單姓名（亦可輸入手機）"
                  className="h-12 border-white/15 bg-white/10 text-white placeholder:text-sky-100/40"
                  autoComplete="name"
                  inputMode="text"
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="h-12 shrink-0 bg-sky-500 text-slate-950 hover:bg-sky-400"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2">查詢</span>
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-sky-100/55">
              用完整訂單編號可看到門市與末五碼；用姓名或手機查詢時會遮罩個資。
            </p>
          </form>
        </div>
      </section>

      {searched ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">查詢結果</h2>
            <p className="text-xs text-muted-foreground">
              共 {orders.length} 筆
            </p>
          </div>

          {!orders.length ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
              <p className="font-medium">找不到訂單</p>
              <p className="mt-1 text-sm text-muted-foreground">
                請確認姓名是否與下單時相同，或改用完整訂單編號查詢。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <OrderResultCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-3">
          <HintCard
            icon={ShieldCheck}
            title="免登入"
            text="用訂單編號或買家姓名即可查詢，不用註冊帳號。"
          />
          <HintCard
            icon={Wallet}
            title="對帳進度"
            text="清楚顯示未對帳／已確認收款狀態。"
          />
          <HintCard
            icon={PackageCheck}
            title="出貨進度"
            text="即時查看賣家是否已標記出貨。"
          />
        </section>
      )}
    </div>
  );
}

function HintCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/80 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function OrderResultCard({ order }: { order: TrackOrder }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-sm">
      <div className="border-b border-border/70 bg-gradient-to-r from-sky-50/90 to-transparent px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            {order.shop_name ? (
              <p className="text-xs text-muted-foreground">{order.shop_name}</p>
            ) : null}
            <h3 className="font-display text-lg font-semibold">
              {order.product_title}
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {order.product_mode === "group_buy"
                ? "團購"
                : order.product_mode === "agency"
                  ? "微商/代購"
                  : "訂單"}{" "}
              · {formatDateTime(order.created_at)} · 買家{" "}
              {order.buyer_name_masked}
            </p>
          </div>
          <p className="font-display text-xl font-semibold tabular-nums text-primary">
            {formatTWD(order.total_amount)}
          </p>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        <div className="grid gap-2 sm:grid-cols-2">
          <StatusChip
            ok={order.payment_status === "matched"}
            label="對帳狀態"
            value={order.payment_label}
          />
          <StatusChip
            ok={order.fulfillment_status === "fulfilled"}
            label="出貨狀態"
            value={order.fulfillment_label}
            okTone="sky"
            icon={
              order.fulfillment_status === "fulfilled" ? PackageCheck : PackageX
            }
          />
        </div>

        <div className="rounded-xl bg-secondary/50 px-3 py-3 text-sm">
          <p className="text-xs font-medium text-muted-foreground">商品明細</p>
          {order.items.length ? (
            <ul className="mt-1.5 space-y-1">
              {order.items.map((line, idx) => {
                const spec = [line.color, line.size].filter(Boolean).join(" / ");
                return (
                  <li key={`${order.id}-${idx}`} className="tabular-nums">
                    {spec
                      ? `${spec} ×${line.quantity}`
                      : `共 ${line.quantity} 件`}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1 tabular-nums">數量 {order.quantity} 件</p>
          )}
          {order.atm_last5 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              匯款末五碼{" "}
              <span className="font-mono font-semibold text-foreground">
                {order.atm_last5}
              </span>
            </p>
          ) : null}
        </div>

        {(order.store_type_label ||
          order.store_info ||
          order.receiver_phone) && (
          <div className="text-xs leading-relaxed text-muted-foreground">
            {order.store_type_label ? <p>{order.store_type_label}</p> : null}
            {order.store_info ? <p>門市：{order.store_info}</p> : null}
            {order.receiver_phone ? (
              <p className="tabular-nums">手機：{order.receiver_phone}</p>
            ) : null}
          </div>
        )}

        <p className="break-all font-mono text-[10px] text-muted-foreground/80">
          訂單編號 {order.id}
        </p>
      </div>
    </article>
  );
}

function StatusChip({
  ok,
  label,
  value,
  okTone = "emerald",
  icon: Icon,
}: {
  ok: boolean;
  label: string;
  value: string;
  okTone?: "emerald" | "sky";
  icon?: typeof PackageCheck;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        ok
          ? okTone === "sky"
            ? "border-sky-200 bg-sky-50 text-sky-950"
            : "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-amber-200 bg-amber-50 text-amber-950"
      )}
    >
      <p className="text-[11px] opacity-70">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
        {value}
      </p>
    </div>
  );
}
