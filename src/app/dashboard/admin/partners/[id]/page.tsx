import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  MessageCircle,
  Store,
} from "lucide-react";
import { ensureAdminProfile, isAdminEmail } from "@/lib/admin";
import {
  getPartnerStoreDetail,
  partnerCycleLabel,
  partnerPlanLabel,
} from "@/lib/early-bird";
import { formatExpiresAtTaipei } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/site";
import { formatDiscountFold, getEarlyBirdMultiplier } from "@/types/database";
import type { BillingCycle } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "特約店家詳情",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium break-all">{children}</div>
    </div>
  );
}

export default async function PartnerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/dashboard");
  await ensureAdminProfile(user.id);

  const partner = await getPartnerStoreDetail(params.id);
  if (!partner) notFound();

  const cycles: BillingCycle[] = ["monthly", "half_yearly", "yearly"];

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <Link
          href="/dashboard/admin#partners"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回管理者後台
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
              <Store className="h-4 w-4" />
              特約店家
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {partner.shop_name?.trim() || "未命名店家"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {partner.email || "（無信箱）"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {partner.email ? (
              <a
                href={`mailto:${partner.email}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border bg-background px-3 text-sm font-medium hover:bg-secondary"
              >
                <Mail className="h-4 w-4" />
                寄信
              </a>
            ) : null}
            <a
              href={siteConfig.lineOfficialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border bg-background px-3 text-sm font-medium hover:bg-secondary"
            >
              <MessageCircle className="h-4 w-4" />
              官方 LINE
            </a>
          </div>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-card via-card to-amber-500/[0.05] p-5">
        <h2 className="font-display text-lg font-semibold">聯絡與店家資料</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="註冊信箱">{partner.email || "—"}</Field>
          <Field label="電話">{partner.phone || "—"}</Field>
          <Field label="店名">{partner.shop_name || "—"}</Field>
          <Field label="LINE User ID">
            {partner.line_user_id || "（尚未綁定）"}
          </Field>
          <Field label="銀行代碼">{partner.bank_code || "—"}</Field>
          <Field label="銀行帳號">{partner.bank_account || "—"}</Field>
          <Field label="買家回報連結">
            <a
              href={partner.share_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {partner.share_url}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border p-5">
        <h2 className="font-display text-lg font-semibold">方案與特約優惠</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="目前方案">
            {partnerPlanLabel(partner.plan_type)}
            {partner.plan_type && partner.plan_type !== "free"
              ? ` · ${partnerCycleLabel(partner.billing_cycle)}`
              : ""}
          </Field>
          <Field label="特約折扣">
            {partner.benefits.discountActive
              ? "已生效（lifetime_special）"
              : "未生效"}
          </Field>
          <Field label="試用到期（台北）">
            {formatExpiresAtTaipei(partner.trial_ends_at)}
          </Field>
          <Field label="付費方案到期（台北）">
            {formatExpiresAtTaipei(partner.expires_at)}
          </Field>
        </div>
        <div className="rounded-xl bg-secondary/50 px-4 py-3 text-sm">
          <p className="font-medium">{partner.benefits.label}</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {cycles.map((c) => (
              <li key={c}>
                {c === "monthly" ? "月繳" : c === "half_yearly" ? "半年繳" : "年繳"}
                ：{formatDiscountFold(getEarlyBirdMultiplier(c))}（終身續約）
              </li>
            ))}
            <li>開通／重套用時贈 {partner.benefits.trialDays} 天全功能試用</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border p-5">
        <h2 className="font-display text-lg font-semibold">營運摘要</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="本月用量">
            {partner.monthly_usage_count} 筆
            {partner.usage_month ? `（${partner.usage_month}）` : ""}
          </Field>
          <Field label="對帳回報總數">{partner.report_counts.total}</Field>
          <Field label="待核對">{partner.report_counts.pending}</Field>
          <Field label="已確認">{partner.report_counts.confirmed}</Field>
          <Field label="需聯繫">{partner.report_counts.needs_contact}</Field>
          <Field label="註冊時間（台北）">
            {formatExpiresAtTaipei(partner.auth_created_at || partner.created_at)}
          </Field>
          <Field label="最近登入（台北）">
            {formatExpiresAtTaipei(partner.last_sign_in_at)}
          </Field>
          <Field label="Email 驗證">
            {partner.email_confirmed_at
              ? formatExpiresAtTaipei(partner.email_confirmed_at)
              : "尚未驗證"}
          </Field>
        </div>
      </section>
    </div>
  );
}
