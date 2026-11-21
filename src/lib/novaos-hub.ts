/** 拓新雲端主站（統一綠界金流入口；價目仍以本站 PRICING_CONFIG 顯示） */
export const NOVAOS_HUB_URL =
  process.env.NEXT_PUBLIC_NOVAOS_URL?.replace(/\/$/, "") ||
  "https://paycheck.com.de";

/** NovaStore 付費升級：導向主站 Pass 升級頁（綠界 ECPay；同一 Supabase 帳號） */
export function getNovaOsUpgradeUrl(): string {
  const next = encodeURIComponent("/dashboard/pass#upgrade");
  return `${NOVAOS_HUB_URL}/login?next=${next}`;
}
