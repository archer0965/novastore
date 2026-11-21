import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { amountsEqual, parseBankTransactions } from "@/lib/bank-parse";
import { canUseAutoReconcile } from "@/types/database";

const bodySchema = z.object({
  text: z.string().trim().min(1, "請貼上銀行交易明細文字").max(20000),
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const json = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "資料無效" },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, plan_type, trial_ends_at, expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: "無法讀取方案資料" }, { status: 500 });
    }

    if (
      !canUseAutoReconcile(profile.plan_type, profile.trial_ends_at, {
        isAdmin: isAdminEmail(user.email),
        expiresAt: profile.expires_at,
      })
    ) {
      return NextResponse.json(
        {
          error: "目前無法使用一鍵自動對帳，請稍後再試或聯繫客服。",
          code: "UPGRADE_REQUIRED",
        },
        { status: 403 }
      );
    }

    const txns = parseBankTransactions(parsed.data.text);
    if (txns.length === 0) {
      return NextResponse.json(
        {
          error:
            "無法從文字中辨識轉帳金額與後五碼，請確認貼上完整銀行交易明細。",
          code: "PARSE_FAILED",
          parsed: [],
          matched: [],
        },
        { status: 422 }
      );
    }

    const { data: pending, error: listError } = await supabase
      .from("payment_reports")
      .select("id, buyer_name, amount, bank_last_five, status, created_at")
      .eq("seller_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (listError) {
      console.error("[auto-reconcile] list", listError);
      return NextResponse.json({ error: "讀取待核對清單失敗" }, { status: 500 });
    }

    const pool = [...(pending || [])];
    const matched: Array<{
      reportId: string;
      buyerName: string;
      amount: number;
      bankLastFive: string;
    }> = [];
    const unmatchedParsed: typeof txns = [];

    for (const txn of txns) {
      const idx = pool.findIndex(
        (r) =>
          amountsEqual(Number(r.amount), txn.amount) &&
          String(r.bank_last_five) === txn.bankLastFive
      );
      if (idx < 0) {
        unmatchedParsed.push(txn);
        continue;
      }
      const report = pool[idx];
      pool.splice(idx, 1);

      const { data: updated, error: updateError } = await supabase
        .from("payment_reports")
        .update({ status: "auto_confirmed" })
        .eq("id", report.id)
        .eq("seller_id", user.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (updateError || !updated) {
        // Fallback if DB not yet migrated to auto_confirmed
        const { data: fallbackUpdated, error: fallbackError } = await supabase
          .from("payment_reports")
          .update({ status: "confirmed" })
          .eq("id", report.id)
          .eq("seller_id", user.id)
          .eq("status", "pending")
          .select("id")
          .maybeSingle();
        if (fallbackError || !fallbackUpdated) {
          console.error("[auto-reconcile] update", updateError, fallbackError);
          unmatchedParsed.push(txn);
          continue;
        }
      }

      matched.push({
        reportId: report.id,
        buyerName: report.buyer_name,
        amount: Number(report.amount),
        bankLastFive: report.bank_last_five,
      });
    }

    return NextResponse.json({
      ok: true,
      message:
        matched.length > 0
          ? `已自動核對 ${matched.length} 筆`
          : "沒有可自動核對的回報",
      parsedCount: txns.length,
      matchedCount: matched.length,
      matched,
      unmatchedParsed,
      remainingPending: pool.length,
    });
  } catch (error) {
    console.error("[auto-reconcile]", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
