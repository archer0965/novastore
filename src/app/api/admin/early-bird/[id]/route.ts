import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { getPartnerStoreDetail } from "@/lib/early-bird";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const detail = await getPartnerStoreDetail(context.params.id);
    if (!detail) {
      return NextResponse.json({ error: "找不到此特約店家" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, partner: detail });
  } catch (error) {
    console.error("[admin/early-bird/:id]", error);
    return NextResponse.json({ error: "無法載入特約店家詳情" }, { status: 500 });
  }
}
