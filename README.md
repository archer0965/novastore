# NovaStore

代購／團購獨立賣場與自動對帳平台（獨立 Next.js 專案）。

本專案自 `paycheck-tw` 在 NovaOS 多模組升級**之前**的提交 `11cf824` 完整抽出，保留 NovaStore 核心功能，可獨立部署與執行。

## 核心功能

- **賣家後台設定**：匯款帳號、賣貨便／蝦皮等外部導流（`enable_cod` + `cod_url` + `cod_label`）
- **運費／滿額免運**：`src/lib/shipping.ts` + 設定頁
- **買家前台結帳**：ATM 末五碼、外部跳轉結帳（`/shop/[username]`、`/[username]/[productId]`）
- **訂單管理**：一鍵標記 ✅ 已對帳／出貨狀態（`/dashboard/orders`）
- **LINE 每日帳務彙整**：`/api/cron/daily-digest`、`/api/line/daily-digest`

## 技術棧

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase Auth / Postgres / RLS
- LINE Messaging API
- ECPay（訂閱升級，可選）

## 環境變數

見 `.env.example`。必要項目：

| 變數 | 說明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role（僅伺服器） |
| `NEXT_PUBLIC_BASE_URL` | 站台網址 |
| `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET` | LINE 推播（可選） |
| `CRON_SECRET` | Cron 授權 |

資料庫 migration 位於 `supabase/migrations/`（與原 NovaStore schema 相容；可共用既有 Supabase 專案）。

## 開發

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Build

```bash
npm run build
npm start
```

## 來源

- 抽出基準：`paycheck-tw` commit `11cf824`（今日 NovaOS 平台改動之前）
- 原品牌／功能已以 NovaStore 為主；本 repo 為獨立可部署副本
