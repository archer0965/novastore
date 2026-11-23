import Link from "next/link";
import {
  BarChart3,
  PackageCheck,
  PackageX,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTWD } from "@/lib/utils-format";
import type { SellerOrderMetrics } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SellerMetricsDashboard({
  metrics,
}: {
  metrics: SellerOrderMetrics;
}) {
  const { today, week, month } = metrics;

  return (
    <section
      aria-label="營收與訂單數據看板"
      className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-slate-950 via-sky-950 to-slate-900 p-4 text-sky-50 shadow-[0_20px_60px_-28px_rgba(14,165,233,0.55)] sm:p-5"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(56,189,248,0.35), transparent 42%), radial-gradient(circle at 88% 12%, rgba(14,165,233,0.28), transparent 36%), radial-gradient(circle at 70% 88%, rgba(125,211,252,0.18), transparent 40%)",
        }}
      />
      <div className="relative">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300/90">
              NovaStore Analytics
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
              營收與出貨看板
            </h2>
            <p className="mt-1 text-sm text-sky-100/70">
              依 Asia/Taipei 計算 · 已成立訂單金額加總
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-sky-400 text-slate-950 hover:bg-sky-300"
          >
            <Link href="/dashboard/analytics?range=30d">
              <BarChart3 className="h-4 w-4" />
              查看詳細數據
            </Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="本日預估收益"
            value={formatTWD(today.revenue)}
            hint={`${today.orders} 筆訂單`}
            icon={TrendingUp}
            accent="from-sky-400/25 to-cyan-500/10"
          />
          <MetricCard
            label="本日訂單量"
            value={String(today.orders)}
            hint="含所有已成立訂單"
            icon={ShoppingBag}
            accent="from-blue-400/20 to-sky-500/10"
          />
          <MetricCard
            label="本日已出貨"
            value={String(today.fulfilled)}
            hint={`未出貨 ${today.unfulfilled}`}
            icon={PackageCheck}
            accent="from-emerald-400/20 to-teal-500/10"
          />
          <MetricCard
            label="本日未出貨"
            value={String(today.unfulfilled)}
            hint="待包貨出貨"
            icon={PackageX}
            accent="from-amber-400/20 to-orange-500/10"
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PeriodStrip
            title="本月總 GMV"
            revenue={month.gmv ?? month.revenue}
            orders={month.orders}
            hint="已成立訂單金額加總"
          />
          <PeriodStrip
            title="待付款金額"
            revenue={month.pendingReconcileAmount || 0}
            orders={month.pendingReconcileOrders || 0}
            hint="payment 尚未 matched"
          />
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-xs font-medium text-sky-100/70">出貨完成率</p>
              <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-white">
                {month.shipCompletionRate ?? 0}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-sky-100/55">本月已出／未出</p>
              <p className="font-display text-xl font-semibold tabular-nums text-sky-100">
                {month.fulfilled ?? 0}/{month.unfulfilled ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <PeriodStrip
            title="本週"
            revenue={week.revenue}
            orders={week.orders}
          />
          <PeriodStrip
            title="本月營收"
            revenue={month.revenue}
            orders={month.orders}
          />
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof TrendingUp;
  accent: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-gradient-to-br p-4 backdrop-blur-sm",
        accent
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-sky-100/75">{label}</p>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sky-100">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight tabular-nums text-white">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-sky-100/60">{hint}</p>
    </div>
  );
}

function PeriodStrip({
  title,
  revenue,
  orders,
  hint = "總訂單量",
}: {
  title: string;
  revenue: number;
  orders: number;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div>
        <p className="text-xs font-medium text-sky-100/70">{title}</p>
        <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-white">
          {formatTWD(revenue)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[11px] text-sky-100/55">{hint}</p>
        <p className="font-display text-xl font-semibold tabular-nums text-sky-100">
          {orders}
        </p>
      </div>
    </div>
  );
}
