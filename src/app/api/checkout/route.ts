import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNovaOsUpgradeUrl } from "@/lib/novaos-hub";

/**
 * 付費升級統一導向拓新雲端主站綠界 ECPay（同一 Auth 帳號）。
 * 本站保留價目顯示；不再在 NovaStore origin 建立綠界訂單。
 */
export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    return NextResponse.json({
      checkoutUrl: getNovaOsUpgradeUrl(),
      gateway: "ecpay",
      hub: true,
      message: "請至拓新雲端主站完成綠界付款",
    });
  } catch (error) {
    console.error("[checkout]", error);
    return NextResponse.json(
      { error: "無法建立結帳導向" },
      { status: 500 }
    );
  }
}
