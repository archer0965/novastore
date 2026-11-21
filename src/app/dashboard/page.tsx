import { redirect } from "next/navigation";
import { AutoReconcilePanel } from "@/components/dashboard/auto-reconcile";
import { MarketingTemplates } from "@/components/dashboard/marketing-templates";
import { ProductionUrlsCard } from "@/components/dashboard/production-urls-card";
import { ReportsTable } from "@/components/dashboard/reports-table";
import { SellerMetricsDashboard } from "@/components/dashboard/seller-metrics";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { ShareLink } from "@/components/dashboard/share-link";
import { SubscriptionCard } from "@/components/dashboard/subscription-card";
import { UsageCard } from "@/components/dashboard/usage-card";
import { isAdminEmail } from "@/lib/admin";
import {
  trialDaysForNewSignup,
  trialEndsAtAfterDays,
} from "@/lib/signup-early-bird";
import { getSellerOrderMetrics } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { currentUsageMonth, getReportShareUrl } from "@/lib/utils-format";
import type { PaymentReport, Profile } from "@/types/database";

export const metadata = {
  title: "對帳儀表板",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: reports, count: reportsCount }, metrics] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, shop_name, shop_slug, shop_bio, bank_code, bank_account, line_user_id, plan_type, billing_cycle, trial_ends_at, expires_at, is_early_bird, discount_tier, signup_early_bird, monthly_usage_count, usage_month, created_at"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("payment_reports")
        .select(
          "id, seller_id, buyer_name, buyer_contact, contact_platform, transfer_bank, amount, bank_last_five, note, status, created_at",
          { count: "exact" }
        )
        .eq("seller_id", user.id)
        .in("status", ["pending", "needs_contact"])
        .order("created_at", { ascending: false })
        .limit(15),
      getSellerOrderMetrics(user.id).catch(() => ({
        today: { revenue: 0, orders: 0, fulfilled: 0, unfulfilled: 0 },
        week: { revenue: 0, orders: 0 },
        month: { revenue: 0, orders: 0 },
      })),
    ]);

  if (!profile) {
    // Ensure profile row exists for older accounts / race before trigger
    const days = await trialDaysForNewSignup();
    const early = days > 7;
    await supabase.from("profiles").upsert({
      id: user.id,
      shop_name: "",
      trial_ends_at: trialEndsAtAfterDays(days),
      signup_early_bird: early,
    });
    redirect("/dashboard/settings");
  }

  // Never serialize LINE channel secrets into the client RSC payload
  const typedProfile = {
    ...(profile as Profile),
    line_channel_access_token: null,
    line_channel_secret: null,
  } satisfies Profile;
  const isAdmin = isAdminEmail(user.email);
  const month = currentUsageMonth();
  const usage =
    typedProfile.usage_month === month ? typedProfile.monthly_usage_count : 0;

  const shareUrl = getReportShareUrl(user.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          對帳儀表板
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {typedProfile.shop_name
            ? `${typedProfile.shop_name} · 管理本月轉帳回報`
            : "完成個人設定後，即可分享回報連結給買家"}
          {isAdmin ? " · 管理者帳號" : ""}
        </p>
      </div>

      <SellerMetricsDashboard metrics={metrics} />

      <SetupChecklist profile={typedProfile} />

      {isAdmin ? <ProductionUrlsCard /> : null}

      <SubscriptionCard profile={typedProfile} isAdmin={isAdmin} />

      <UsageCard
        planType={typedProfile.plan_type}
        monthlyUsageCount={usage}
        trialEndsAt={typedProfile.trial_ends_at}
        expiresAt={typedProfile.expires_at}
        isAdmin={isAdmin}
      />

      <ShareLink url={shareUrl} />

      <AutoReconcilePanel profile={typedProfile} isAdmin={isAdmin} />

      <MarketingTemplates shareUrl={shareUrl} />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">對帳列表</h2>
        <ReportsTable
          initialReports={(reports || []) as PaymentReport[]}
          initialTotal={reportsCount ?? undefined}
        />
      </section>
    </div>
  );
}
