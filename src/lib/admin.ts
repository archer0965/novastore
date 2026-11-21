import { createAdminClient } from "@/lib/supabase/admin";
import { buildVisitStats, type VisitStats } from "@/lib/visits";
import {
  getCheckoutAmount,
  isPaidPlan,
  normalizeBillingCycle,
  normalizePlan,
  PLAN_CATALOG,
  type BillingCycle,
  type PaidPlanKey,
  type PlanType,
} from "@/types/database";

/** Hard-coded platform owners; can extend via ADMIN_EMAILS env (comma-separated). */
const BUILTIN_ADMIN_EMAILS = ["archer0965@gmail.com"];

/** Internal / demo accounts never counted in ops stats or revenue. */
const BUILTIN_STATS_EXCLUDE_EMAILS = [
  "archer0965@gmail.com",
  "0965archer@gmail.com",
  "paycheck.demo+1791916139@gmail.com",
];

export function getAdminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(
    new Set([...BUILTIN_ADMIN_EMAILS, ...fromEnv].map((e) => e.toLowerCase()))
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}

/** Exact emails excluded from 使用人數 / 訂閱收入統計. */
export function getStatsExcludedEmails(): string[] {
  const fromEnv = (process.env.STATS_EXCLUDE_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(
    new Set(
      [
        ...BUILTIN_STATS_EXCLUDE_EMAILS,
        ...getAdminEmails(),
        ...fromEnv,
      ].map((e) => e.toLowerCase())
    )
  );
}

/**
 * 管理者、測試／示範帳號不計入營運統計與訂閱收入。
 * 另支援 STATS_EXCLUDE_EMAILS，以及常見測試信箱樣式。
 */
export function isExcludedFromStats(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (getStatsExcludedEmails().includes(e)) return true;
  if (e.endsWith("@example.com") || e.endsWith("@example.org")) return true;
  if (e.startsWith("paycheck.demo+")) return true;
  if (e.startsWith("seller_") && e.includes("@example.")) return true;
  if (/(^|[+._-])(test|demo|staging)([+._-]|$)/i.test(e.split("@")[0] || "")) {
    return true;
  }
  return false;
}

/** Ensure admin profile has unlimited plan + all features. */
export async function ensureAdminProfile(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      plan_type: "unlimited",
      billing_cycle: "yearly",
      trial_ends_at: null,
      expires_at: null, // never expires
      expiry_reminder_3d_for: null,
      expiry_reminder_1d_for: null,
    })
    .eq("id", userId);

  if (error) {
    console.error("[admin] ensureAdminProfile failed:", error);
  }
}

export async function getUserEmailById(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error) {
      console.error("[admin] getUserById:", error);
      return null;
    }
    return data.user?.email ?? null;
  } catch (error) {
    console.error("[admin] getUserEmailById:", error);
    return null;
  }
}

export function isAdminUnlimitedSeller(options: {
  email?: string | null;
  planType?: string | null;
}): boolean {
  if (isAdminEmail(options.email)) return true;
  return false;
}

export type SignupPeriod = "daily" | "weekly" | "monthly";

export type AdminStats = {
  totalUsers: number;
  excludedUsers: number;
  planCounts: Record<PlanType, number>;
  signupPeriod: SignupPeriod;
  signupCount: number;
  signupSeries: Array<{ label: string; count: number }>;
  expectedRevenueThisMonth: number;
  revenueBreakdown: Array<{
    plan: PaidPlanKey;
    cycle: BillingCycle;
    users: number;
    amount: number;
  }>;
  visits: VisitStats;
  asOf: string;
};

function startOfTaipeiDay(d: Date): Date {
  // Approximate Asia/Taipei as UTC+8 for bucket boundaries
  const taipei = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  taipei.setUTCHours(0, 0, 0, 0);
  return new Date(taipei.getTime() - 8 * 60 * 60 * 1000);
}

function formatTaipeiYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function expectedChargeThisMonth(
  plan: PaidPlanKey,
  cycle: BillingCycle
): number {
  // 本月預估到帳：月繳收全額；半年／年繳以均攤月費計入本月
  if (cycle === "monthly") return getCheckoutAmount(plan, "monthly");
  return PLAN_CATALOG[plan].prices[cycle].avgMonthly;
}

async function loadEmailMap(
  userIds: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (userIds.length === 0) return map;

  const admin = createAdminClient();
  // Prefer listUsers when small; fall back to per-id for reliability
  try {
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (!error && data?.users?.length) {
      for (const u of data.users) {
        map.set(u.id, u.email ?? null);
      }
    }
  } catch (error) {
    console.warn("[admin] listUsers failed, falling back to getUserById", error);
  }

  await Promise.all(
    userIds.map(async (id) => {
      if (map.has(id)) return;
      map.set(id, await getUserEmailById(id));
    })
  );

  return map;
}

export async function buildAdminStats(
  period: SignupPeriod = "daily"
): Promise<AdminStats> {
  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, plan_type, billing_cycle, created_at");

  if (error) {
    throw error;
  }

  const allRows = profiles || [];
  const emailMap = await loadEmailMap(allRows.map((r) => r.id));
  const excludedUsers = allRows.filter((r) =>
    isExcludedFromStats(emailMap.get(r.id))
  ).length;
  const rows = allRows.filter(
    (r) => !isExcludedFromStats(emailMap.get(r.id))
  );

  const planCounts: Record<PlanType, number> = {
    free: 0,
    starter: 0,
    pro: 0,
    unlimited: 0,
  };

  const revenueMap = new Map<
    string,
    { plan: PaidPlanKey; cycle: BillingCycle; users: number; amount: number }
  >();

  let expectedRevenueThisMonth = 0;

  for (const row of rows) {
    const plan = normalizePlan(row.plan_type);
    planCounts[plan] += 1;

    if (isPaidPlan(plan)) {
      const cycle = normalizeBillingCycle(row.billing_cycle);
      const amount = expectedChargeThisMonth(plan, cycle);
      expectedRevenueThisMonth += amount;
      const key = `${plan}:${cycle}`;
      const prev = revenueMap.get(key);
      if (prev) {
        prev.users += 1;
        prev.amount += amount;
      } else {
        revenueMap.set(key, { plan, cycle, users: 1, amount });
      }
    }
  }

  const now = new Date();
  const seriesBuckets = new Map<string, number>();

  if (period === "daily") {
    // last 14 Taipei days
    for (let i = 13; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 86400000);
      seriesBuckets.set(formatTaipeiYmd(day), 0);
    }
  } else if (period === "weekly") {
    // last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfTaipeiDay(
        new Date(now.getTime() - i * 7 * 86400000)
      );
      seriesBuckets.set(`W ${formatTaipeiYmd(weekStart)}`, 0);
    }
  } else {
    // last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCMonth(d.getUTCMonth() - i);
      const label = new Intl.DateTimeFormat("zh-TW", {
        timeZone: "Asia/Taipei",
        year: "numeric",
        month: "2-digit",
      }).format(d);
      seriesBuckets.set(label, 0);
    }
  }

  for (const row of rows) {
    const created = new Date(row.created_at);
    if (Number.isNaN(created.getTime())) continue;

    if (period === "daily") {
      const key = formatTaipeiYmd(created);
      if (seriesBuckets.has(key)) {
        seriesBuckets.set(key, (seriesBuckets.get(key) || 0) + 1);
      }
    } else if (period === "weekly") {
      // align to series week starts
      for (const label of Array.from(seriesBuckets.keys())) {
        const ymd = label.replace(/^W /, "");
        const weekStart = new Date(`${ymd}T00:00:00+08:00`);
        const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
        if (created >= weekStart && created < weekEnd) {
          seriesBuckets.set(label, (seriesBuckets.get(label) || 0) + 1);
          break;
        }
      }
    } else {
      const label = new Intl.DateTimeFormat("zh-TW", {
        timeZone: "Asia/Taipei",
        year: "numeric",
        month: "2-digit",
      }).format(created);
      if (seriesBuckets.has(label)) {
        seriesBuckets.set(label, (seriesBuckets.get(label) || 0) + 1);
      }
    }
  }

  // For signupCount in the selected period view, use sum of visible series
  // for daily = last 14 days; also expose period-specific headline:
  // daily: today; weekly: last 7 days; monthly: this calendar month
  let headlineCount = 0;
  if (period === "daily") {
    const today = formatTaipeiYmd(now);
    headlineCount = seriesBuckets.get(today) || 0;
  } else if (period === "weekly") {
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    headlineCount = rows.filter((r) => {
      const c = new Date(r.created_at);
      return !Number.isNaN(c.getTime()) && c >= weekAgo;
    }).length;
  } else {
    const thisMonth = new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
    }).format(now);
    headlineCount = rows.filter((r) => {
      const c = new Date(r.created_at);
      if (Number.isNaN(c.getTime())) return false;
      const m = new Intl.DateTimeFormat("zh-TW", {
        timeZone: "Asia/Taipei",
        year: "numeric",
        month: "2-digit",
      }).format(c);
      return m === thisMonth;
    }).length;
  }

  let visits: VisitStats;
  try {
    visits = await buildVisitStats(period);
  } catch (error) {
    console.error("[admin] visit stats failed", error);
    visits = {
      totalPageviews: 0,
      totalVisitors: 0,
      todayPageviews: 0,
      todayVisitors: 0,
      periodPageviews: 0,
      periodVisitors: 0,
      periodLabel: "造訪",
      series: [],
    };
  }

  return {
    totalUsers: rows.length,
    excludedUsers,
    planCounts,
    signupPeriod: period,
    signupCount: headlineCount,
    signupSeries: Array.from(seriesBuckets.entries()).map(([label, count]) => ({
      label,
      count,
    })),
    expectedRevenueThisMonth: Math.round(expectedRevenueThisMonth),
    revenueBreakdown: Array.from(revenueMap.values()).sort(
      (a, b) => b.amount - a.amount
    ),
    visits,
    asOf: now.toISOString(),
  };
}
