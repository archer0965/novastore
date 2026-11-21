import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { isAdminEmail } from "@/lib/admin";
import { neutralizeAutoStartedTrial } from "@/lib/signup-early-bird";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export const metadata = {
  title: "個人設定",
};

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, shop_name, shop_slug, shop_bio, bank_code, bank_account, line_user_id, line_channel_access_token, line_channel_secret, plan_type, billing_cycle, trial_ends_at, expires_at, is_early_bird, discount_tier, signup_early_bird, monthly_usage_count, usage_month, created_at, enable_cod, cod_url, cod_label, shipping_fee, free_shipping_enabled, free_shipping_threshold, last_daily_digest_on"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const { data: created } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        shop_name: "",
        trial_ends_at: null,
        signup_early_bird: false,
      })
      .select("*")
      .single();
    profile = created;
  } else {
    const neutralized = await neutralizeAutoStartedTrial(profile as Profile);
    if (neutralized) {
      profile = { ...profile, ...neutralized };
    }
  }

  if (!profile) {
    return (
      <p className="text-sm text-destructive">無法載入個人資料，請重新整理。</p>
    );
  }

  const raw = profile as Profile & {
    line_channel_access_token?: string | null;
    line_channel_secret?: string | null;
  };
  const safeProfile = {
    ...raw,
    line_channel_access_token: null,
    line_channel_secret: null,
    line_channel_access_token_set: Boolean(raw.line_channel_access_token),
    line_channel_secret_set: Boolean(raw.line_channel_secret),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          個人設定
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          設定店名、銀行帳戶、LINE 通知對象與自有官方帳號推播。
        </p>
      </div>
      <SettingsForm
        profile={safeProfile}
        isAdmin={isAdminEmail(user.email)}
      />
    </div>
  );
}
