import { createAdminClient } from "@/lib/supabase/admin";
import { sendLineTextMessage } from "@/lib/line";
import { getSiteUrl } from "@/lib/site";
import { formatTWD } from "@/lib/utils-format";

function formatTaipeiYmd(d = new Date()): string {
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

function addDays(dayStart: Date, days: number): Date {
  return new Date(dayStart.getTime() + days * 86_400_000);
}

export type DailyDigestResult = {
  sellerId: string;
  shopName: string | null;
  sent: boolean;
  skipped?: string;
  error?: string;
  stats?: {
    ordersToday: number;
    revenueToday: number;
    matchedToday: number;
    matchedAmountToday: number;
    pendingOrders: number;
    pendingReports: number;
  };
};

type SellerRow = {
  id: string;
  shop_name: string | null;
  line_user_id: string | null;
  line_channel_access_token: string | null;
  last_daily_digest_on: string | null;
};

async function productIdsForSeller(
  admin: ReturnType<typeof createAdminClient>,
  sellerId: string
): Promise<string[]> {
  const { data } = await admin
    .from("products")
    .select("id")
    .eq("user_id", sellerId);
  return (data || []).map((p) => p.id as string);
}

export async function buildAndSendDailyDigest(
  seller: SellerRow,
  opts?: { force?: boolean; day?: Date }
): Promise<DailyDigestResult> {
  const day = opts?.day || new Date();
  const ymd = formatTaipeiYmd(day);
  const from = startOfDayTaipei(day);
  const to = addDays(from, 1);
  const admin = createAdminClient();

  if (!seller.line_user_id) {
    return {
      sellerId: seller.id,
      shopName: seller.shop_name,
      sent: false,
      skipped: "no_line_user_id",
    };
  }

  if (!opts?.force && seller.last_daily_digest_on === ymd) {
    return {
      sellerId: seller.id,
      shopName: seller.shop_name,
      sent: false,
      skipped: "already_sent_today",
    };
  }

  const productIds = await productIdsForSeller(admin, seller.id);

  let ordersToday = 0;
  let revenueToday = 0;
  let matchedToday = 0;
  let matchedAmountToday = 0;
  let pendingOrders = 0;
  const pendingOrderLines: string[] = [];

  if (productIds.length) {
    const { data: todayOrders } = await admin
      .from("orders")
      .select(
        "id, buyer_name, total_amount, payment_status, atm_last5, created_at, payment_type"
      )
      .in("product_id", productIds)
      .gte("created_at", from.toISOString())
      .lt("created_at", to.toISOString())
      .order("created_at", { ascending: false });

    for (const row of todayOrders || []) {
      const amount = Number(row.total_amount) || 0;
      ordersToday += 1;
      revenueToday += amount;
      if (row.payment_status === "matched") {
        matchedToday += 1;
        matchedAmountToday += amount;
      }
    }

    const { count: pendingCount } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("product_id", productIds)
      .eq("payment_status", "pending");

    pendingOrders = pendingCount ?? 0;

    const { data: pending } = await admin
      .from("orders")
      .select("buyer_name, total_amount, atm_last5, created_at")
      .in("product_id", productIds)
      .eq("payment_status", "pending")
      .order("created_at", { ascending: false })
      .limit(8);

    for (const row of pending || []) {
      pendingOrderLines.push(
        `・${row.buyer_name || "買家"} $${Number(row.total_amount) || 0} 末碼 ${row.atm_last5 || "—"}`
      );
    }
  }

  const { data: reportRows } = await admin
    .from("payment_reports")
    .select("id, buyer_name, amount, bank_last_five, status, created_at")
    .eq("seller_id", seller.id)
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString());

  let reportsMatchedToday = 0;
  let reportsMatchedAmount = 0;
  for (const row of reportRows || []) {
    if (row.status === "auto_confirmed" || row.status === "confirmed") {
      reportsMatchedToday += 1;
      reportsMatchedAmount += Number(row.amount) || 0;
    }
  }

  const { count: pendingReportsCount } = await admin
    .from("payment_reports")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", seller.id)
    .in("status", ["pending", "needs_contact"]);

  const pendingReports = pendingReportsCount ?? 0;

  const totalMatchedCount = matchedToday + reportsMatchedToday;
  const totalMatchedAmount = matchedAmountToday + reportsMatchedAmount;

  const lines = [
    `📊 【NovaStore 每日帳務彙整】${ymd}`,
    seller.shop_name ? `店家：${seller.shop_name}` : null,
    "",
    `今日新訂單：${ordersToday} 筆／${formatTWD(revenueToday)}`,
    `今日已對帳：${totalMatchedCount} 筆／${formatTWD(totalMatchedAmount)}`,
    `　└ 商店訂單 ${matchedToday}・轉帳回報 ${reportsMatchedToday}`,
    `待確認訂單：${pendingOrders} 筆`,
    `待處理回報：${pendingReports} 筆`,
  ].filter((v): v is string => v != null);

  if (pendingOrderLines.length) {
    lines.push("", "⏳ 待確認訂單（最多 8 筆）");
    lines.push(...pendingOrderLines);
  }

  lines.push(
    "",
    `後台：${getSiteUrl()}/dashboard/orders`,
    "（已改為每日彙整，不再逐筆即時推播新訂單）"
  );

  const push = await sendLineTextMessage(seller.line_user_id, lines.join("\n"), {
    accessToken: seller.line_channel_access_token,
  });

  if (!push.ok) {
    return {
      sellerId: seller.id,
      shopName: seller.shop_name,
      sent: false,
      error: push.error || "line_push_failed",
      stats: {
        ordersToday,
        revenueToday,
        matchedToday: totalMatchedCount,
        matchedAmountToday: totalMatchedAmount,
        pendingOrders,
        pendingReports,
      },
    };
  }

  await admin
    .from("profiles")
    .update({ last_daily_digest_on: ymd })
    .eq("id", seller.id);

  return {
    sellerId: seller.id,
    shopName: seller.shop_name,
    sent: true,
    stats: {
      ordersToday,
      revenueToday,
      matchedToday: totalMatchedCount,
      matchedAmountToday: totalMatchedAmount,
      pendingOrders,
      pendingReports,
    },
  };
}

/** Cron: send digest to every seller with a LINE User ID. */
export async function runDailyDigestForAllSellers(opts?: {
  force?: boolean;
}): Promise<{ processed: number; sent: number; results: DailyDigestResult[] }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(
      "id, shop_name, line_user_id, line_channel_access_token, last_daily_digest_on"
    )
    .not("line_user_id", "is", null);

  if (error) throw error;

  const results: DailyDigestResult[] = [];
  let sent = 0;
  for (const row of data || []) {
    if (!row.line_user_id) continue;
    const result = await buildAndSendDailyDigest(row as SellerRow, {
      force: opts?.force,
    });
    results.push(result);
    if (result.sent) sent += 1;
  }

  return { processed: results.length, sent, results };
}
