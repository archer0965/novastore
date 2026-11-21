import { NextResponse } from "next/server";
import { buildAndSendDailyDigest } from "@/lib/daily-digest";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Seller-triggered: send today's digest to my LINE now. */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const force = Boolean(body?.force);

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select(
        "id, shop_name, line_user_id, line_channel_access_token, last_daily_digest_on"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: "找不到賣家資料" }, { status: 404 });
    }
    if (!profile.line_user_id) {
      return NextResponse.json(
        { error: "請先在設定填寫 LINE User ID" },
        { status: 400 }
      );
    }

    const result = await buildAndSendDailyDigest(profile, { force: true });
    if (!result.sent) {
      return NextResponse.json(
        {
          error: result.error || result.skipped || "發送失敗",
          result,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "今日帳務彙整已推播至 LINE",
      result,
      force,
    });
  } catch (error) {
    console.error("[line/daily-digest]", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
