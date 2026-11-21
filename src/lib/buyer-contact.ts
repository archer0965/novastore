import type { ContactPlatform } from "@/types/database";

export const CONTACT_PLATFORMS: {
  id: ContactPlatform;
  label: string;
  placeholder: string;
}[] = [
  { id: "ig", label: "IG 帳號", placeholder: "例如：shopper_mia" },
  { id: "threads", label: "Threads ID", placeholder: "例如：shopper_mia" },
  { id: "line", label: "LINE 暱稱", placeholder: "例如：小美（訂單用）" },
];

export const TRANSFER_BANKS = [
  "郵局",
  "中國信託",
  "國泰世華",
  "玉山銀行",
  "台新銀行",
  "兆豐銀行",
  "第一銀行",
  "合作金庫",
  "華南銀行",
  "土地銀行",
  "彰化銀行",
  "LINE Bank",
  "富邦銀行",
  "永豐銀行",
  "元大銀行",
  "其他",
] as const;

export function normalizeContactHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "");
}

export function contactPlatformLabel(
  platform: ContactPlatform | string | null | undefined
): string {
  const found = CONTACT_PLATFORMS.find((p) => p.id === platform);
  return found?.label ?? "聯絡方式";
}

/** Build external profile URL for IG / Threads; LINE nickname has no deep link. */
export function buildContactExternalUrl(
  platform: ContactPlatform | string | null | undefined,
  contact: string | null | undefined
): string | null {
  const handle = normalizeContactHandle(contact || "");
  if (!handle) return null;
  if (platform === "ig") {
    return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
  }
  if (platform === "threads") {
    return `https://www.threads.net/@${encodeURIComponent(handle)}`;
  }
  return null;
}

export function formatReportClipboard(report: {
  buyer_name: string;
  buyer_contact?: string | null;
  contact_platform?: ContactPlatform | string | null;
  transfer_bank?: string | null;
  amount: number;
  bank_last_five: string;
  note?: string | null;
  created_at?: string;
}): string {
  const platform = contactPlatformLabel(report.contact_platform);
  const contact = report.buyer_contact?.trim() || "—";
  const lines = [
    `買家：${report.buyer_name}`,
    `${platform}：${contact}`,
    `轉帳銀行：${report.transfer_bank?.trim() || "—"}`,
    `金額：$${Number(report.amount).toLocaleString("zh-TW")}`,
    `帳號末五碼：${report.bank_last_five}`,
  ];
  if (report.note?.trim()) lines.push(`備註：${report.note.trim()}`);
  if (report.created_at) {
    lines.push(
      `回報時間：${new Date(report.created_at).toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
      })}`
    );
  }
  return lines.join("\n");
}
