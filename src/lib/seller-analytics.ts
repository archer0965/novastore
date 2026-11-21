import { createAdminClient } from "@/lib/supabase/admin";

export type AnalyticsRangeKey =
  | "today"
  | "7d"
  | "30d"
  | "this_week"
  | "this_month"
  | "90d";

export type AnalyticsDayPoint = {
  date: string; // YYYY-MM-DD Taipei
  label: string;
  revenue: number;
  orders: number;
  fulfilled: number;
  unfulfilled: number;
  matched: number;
  pending: number;
};

export type SellerAnalyticsDetail = {
  range: AnalyticsRangeKey;
  rangeLabel: string;
  from: string;
  to: string;
  summary: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
    fulfilled: number;
    unfulfilled: number;
    matched: number;
    pending: number;
    itemsSold: number;
  };
  series: AnalyticsDayPoint[];
  topProducts: Array<{
    product_id: string;
    title: string;
    orders: number;
    revenue: number;
    quantity: number;
  }>;
};

function formatTaipeiYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function startOfDayTaipei(d = new Date()): Date {
  return new Date(`${formatTaipeiYmd(d)}T00:00:00+08:00`);
}

function startOfWeekTaipei(d = new Date()): Date {
  const dayStart = startOfDayTaipei(d);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = map[weekday] ?? 1;
  const daysFromMonday = (dow + 6) % 7;
  return new Date(dayStart.getTime() - daysFromMonday * 86_400_000);
}

function startOfMonthTaipei(d = new Date()): Date {
  const [y, m] = formatTaipeiYmd(d).split("-");
  return new Date(`${y}-${m}-01T00:00:00+08:00`);
}

function addTaipeiDays(dayStart: Date, days: number): Date {
  return new Date(dayStart.getTime() + days * 86_400_000);
}

export const ANALYTICS_RANGE_OPTIONS: Array<{
  id: AnalyticsRangeKey;
  label: string;
}> = [
  { id: "today", label: "今日" },
  { id: "7d", label: "近 7 天" },
  { id: "this_week", label: "本週" },
  { id: "30d", label: "近 30 天" },
  { id: "this_month", label: "本月" },
  { id: "90d", label: "近 90 天" },
];

export function resolveAnalyticsRange(
  key: AnalyticsRangeKey,
  now = new Date()
): { from: Date; to: Date; label: string } {
  const todayStart = startOfDayTaipei(now);
  const tomorrow = addTaipeiDays(todayStart, 1);
  switch (key) {
    case "today":
      return { from: todayStart, to: tomorrow, label: "今日" };
    case "7d":
      return {
        from: addTaipeiDays(todayStart, -6),
        to: tomorrow,
        label: "近 7 天",
      };
    case "30d":
      return {
        from: addTaipeiDays(todayStart, -29),
        to: tomorrow,
        label: "近 30 天",
      };
    case "90d":
      return {
        from: addTaipeiDays(todayStart, -89),
        to: tomorrow,
        label: "近 90 天",
      };
    case "this_week":
      return {
        from: startOfWeekTaipei(now),
        to: tomorrow,
        label: "本週（週一至今）",
      };
    case "this_month":
      return {
        from: startOfMonthTaipei(now),
        to: tomorrow,
        label: "本月至今",
      };
    default:
      return {
        from: addTaipeiDays(todayStart, -6),
        to: tomorrow,
        label: "近 7 天",
      };
  }
}

function emptyDay(date: string): AnalyticsDayPoint {
  const [, m, d] = date.split("-");
  return {
    date,
    label: `${Number(m)}/${Number(d)}`,
    revenue: 0,
    orders: 0,
    fulfilled: 0,
    unfulfilled: 0,
    matched: 0,
    pending: 0,
  };
}

function buildDayAxis(from: Date, toExclusive: Date): string[] {
  const days: string[] = [];
  let cursor = startOfDayTaipei(from);
  const end = startOfDayTaipei(new Date(toExclusive.getTime() - 1));
  while (cursor.getTime() <= end.getTime()) {
    days.push(formatTaipeiYmd(cursor));
    cursor = addTaipeiDays(cursor, 1);
  }
  return days;
}

export function isAnalyticsRangeKey(v: string): v is AnalyticsRangeKey {
  return ANALYTICS_RANGE_OPTIONS.some((o) => o.id === v);
}

export async function getSellerAnalyticsDetail(
  userId: string,
  rangeKey: AnalyticsRangeKey = "30d"
): Promise<SellerAnalyticsDetail> {
  const { from, to, label } = resolveAnalyticsRange(rangeKey);
  const admin = createAdminClient();

  const { data: products, error } = await admin
    .from("products")
    .select("id, title")
    .eq("user_id", userId);

  if (error) throw error;

  const productMap = new Map(
    (products || []).map((p) => [p.id as string, p.title as string])
  );
  const ids = (products || []).map((p) => p.id as string);

  const empty: SellerAnalyticsDetail = {
    range: rangeKey,
    rangeLabel: label,
    from: from.toISOString(),
    to: to.toISOString(),
    summary: {
      revenue: 0,
      orders: 0,
      avgOrderValue: 0,
      fulfilled: 0,
      unfulfilled: 0,
      matched: 0,
      pending: 0,
      itemsSold: 0,
    },
    series: buildDayAxis(from, to).map(emptyDay),
    topProducts: [],
  };

  if (!ids.length) return empty;

  const { data: orders, error: orderError } = await admin
    .from("orders")
    .select(
      "id, product_id, quantity, total_amount, payment_status, fulfillment_status, created_at"
    )
    .in("product_id", ids)
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: true });

  if (orderError) throw orderError;

  const seriesMap = new Map(
    buildDayAxis(from, to).map((d) => [d, emptyDay(d)])
  );
  const productAgg = new Map<
    string,
    { title: string; orders: number; revenue: number; quantity: number }
  >();

  let revenue = 0;
  let orderCount = 0;
  let fulfilled = 0;
  let unfulfilled = 0;
  let matched = 0;
  let pending = 0;
  let itemsSold = 0;

  for (const row of orders || []) {
    const amount = Number(row.total_amount) || 0;
    const qty = Number(row.quantity) || 0;
    const day = formatTaipeiYmd(new Date(row.created_at));
    const point = seriesMap.get(day) || emptyDay(day);
    const isFulfilled = row.fulfillment_status === "fulfilled";
    const isMatched = row.payment_status === "matched";

    point.revenue += amount;
    point.orders += 1;
    if (isFulfilled) point.fulfilled += 1;
    else point.unfulfilled += 1;
    if (isMatched) point.matched += 1;
    else point.pending += 1;
    seriesMap.set(day, point);

    revenue += amount;
    orderCount += 1;
    itemsSold += qty;
    if (isFulfilled) fulfilled += 1;
    else unfulfilled += 1;
    if (isMatched) matched += 1;
    else pending += 1;

    const pid = row.product_id as string;
    const agg = productAgg.get(pid) || {
      title: productMap.get(pid) || "商品",
      orders: 0,
      revenue: 0,
      quantity: 0,
    };
    agg.orders += 1;
    agg.revenue += amount;
    agg.quantity += qty;
    productAgg.set(pid, agg);
  }

  const topProducts = Array.from(productAgg.entries())
    .map(([product_id, v]) => ({ product_id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return {
    range: rangeKey,
    rangeLabel: label,
    from: from.toISOString(),
    to: to.toISOString(),
    summary: {
      revenue,
      orders: orderCount,
      avgOrderValue: orderCount ? Math.round(revenue / orderCount) : 0,
      fulfilled,
      unfulfilled,
      matched,
      pending,
      itemsSold,
    },
    series: Array.from(seriesMap.values()),
    topProducts,
  };
}
