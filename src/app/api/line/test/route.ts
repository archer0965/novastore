import { NextResponse } from "next/server";
import {
  resolveLineAccessToken,
  sendLineNotification,
  sendLineTextMessage,
} from "@/lib/line";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("line_user_id, shop_name, line_channel_access_token")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "無法讀取個人設定" }, { status: 500 });
    }

    const lineUserId = profile?.line_user_id;
    if (!lineUserId) {
      return NextResponse.json(
        { error: "請先在設定頁填寫 LINE User ID 並儲存" },
        { status: 400 }
      );
    }

    const accessToken = resolveLineAccessToken(
      profile?.line_channel_access_token
    );
    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "尚未設定 Channel Access Token。請在設定頁填入你的 LINE 官方帳號 Token，或由平台管理員設定系統預設 Token。",
        },
        { status: 503 }
      );
    }

    const lineOpts = { accessToken: profile?.line_channel_access_token };
    const usingSellerToken = Boolean(profile?.line_channel_access_token?.trim());

    const push = await sendLineNotification(
      lineUserId,
      {
        buyer_name: "（測試買家）",
        buyer_contact: "paycheck_demo",
        contact_platform: "ig",
        transfer_bank: "中國信託",
        amount: 1280,
        bank_last_five: "83920",
        note: "這是NovaStore 測試推播，可忽略。",
      },
      lineOpts
    );

    if (!push.ok) {
      const text = await sendLineTextMessage(
        lineUserId,
        "NovaStore 測試推播：若你看到這則訊息，代表 LINE 串接成功。",
        lineOpts
      );
      if (!text.ok) {
        return NextResponse.json(
          { error: push.error || text.error || "推播失敗" },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: usingSellerToken
        ? "測試推播已送出（使用你的官方帳號 Token），請查看 LINE"
        : "測試推播已送出（使用平台預設 Token），請查看 LINE",
      usingSellerToken,
    });
  } catch (error) {
    console.error("[line/test]", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
