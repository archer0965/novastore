import { getNovaOsUpgradeUrl } from "@/lib/novaos-hub";
import { formatExpiresAtTaipei } from "@/lib/subscription";
import {
  getCycleLabel,
  getPlanDisplayName,
  type BillingCycle,
} from "@/types/database";

/** Shared LINE expiry reminder copy (Email uses buildExpiryReminderHtml). */
export function buildExpiryReminderLineText(options: {
  planType: string;
  expiresAt: string;
  daysLeft: 1 | 3;
}): string {
  const planName = getPlanDisplayName(options.planType);
  return [
    options.daysLeft === 1
      ? "⚠️ 您的 NovaStore 方案明天到期"
      : "⏰ 您的 NovaStore 方案將於 3 天後到期",
    `方案：${planName}`,
    `到期日（台北）：${formatExpiresAtTaipei(options.expiresAt)}`,
    `請至拓新雲端主站續費：${getNovaOsUpgradeUrl()}`,
  ].join("\n");
}

export function buildExpiryReminderSubjects(daysLeft: 1 | 3): string {
  return daysLeft === 1
    ? "【Paycheck】您的方案明天到期，請盡快續費"
    : "【Paycheck】您的方案將於 3 天後到期";
}

export function describeExpiryReminder(options: {
  shopName?: string | null;
  planType: string;
  billingCycle?: BillingCycle | null;
  expiresAt: string;
  daysLeft: 1 | 3;
}) {
  const planName = getPlanDisplayName(options.planType);
  const cycleLabel = options.billingCycle
    ? getCycleLabel(options.billingCycle)
    : "目前方案";
  return {
    subject: buildExpiryReminderSubjects(options.daysLeft),
    headline:
      options.daysLeft === 1 ? "方案明天即將到期" : "方案將於 3 天後到期",
    planLine: `${planName}（${cycleLabel}）`,
    expiresLine: formatExpiresAtTaipei(options.expiresAt),
    lineText: buildExpiryReminderLineText(options),
    renewUrl: getNovaOsUpgradeUrl(),
  };
}
