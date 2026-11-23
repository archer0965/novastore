"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  PackageCheck,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTWD } from "@/lib/utils-format";
import {
  ANALYTICS_RANGE_OPTIONS,
  type AnalyticsRangeKey,
  type SellerAnalyticsDetail,
} from "@/lib/seller-analytics";

const Charts = dynamic(() => import("./seller-analytics-charts"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      載入圖表…
    </div>
  ),
});

export function SellerAnalyticsPanel({
  initial,
}: {
  initial: SellerAnalyticsDetail;
}) {
  const [range, setRange] = useState<AnalyticsRangeKey>(initial.range);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (next: AnalyticsRangeKey) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/store/analytics?range=${next}`);
      const json = await res.json().catch(
        () => ({} as { error?: string; analytics?: SellerAnalyticsDetail })
      );
      if (!res.ok || !json.analytics) {
        throw new Error(json.error || "讀取失敗");
      }
      setData(json.analytics);
      setRange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "讀取失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Keep URL in sync for shareable range
    const url = new URL(window.location.href);
    if (url.searchParams.get("range") !== range) {
      url.searchParams.set("range", range);
      window.history.replaceState({}, "", url.toString());
    }
  }, [range]);

  const statusPie = useMemo(
    () => [
      { name: "已出貨", value: data.summary.fulfilled },
      { name: "未出貨", value: data.summary.unfulfilled },
      { name: "商家已確認收款", value: data.summary.matched },
      { name: "待付款", value: data.summary.pending },
    ].filter((d) => d.value > 0),
    [data.summary]
  );

  const fulfillmentPie = useMemo(
    () =>
      [
        { name: "已出貨", value: data.summary.fulfilled },
        { name: "未出貨", value: data.summary.unfulfilled },
      ].filter((d) => d.value > 0),
    [data.summary]
  );

  const paymentPie = useMemo(
    () =>
      [
        { name: "商家已確認收款", value: data.summary.matched },
        { name: "待付款", value: data.summary.pending },
      ].filter((d) => d.value > 0),
    [data.summary]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              返回儀表板
            </Link>
          </Button>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            詳細數據分析
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.rangeLabel} · Asia/Taipei · 已成立商店訂單
          </p>
        </div>
        {loading ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            更新中
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border/80 bg-card/80 p-2">
        {ANALYTICS_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={loading}
            onClick={() => void load(opt.id)}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium transition",
              range === opt.id
                ? "bg-sky-600 text-white shadow-sm shadow-sky-600/25"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="預估收益"
          value={formatTWD(data.summary.revenue)}
          hint={`客單價 ${formatTWD(data.summary.avgOrderValue)}`}
          icon={TrendingUp}
        />
        <SummaryCard
          label="訂單量"
          value={String(data.summary.orders)}
          hint={`銷售 ${data.summary.itemsSold} 件`}
          icon={ShoppingBag}
        />
        <SummaryCard
          label="已出貨"
          value={String(data.summary.fulfilled)}
          hint={`未出貨 ${data.summary.unfulfilled}`}
          icon={PackageCheck}
        />
        <SummaryCard
          label="商家已確認收款"
          value={String(data.summary.matched)}
          hint={`待付款 ${data.summary.pending}`}
          icon={Wallet}
        />
      </div>

      <Charts
        series={data.series}
        fulfillmentPie={fulfillmentPie}
        paymentPie={paymentPie}
      />

      <section className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm sm:p-5">
        <h2 className="font-display text-lg font-semibold">商品營收排行</h2>
        <p className="mt-1 text-xs text-muted-foreground">依區間收益排序</p>
        {!data.topProducts.length ? (
          <p className="mt-6 text-sm text-muted-foreground">此區間尚無訂單</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border/70">
                  <th className="py-2 pr-3 font-medium">商品</th>
                  <th className="py-2 pr-3 font-medium">訂單</th>
                  <th className="py-2 pr-3 font-medium">件數</th>
                  <th className="py-2 font-medium">收益</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((row) => (
                  <tr
                    key={row.product_id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2.5 pr-3 font-medium">{row.title}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{row.orders}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{row.quantity}</td>
                    <td className="py-2.5 tabular-nums">
                      {formatTWD(row.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {statusPie.length === 0 ? null : (
        <p className="text-center text-[11px] text-muted-foreground">
          資料區間：{data.rangeLabel}
        </p>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof TrendingUp;
}) {
  return (
    <div className="rounded-2xl border border-sky-500/15 bg-gradient-to-br from-sky-50/80 via-card to-slate-50/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600/10 text-sky-700">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

