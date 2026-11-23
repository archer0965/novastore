import { NextResponse } from "next/server";
import { startFreeTrialForProfile } from "@/lib/signup-early-bird";
import { createClient } from "@/lib/supabase/server";
import {
  FREE_TRIAL,
  SIGNUP_EARLY_BIRD,
  formatSignupEarlyBirdDiscountPhrase,
} from "@/types/database";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const result = await startFreeTrialForProfile(user.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || "無法開通試用" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    trialEndsAt: result.trialEndsAt,
    earlyBird: result.earlyBird,
    remainingEarlyBird: result.remainingEarlyBird,
    trialDays: FREE_TRIAL.durationDays,
    message: result.earlyBird
      ? `已開通 ${FREE_TRIAL.durationDays} 天全功能試用，並取得早鳥資格（終身${formatSignupEarlyBirdDiscountPhrase()}）。${SIGNUP_EARLY_BIRD.label}剩餘約 ${result.remainingEarlyBird} 名。`
      : `已開通 ${FREE_TRIAL.durationDays} 天全功能試用。早鳥名額已滿，續約依標準方案計價。`,
    profile: result.profile,
  });
}
