import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminEmail } from "@/lib/admin";
import {
  assignEarlyBird,
  countEarlyBirdSeats,
  listEarlyBirdSeats,
  revokeEarlyBird,
} from "@/lib/early-bird";
import { createClient } from "@/lib/supabase/server";
import { EARLY_BIRD } from "@/types/database";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return { error: NextResponse.json({ error: "權限不足" }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  try {
    const gate = await requireAdmin();
    if ("error" in gate && gate.error) return gate.error;

    const [used, seats] = await Promise.all([
      countEarlyBirdSeats(),
      listEarlyBirdSeats(),
    ]);

    return NextResponse.json({
      ok: true,
      unlimited: true,
      used,
      trialDays: EARLY_BIRD.trialDays,
      cycleMultipliers: EARLY_BIRD.cycleMultipliers,
      label: EARLY_BIRD.label,
      description: EARLY_BIRD.description,
      seats,
      benefits: {
        trialDays: EARLY_BIRD.trialDays,
        discountTier: EARLY_BIRD.discountTier,
        cycleMultipliers: EARLY_BIRD.cycleMultipliers,
      },
    });
  } catch (error) {
    console.error("[admin/early-bird GET]", error);
    return NextResponse.json({ error: "無法載入特約店家" }, { status: 500 });
  }
}

const bodySchema = z.object({
  email: z.string().email("請輸入有效信箱"),
  action: z.enum(["assign", "revoke"]).default("assign"),
});

export async function POST(request: Request) {
  try {
    const gate = await requireAdmin();
    if ("error" in gate && gate.error) return gate.error;

    const json = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "參數錯誤" },
        { status: 400 }
      );
    }

    if (parsed.data.action === "revoke") {
      const result = await revokeEarlyBird(parsed.data.email);
      return NextResponse.json({ ok: true, ...result });
    }

    const result = await assignEarlyBird({
      targetUserEmail: parsed.data.email,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "開通特約店家失敗";
    const status = message.includes("找不到") ? 400 : 500;
    console.error("[admin/early-bird POST]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
