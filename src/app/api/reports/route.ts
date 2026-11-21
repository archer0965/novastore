import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ReportStatus } from "@/types/database";

const PAGE_SIZE_DEFAULT = 15;
const PAGE_SIZE_MAX = 50;

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
    const q = (searchParams.get("q") || "").trim();
    const filter = (searchParams.get("filter") || "actionable").trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
    const pageSize = Math.min(
      PAGE_SIZE_MAX,
      Math.max(5, Number(searchParams.get("pageSize") || PAGE_SIZE_DEFAULT) || PAGE_SIZE_DEFAULT)
    );

    let query = supabase
      .from("payment_reports")
      .select(
        "id, seller_id, buyer_name, buyer_contact, contact_platform, transfer_bank, amount, bank_last_five, note, status, created_at",
        { count: "exact" }
      )
      .eq("seller_id", user.id);

    if (filter === "actionable") {
      query = query.in("status", ["pending", "needs_contact"]);
    } else if (filter === "confirmed") {
      query = query.in("status", ["confirmed", "auto_confirmed"]);
    } else if (
      ["pending", "needs_contact", "rejected", "confirmed", "auto_confirmed"].includes(
        filter
      )
    ) {
      query = query.eq("status", filter as ReportStatus);
    }
    // filter === "all" → no status constraint

    if (q) {
      // PostgREST or() — strip LIKE / filter metacharacters
      const safe = q.replace(/[%_,.()\[\]"'\\]/g, " ").trim().slice(0, 80);
      if (safe) {
        query = query.or(
          [
            `buyer_name.ilike.%${safe}%`,
            `buyer_contact.ilike.%${safe}%`,
            `bank_last_five.ilike.%${safe}%`,
            `transfer_bank.ilike.%${safe}%`,
            `note.ilike.%${safe}%`,
          ].join(",")
        );
      }
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[api/reports]", error);
      return NextResponse.json({ error: "讀取回報失敗" }, { status: 500 });
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      reports: data || [],
      page,
      pageSize,
      total,
      totalPages,
      filter,
      q,
    });
  } catch (error) {
    console.error("[api/reports]", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
