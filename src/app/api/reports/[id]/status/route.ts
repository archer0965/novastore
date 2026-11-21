import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "auto_confirmed",
    "rejected",
    "needs_contact",
  ]),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "無效的狀態" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("payment_reports")
      .update({ status: body.data.status })
      .eq("id", params.id)
      .eq("seller_id", user.id)
      .select("id, status")
      .maybeSingle();

    if (error) {
      console.error("[reports/status]", error);
      return NextResponse.json({ error: "更新失敗" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "找不到對帳紀錄" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, report: data });
  } catch (error) {
    console.error("[reports/status]", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
