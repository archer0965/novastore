import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  return authorizeCronRequest(request, "keep-alive");
}

/**
 * Lightweight Supabase ping for Vercel Cron keep-alive.
 * Schedule: every 3 days via vercel.json crons → /api/keep-alive
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) {
      console.error("[keep-alive] query failed:", error);
      return NextResponse.json(
        { success: false, error: "Database ping failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Database is kept alive",
      at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[keep-alive]", error);
    return NextResponse.json(
      { success: false, error: "Keep-alive failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
