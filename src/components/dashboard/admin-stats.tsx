"use client";

import { useEffect, useState, useTransition } from "react";
import { Eye, Loader2, Users, Wallet } from "lucide-react";
import { PLAN_CATALOG, type PlanType } from "@/types/database";
import { formatTWD } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import type { AdminStats, SignupPeriod } from "@/lib/admin";

const PERIODS: Array<{ id: SignupPeriod; label: string; hint: string }> = [
  { id: "daily", label: "每日", hint: "今日新註冊" },
  { id: "weekly", label: "每週", hint: "近 7 日新註冊" },
  { id: "monthly", label: "每月", hint: "本月新註冊" },
];

const PLAN_ORDER: PlanType[] = ["free", "starter", "pro", "unlimited"];

export function AdminStatsPanel() {
  const [period, setPeriod] = useState<SignupPeriod>("daily");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load(nextPeriod: SignupPeriod) {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(`/api/admin/stats?period=${nextPeriod}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "載入失敗");
        setStats(json.stats);
      } catch (e) {
        setError(e instanceof Error ? e.message : "載入失敗");
      }
    });
  }

  useEffect(() => {
    load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const maxBar = Math.max(
    1,
    ...(stats?.signupSeries.map((s) => s.count) || [1])
  );
  const maxVisitBar = Math.max(
    1,
    ...(stats?.visits.series.map((s) => s.pageviews) || [1])
  );

  return (
    <section className="space-y-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.04] p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">管理者後台</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">營運總覽</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            造訪次數、註冊人數、方案分布與本月預估訂閱收入
          </p>
        </div>
        <div className="inline-flex rounded-xl bg-secondary p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                period === p.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {!stats && pending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          載入統計中…
        </div>
      ) : null}

      {stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/80 bg-background/80 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                累計造訪（頁面瀏覽）
              </div>
              <p className="mt-2 font-display text-3xl font-semibold">
                {stats.visits.totalPageviews}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                不重複訪客約 {stats.visits.totalVisitors} 人
              </p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4 text-primary" />
                {stats.visits.periodLabel}
              </div>
              <p className="mt-2 font-display text-3xl font-semibold text-primary">
                {stats.visits.periodPageviews}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                訪客 {stats.visits.periodVisitors} · 今日{" "}
                {stats.visits.todayPageviews} 次／
                {stats.visits.todayVisitors} 人
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/80 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                註冊總人數
              </div>
              <p className="mt-2 font-display text-3xl font-semibold">
                {stats.totalUsers}
              </p>
              {stats.excludedUsers > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  已排除管理者／測試帳號 {stats.excludedUsers} 人
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-border/80 bg-background/80 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                當月預估訂閱收入
              </div>
              <p className="mt-2 font-display text-3xl font-semibold text-primary">
                {formatTWD(stats.expectedRevenueThisMonth)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {PERIODS.find((p) => p.id === period)?.hint}{" "}
                {stats.signupCount} 人
                {pending ? (
                  <Loader2 className="ml-1 inline h-3 w-3 animate-spin opacity-60" />
                ) : null}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-display text-lg font-semibold">各方案使用人數</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PLAN_ORDER.map((key) => (
                <div
                  key={key}
                  className="rounded-xl border border-border/70 bg-background/70 px-4 py-3"
                >
                  <p className="text-sm text-muted-foreground">
                    {PLAN_CATALOG[key].name}
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold">
                    {stats.planCounts[key]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {stats.visits.series.length > 0 ? (
            <div>
              <h3 className="font-display text-lg font-semibold">
                造訪趨勢（近 14 日頁面瀏覽）
              </h3>
              <div className="mt-4 space-y-2">
                {stats.visits.series.map((item) => (
                  <div key={`v-${item.label}`} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-xs text-muted-foreground sm:w-36">
                      {item.label}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{
                          width: `${Math.max(
                            item.pageviews ? 8 : 0,
                            Math.round((item.pageviews / maxVisitBar) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm tabular-nums">
                      {item.pageviews}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <h3 className="font-display text-lg font-semibold">
              新註冊趨勢（
              {period === "daily"
                ? "近 14 日"
                : period === "weekly"
                  ? "近 8 週"
                  : "近 6 月"}
              ）
            </h3>
            <div className="mt-4 space-y-2">
              {stats.signupSeries.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-xs text-muted-foreground sm:w-36">
                    {item.label}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.max(
                          item.count ? 8 : 0,
                          Math.round((item.count / maxBar) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm tabular-nums">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {stats.revenueBreakdown.length > 0 ? (
            <div>
              <h3 className="font-display text-lg font-semibold">
                本月收入明細
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {stats.revenueBreakdown.map((row) => (
                  <li
                    key={`${row.plan}-${row.cycle}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                  >
                    <span>
                      {PLAN_CATALOG[row.plan].name} ·{" "}
                      {row.cycle === "yearly"
                        ? "年繳"
                        : row.cycle === "half_yearly"
                          ? "半年繳"
                          : "月繳"}{" "}
                      × {row.users}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatTWD(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              目前尚無付費訂閱，本月預估收入為 $0。
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}
