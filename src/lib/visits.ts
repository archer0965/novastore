import { createAdminClient } from "@/lib/supabase/admin";

export type VisitPeriod = "daily" | "weekly" | "monthly";

export function shouldTrackPath(path: string): boolean {
  const p = (path || "/").split("?")[0] || "/";
  if (p.startsWith("/api")) return false;
  if (p.startsWith("/dashboard")) return false;
  if (p.startsWith("/_next")) return false;
  if (p.startsWith("/auth")) return false;
  return true;
}

export async function recordSiteVisit(options: {
  path: string;
  visitorKey?: string | null;
  referrer?: string | null;
}): Promise<void> {
  const path = (options.path || "/").split("?")[0].slice(0, 300) || "/";
  if (!shouldTrackPath(path)) return;

  const admin = createAdminClient();
  const { error } = await admin.from("site_visits").insert({
    path,
    visitor_key: options.visitorKey?.slice(0, 80) || null,
    referrer: options.referrer?.slice(0, 500) || null,
  });
  if (error) {
    console.error("[visits] record failed", error.message);
  }
}

function taipeiYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function startOfTaipeiDayUtc(d: Date): Date {
  const ymd = taipeiYmd(d);
  return new Date(`${ymd}T00:00:00+08:00`);
}

async function countVisitsSince(sinceIso: string): Promise<{
  pageviews: number;
  visitors: number;
}> {
  const admin = createAdminClient();
  const { count: pageviews, error } = await admin
    .from("site_visits")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sinceIso);
  if (error) throw error;

  const { data, error: listErr } = await admin
    .from("site_visits")
    .select("visitor_key")
    .gte("created_at", sinceIso)
    .not("visitor_key", "is", null)
    .limit(20000);
  if (listErr) throw listErr;
  const unique = new Set(
    (data || []).map((r) => r.visitor_key).filter(Boolean) as string[]
  );

  return { pageviews: pageviews ?? 0, visitors: unique.size };
}

async function countVisitsAllTime(): Promise<{
  pageviews: number;
  visitors: number;
}> {
  const admin = createAdminClient();
  const { count: pageviews, error } = await admin
    .from("site_visits")
    .select("*", { count: "exact", head: true });
  if (error) throw error;

  const { data, error: listErr } = await admin
    .from("site_visits")
    .select("visitor_key")
    .not("visitor_key", "is", null)
    .limit(50000);
  if (listErr) throw listErr;
  const unique = new Set(
    (data || []).map((r) => r.visitor_key).filter(Boolean) as string[]
  );
  return { pageviews: pageviews ?? 0, visitors: unique.size };
}

export type VisitStats = {
  totalPageviews: number;
  totalVisitors: number;
  todayPageviews: number;
  todayVisitors: number;
  periodPageviews: number;
  periodVisitors: number;
  periodLabel: string;
  series: Array<{ label: string; pageviews: number }>;
};

export async function buildVisitStats(
  period: VisitPeriod = "daily"
): Promise<VisitStats> {
  const now = new Date();
  const todayStart = startOfTaipeiDayUtc(now);

  const [all, today] = await Promise.all([
    countVisitsAllTime(),
    countVisitsSince(todayStart.toISOString()),
  ]);

  let periodSince: Date;
  let periodLabel: string;
  if (period === "weekly") {
    periodSince = new Date(now.getTime() - 7 * 86400000);
    periodLabel = "近 7 日造訪";
  } else if (period === "monthly") {
    const ymd = taipeiYmd(now);
    const [y, m] = ymd.split("-").map(Number);
    periodSince = new Date(
      `${y}-${String(m).padStart(2, "0")}-01T00:00:00+08:00`
    );
    periodLabel = "本月造訪";
  } else {
    periodSince = todayStart;
    periodLabel = "今日造訪";
  }

  const periodStats = await countVisitsSince(periodSince.toISOString());

  const admin = createAdminClient();
  const seriesStart = new Date(todayStart.getTime() - 13 * 86400000);
  const { data: recent, error } = await admin
    .from("site_visits")
    .select("created_at")
    .gte("created_at", seriesStart.toISOString())
    .limit(50000);
  if (error) throw error;

  const buckets = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(todayStart.getTime() - i * 86400000);
    buckets.set(taipeiYmd(d), 0);
  }
  for (const row of recent || []) {
    const key = taipeiYmd(new Date(row.created_at));
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
  }

  return {
    totalPageviews: all.pageviews,
    totalVisitors: all.visitors,
    todayPageviews: today.pageviews,
    todayVisitors: today.visitors,
    periodPageviews: periodStats.pageviews,
    periodVisitors: periodStats.visitors,
    periodLabel,
    series: Array.from(buckets.entries()).map(([label, pageviews]) => ({
      label,
      pageviews,
    })),
  };
}
