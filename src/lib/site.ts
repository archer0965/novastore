/** Public contact / compliance config (safe for client via NEXT_PUBLIC_*). */

/** Default production host for standalone NovaStore (override with NEXT_PUBLIC_BASE_URL). */
export const PRODUCTION_HOST =
  process.env.NEXT_PUBLIC_PRODUCTION_HOST || "novastore-omega.vercel.app";
export const PRODUCTION_URL = `https://${PRODUCTION_HOST}`;

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") return PRODUCTION_URL;
  return "http://localhost:3000";
}

export const siteConfig = {
  name: "NovaStore",
  legalName: "NovaStore",
  tagline: "3 分鐘建立 IG 專屬獨立賣場與自動對帳｜末五碼勾稽、賣貨便／蝦皮導流",
  url: PRODUCTION_URL,
  supportEmail:
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "archer0965@gmail.com",
  lineOfficialUrl:
    process.env.NEXT_PUBLIC_LINE_OFFICIAL_URL ||
    "https://line.me/R/ti/p/@469uykad",
  companyAddress:
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "台灣（線上服務）",
};
