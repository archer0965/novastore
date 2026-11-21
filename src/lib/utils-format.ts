import { getSiteUrl } from "@/lib/site";
import { getPlanLimit, type PlanType } from "@/types/database";

export function formatTWD(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function currentUsageMonth(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

export function getUsageLimit(plan: PlanType): number | null {
  return getPlanLimit(plan);
}

export function getReportShareUrl(sellerId: string): string {
  return `${getSiteUrl()}/p/${sellerId}`;
}
