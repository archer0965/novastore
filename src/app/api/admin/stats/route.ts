import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAdminStats, isAdminEmail, type SignupPeriod } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const periodParam = new URL(request.url).searchParams.get("period");
    const period: SignupPeriod =
      periodParam === "weekly" || periodParam === "monthly"
        ? periodParam
        : "daily";

    const stats = await buildAdminStats(period);
    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    console.error("[admin/stats]", error);
    return NextResponse.json({ error: "無法載入統計" }, { status: 500 });
  }
}
