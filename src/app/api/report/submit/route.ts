import { NextResponse } from "next/server";
import { z } from "zod";
import {
  contactPlatformLabel,
  normalizeContactHandle,
} from "@/lib/buyer-contact";
import { getSiteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLineNotification, sendLineTextMessage } from "@/lib/line";
import {
  bumpSellerMonthlyUsage,
  gateSellerMonthlyUsage,
} from "@/lib/seller-usage";

const bodySchema = z.object({
  seller_id: z.string().uuid("無效的賣家編號"),
  buyer_name: z.string().trim().min(1, "請填寫買家姓名").max(80),
  contact_platform: z.enum(["ig", "threads", "line"]),
  buyer_contact: z
    .string()
    .trim()
    .min(2, "請填寫可聯繫的 IG／Threads／LINE")
    .max(80),
  transfer_bank: z.string().trim().min(1, "請選擇轉帳銀行").max(40),
  amount: z.coerce.number().positive("金額必須大於 0").max(99999999),
  bank_last_five: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "帳號末五碼須為 5 位數字"),
  note: z.string().trim().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "表單資料無效" },
        { status: 400 }
      );
    }

    const data = {
      ...parsed.data,
      buyer_contact: normalizeContactHandle(parsed.data.buyer_contact),
    };

    const gate = await gateSellerMonthlyUsage(data.seller_id);
    if (!gate.ok) {
      if (gate.code === "QUOTA_EXCEEDED" && gate.lineUserId) {
        try {
          await sendLineTextMessage(
            gate.lineUserId,
            [
              "⚠️ 買家嘗試對帳但額度已滿",
              `買家：${data.buyer_name}`,
              `金額：$${Number(data.amount).toLocaleString("zh-TW")}`,
              "請升級方案或私訊買家處理。",
              `${getSiteUrl()}/dashboard/settings#upgrade`,
            ].join("\n"),
            { accessToken: gate.lineAccessToken }
          );
        } catch (lineError) {
          console.error("[report/submit] quota LINE notify:", lineError);
        }
      }
      return NextResponse.json(
        {
          error:
            gate.code === "QUOTA_EXCEEDED"
              ? "該賣家本月訂單額度已滿，已自動通知賣家處理。若需急迫對帳，請直接私訊賣家，謝謝！"
              : gate.error,
          code: gate.code,
        },
        { status: gate.status }
      );
    }

    const admin = createAdminClient();
    const { data: report, error: insertError } = await admin
      .from("payment_reports")
      .insert({
        seller_id: data.seller_id,
        buyer_name: data.buyer_name,
        buyer_contact: data.buyer_contact,
        contact_platform: data.contact_platform,
        transfer_bank: data.transfer_bank,
        amount: data.amount,
        bank_last_five: data.bank_last_five,
        note: data.note || null,
        status: "pending",
      })
      .select(
        "id, buyer_name, buyer_contact, contact_platform, transfer_bank, amount, bank_last_five, note, created_at"
      )
      .single();

    if (insertError || !report) {
      console.error("[report/submit] insert:", insertError);
      return NextResponse.json({ error: "對帳回報寫入失敗" }, { status: 500 });
    }

    await bumpSellerMonthlyUsage(
      gate.seller.id,
      gate.usageCount,
      gate.month
    );

    let lineNotified = false;
    if (gate.seller.line_user_id) {
      // Await push before returning: Vercel serverless will otherwise freeze
      // the isolate and drop the in-flight Messaging API request.
      try {
        const lineOpts = {
          accessToken: gate.seller.line_channel_access_token,
        };
        const push = await sendLineNotification(
          gate.seller.line_user_id,
          {
            buyer_name: report.buyer_name,
            buyer_contact: report.buyer_contact,
            contact_platform: report.contact_platform,
            transfer_bank: report.transfer_bank,
            amount: Number(report.amount),
            bank_last_five: report.bank_last_five,
            note: report.note,
          },
          lineOpts
        );
        if (!push.ok) {
          console.error("[report/submit] LINE flex push failed:", push.error);
          const contactLabel = contactPlatformLabel(report.contact_platform);
          const fallback = await sendLineTextMessage(
            gate.seller.line_user_id,
            [
              "⚡ 新對帳通知！",
              `買家：${report.buyer_name}`,
              `${contactLabel}：${report.buyer_contact || "—"}`,
              `轉帳銀行：${report.transfer_bank || "—"}`,
              `金額：$${Number(report.amount).toLocaleString("zh-TW")}`,
              `帳號末五碼：${report.bank_last_five}`,
              report.note ? `備註：${report.note}` : null,
              `請至後台核對：${getSiteUrl()}/dashboard`,
            ]
              .filter(Boolean)
              .join("\n"),
            lineOpts
          );
          lineNotified = fallback.ok;
          if (!fallback.ok) {
            console.error(
              "[report/submit] LINE text fallback failed:",
              fallback.error
            );
          }
        } else {
          lineNotified = true;
        }
      } catch (lineError) {
        console.error("[report/submit] LINE notify exception:", lineError);
      }
    } else {
      console.warn(
        "[report/submit] seller has no line_user_id, skip push",
        gate.seller.id
      );
    }

    return NextResponse.json({
      ok: true,
      report_id: report.id,
      line_notified: lineNotified,
      message: lineNotified
        ? "已自動通知賣家對帳，請留意出貨通知"
        : "回報已送出（賣家 LINE 通知未送達，請賣家確認已綁定 User ID）",
    });
  } catch (error) {
    console.error("[report/submit]", error);
    return NextResponse.json(
      { error: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}
