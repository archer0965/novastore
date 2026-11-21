import { Resend } from "resend";
import { buildExpiryReminderSubjects } from "@/lib/expiry-notify";
import { getSiteUrl, PRODUCTION_HOST, siteConfig } from "@/lib/site";
import { formatExpiresAtTaipei } from "@/lib/subscription";
import {
  getCycleLabel,
  getPlanDisplayName,
  type BillingCycle,
} from "@/types/database";

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — skip sending");
    return null;
  }
  return new Resend(key);
}

function getFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL ||
    `${siteConfig.name} <noreply@${PRODUCTION_HOST}>`
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildExpiryReminderHtml(options: {
  shopName?: string | null;
  planType: string;
  billingCycle?: BillingCycle | null;
  expiresAt: string;
  daysLeft: 1 | 3;
}): string {
  const renewUrl = `${
    process.env.NEXT_PUBLIC_NOVAOS_URL?.replace(/\/$/, "") ||
    "https://paycheck.com.de"
  }/login?next=${encodeURIComponent("/dashboard/pass#upgrade")}`;
  const planName = getPlanDisplayName(options.planType);
  const cycleLabel = options.billingCycle
    ? getCycleLabel(options.billingCycle)
    : "目前方案";
  const when = options.daysLeft === 1 ? "明天即將到期" : "將於 3 天後到期";
  const shop = options.shopName?.trim() || siteConfig.name;

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;border:1px solid #e8ecf0;overflow:hidden;">
        <tr>
          <td style="padding:24px 28px;background:linear-gradient(135deg,#0f766e,#115e59);color:#fff;">
            <p style="margin:0;font-size:13px;opacity:.85;">${escapeHtml(shop)}</p>
            <h1 style="margin:8px 0 0;font-size:22px;">方案${escapeHtml(when)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;font-size:15px;line-height:1.6;color:#334155;">
            <p style="margin:0 0 12px;">您好，您的 <strong>${escapeHtml(planName)}</strong>（${escapeHtml(cycleLabel)}）即將到期。</p>
            <p style="margin:0 0 20px;">到期時間（台北時間）：<strong>${escapeHtml(formatExpiresAtTaipei(options.expiresAt))}</strong></p>
            <p style="margin:0 0 24px;">為避免對帳額度與進階功能中斷，請儘早續費。提前續費會自「原到期日」往後累加天數，不會吃掉剩餘效期。</p>
            <a href="${renewUrl}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#0f766e;color:#fff;text-decoration:none;font-weight:600;">
              👉 一鍵前往續費／升級方案
            </a>
            <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">
              若按鈕無法點擊：${renewUrl}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 24px;border-top:1px solid #eef2f7;font-size:12px;color:#94a3b8;">
            此信由 ${escapeHtml(siteConfig.name)} 自動寄出。
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  logTag: string;
}): Promise<{ ok: boolean; id?: string; error?: string; skipped?: boolean }> {
  const to = options.to.trim();
  if (!to) return { ok: false, error: "Missing email" };

  try {
    const resend = getResendClient();
    if (!resend) {
      return {
        ok: false,
        skipped: true,
        error: "RESEND_API_KEY not configured",
      };
    }

    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: [to],
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error(`[email] ${options.logTag} failed:`, error);
      return { ok: false, error: error.message || String(error) };
    }
    return { ok: true, id: data?.id };
  } catch (error) {
    console.error(`[email] ${options.logTag} exception:`, error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

export async function sendExpiryReminderEmail(options: {
  to: string;
  shopName?: string | null;
  planType: string;
  billingCycle?: BillingCycle | null;
  expiresAt: string;
  daysLeft: 1 | 3;
}): Promise<{ ok: boolean; id?: string; error?: string; skipped?: boolean }> {
  return sendMail({
    to: options.to,
    subject: buildExpiryReminderSubjects(options.daysLeft),
    html: buildExpiryReminderHtml(options),
    logTag: "expiry reminder",
  });
}

export function buildSubscriptionConfirmedHtml(options: {
  shopName?: string | null;
  planType: string;
  billingCycle?: BillingCycle | null;
  expiresAt: string;
  mode: "purchase" | "upgrade";
}): string {
  const dashboardUrl = `${getSiteUrl()}/dashboard`;
  const planName = getPlanDisplayName(options.planType);
  const cycleLabel = options.billingCycle
    ? getCycleLabel(options.billingCycle)
    : "目前方案";
  const shop = options.shopName?.trim() || siteConfig.name;
  const title =
    options.mode === "upgrade" ? "方案升級成功" : "訂閱／續費成功";
  const lead =
    options.mode === "upgrade"
      ? `您已成功升級至 <strong>${escapeHtml(planName)}</strong>（${escapeHtml(cycleLabel)}）。`
      : `您已成功訂閱 <strong>${escapeHtml(planName)}</strong>（${escapeHtml(cycleLabel)}）。`;

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;border:1px solid #e8ecf0;overflow:hidden;">
        <tr>
          <td style="padding:24px 28px;background:linear-gradient(135deg,#0f766e,#115e59);color:#fff;">
            <p style="margin:0;font-size:13px;opacity:.85;">${escapeHtml(shop)}</p>
            <h1 style="margin:8px 0 0;font-size:22px;">${escapeHtml(title)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;font-size:15px;line-height:1.6;color:#334155;">
            <p style="margin:0 0 12px;">您好，${lead}</p>
            <p style="margin:0 0 20px;">方案到期日（台北時間）：<strong>${escapeHtml(formatExpiresAtTaipei(options.expiresAt))}</strong></p>
            <p style="margin:0 0 24px;">到期前 3 天與 1 天，系統會自動寄信提醒您續費；提前續費天數會自動累加，不會被吃掉。</p>
            <a href="${dashboardUrl}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#0f766e;color:#fff;text-decoration:none;font-weight:600;">
              前往對帳儀表板
            </a>
            <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">
              若按鈕無法點擊：${dashboardUrl}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 24px;border-top:1px solid #eef2f7;font-size:12px;color:#94a3b8;">
            此信由 ${escapeHtml(siteConfig.name)} 自動寄出。
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendSubscriptionConfirmedEmail(options: {
  to: string;
  shopName?: string | null;
  planType: string;
  billingCycle?: BillingCycle | null;
  expiresAt: string;
  mode: "purchase" | "upgrade";
}): Promise<{ ok: boolean; id?: string; error?: string; skipped?: boolean }> {
  const subject =
    options.mode === "upgrade"
      ? "【Paycheck】方案升級成功通知"
      : "【Paycheck】訂閱／續費成功通知";

  return sendMail({
    to: options.to,
    subject,
    html: buildSubscriptionConfirmedHtml(options),
    logTag: "subscription confirmed",
  });
}
