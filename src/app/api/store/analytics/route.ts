import { NextResponse } from "next/server";
import {
  getSellerAnalyticsDetail,
  isAnalyticsRangeKey,
  type AnalyticsRangeKey,
} from "@/lib/seller-analytics";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("range") || "30d";
    const range: AnalyticsRangeKey = isAnalyticsRangeKey(raw) ? raw : "30d";

    const detail = await getSellerAnalyticsDetail(user.id, range);
    return NextResponse.json({ ok: true, analytics: detail });
  } catch (error) {
    console.error("[store/analytics]", error);
    return NextResponse.json({ error: "讀取失敗" }, { status: 500 });
  }
}
