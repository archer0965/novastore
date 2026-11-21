import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { runDailyDigestForAllSellers } from "@/lib/daily-digest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  return authorizeCronRequest(request, "daily-digest");
}

/**
 * Daily LINE account digest for sellers (Taipei business day).
 * Schedule: 21:00 Asia/Taipei = 13:00 UTC
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  try {
    const force =
      new URL(request.url).searchParams.get("force") === "1" ||
      new URL(request.url).searchParams.get("force") === "true";
    const summary = await runDailyDigestForAllSellers({ force });
    return NextResponse.json({
      ok: true,
      ...summary,
      results: summary.results.map((r) => ({
        sellerId: r.sellerId,
        shopName: r.shopName,
        sent: r.sent,
        skipped: r.skipped,
        error: r.error,
        stats: r.stats,
      })),
    });
  } catch (error) {
    console.error("[daily-digest]", error);
    return NextResponse.json({ error: "彙整失敗" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
