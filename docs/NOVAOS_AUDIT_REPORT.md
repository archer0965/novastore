# NovaOS 六站程式碼盤點與架構分析

**盤點日：** 2026-11-22（Asia/Taipei）  
**範圍：** 主站＋五產品；有原始碼 3／6；無 Git 3／6（僅線上探測）

---

## 0. 存取狀態總覽

| # | 產品 | 正式網址 | GitHub | 本機原始碼 | Vercel | 可改碼 |
|---|------|----------|--------|------------|--------|--------|
| 1 | 拓新雲端 NovaOS | https://paycheck.com.de | `archer0965/novaos` | `/agent/paycheck-tw` | `novaos` | ✅ |
| 2 | NovaStore | https://novastore-omega.vercel.app | `archer0965/novastore` | `/agent/repos/novastore` | `novastore` | ✅ |
| 3 | 拓脈預約 | https://taiwanbiz.vercel.app | — | — | `taiwanbiz`（Git Not connected） | ❌ |
| 4 | Nova AI Doc（repo: DocMate） | https://docmate-ai-one.vercel.app | `archer0965/docmate-ai` | `/agent/repos/docmate-ai` | `docmate-ai` | ✅ |
| 5 | 訂閱管家 | https://temporary-speedy-reef-cy4xhhu.vercel.app | — | — | `temporary-speedy-reef-cy4xhhu` | ❌ |
| 6 | 拓維空間 NovaDimension | https://novadimension.vercel.app | — | — | `novadimension` | ❌ |

**命名約定（本次）：** 對外產品名「訂閱管家」；技術 id 可暫留 `subkeeper`。文件助理對外「Nova AI Doc」，repo／Vercel 仍可為 `docmate-ai`。

---

## 1. NovaOS 主站（hub）

| 項目 | 現況 |
|------|------|
| 框架 | Next.js **14.2.35**、React 18、App Router、TypeScript、Tailwind |
| Auth | Supabase Auth（`@supabase/ssr`）Email／密碼 |
| DB | Supabase Postgres `cucxpmvbcakrfxhlvrbd`；migrations 至 `029` |
| 金流 | 綠界 ECPay（`/api/checkout`＋callback）；解鎖在 callback |
| 產品 | 內建模組 booking／store／ai_doc／pass（訂閱中控）；矩陣外連獨立站 |
| 法律 | `/legal` `/terms` `/privacy` `/refund` `/disclaimer` |
| SEO | sitemap、robots、OG（`/og-image.jpg`） |
| PWA | Serwist |

**定位：** 品牌入口、矩陣、方案、統一綠界入口、會員帳號。

---

## 2. NovaStore

| 項目 | 現況 |
|------|------|
| 框架 | Next 14.2.35／React 18（自 hub 抽出） |
| Auth／DB | **同一** Supabase project `cucxpmvbcakrfxhlvrbd` |
| 金流 | 付費升級 **導向主站** ECPay；本站價目 299／499 |
| 功能 | 賣場、商品、訂單、ATM 末五碼、運費、LINE digest、優惠券 |
| 法律 | `/terms` `/privacy`；無 `/legal` |

---

## 3. 拓脈預約（無原始碼）

| 項目 | 線上觀測 |
|------|----------|
| `/` `/login` `/pricing` `/terms` `/privacy` | 200 |
| `/signup` | **404**（P1） |
| `/dashboard` | 導向 login（`callbackUrl`） |
| 價目 | 年繳文案 NT$2,990／4,990（月費×10）；月 299／499 對齊 hub，**年繳公式與 hub 不一致** |
| 早鳥 | 「前 10 組」文案（與 hub 模組早鳥 15 不同來源） |
| 金流 | 文案標綠界；無法驗證 webhook／防撞實作 |

---

## 4. Nova AI Doc（docmate-ai）

| 項目 | 現況 |
|------|------|
| 框架 | Next **16**／React **19** |
| Auth | Supabase；設計共用 NovaOS Auth（`005_shared_novaos_auth.sql`） |
| DB | `docmate_profiles`、documents、chunks、billing tables |
| AI | Google Gemini（server-only key） |
| 付費 | 升級導向主站 Pass ECPay；價 0／199／499 |
| `/signup` | 307 → `/login?mode=signup` |
| 法律頁 | `/terms` `/privacy` `/legal` **404**（P2） |

---

## 5. 訂閱管家（無原始碼）

| 項目 | 線上觀測 |
|------|----------|
| 任務要求定位 | 免登入、本機 localStorage |
| **線上實際** | 標題「訂閱管家」；首頁要求 **NovaOS 帳號登入／雲端帳號制**（與任務要求衝突，P1） |
| `/login` | 線上有登入導流（非純本機工具） |
| 主站連結 | 已指向本獨立站 URL |
| hub 內 | 另有 `/dashboard/subkeeper` 雲端實驗；**無 Git 無法把獨立站改回免登入** |

---

## 6. 拓維空間 NovaDimension（無原始碼）

| 項目 | 線上觀測 |
|------|----------|
| `/login` `/signup` `/dashboard` | 404（前端 SPA／客戶端路由可能） |
| 價目 | $0／$39／$299／$1,614／$3,049 |
| 金流 | 文案「主站綠界」；購買鈕為 JS，靜態 HTML 未證實 deep-link Pass |
| AI | fal.ai 等無法在無原始碼下驗證 |

---

## 7. Auth／資料庫關係

| 站 | Supabase project（已知） | 共用結論 |
|----|--------------------------|----------|
| hub | `cucxpmvbcakrfxhlvrbd` | 基準 |
| NovaStore | **同一** | Email／密碼可互通 |
| DocMate | 設計共用 Auth；需以正式 env 再確認 | 表分離 `docmate_profiles` |
| 拓脈／訂閱管家／拓維 | 未知 | **不可假設 user_id 可互通** |

SSO：同 project 可共用 session cookie **僅同網域**；跨 `*.vercel.app` 與 `paycheck.com.de` 需各自登入或自建 SSO（不可假裝已 SSO）。

---

## 8. 金流盤點（已知）

| 站 | 方式 | 備註 |
|----|------|------|
| hub | ECPay AioCheckOut | callback 解鎖；dedupe trades |
| NovaStore | 導向 hub | 價目本站顯示 |
| DocMate | 導向 hub | callback 寫 `docmate_profiles` |
| 拓脈 | 宣稱綠界 | 無原始碼 |
| 訂閱管家 | 無付費 | — |
| 拓維 | 宣稱主站綠界 | 無原始碼 |

**勿假設**六站同一 Merchant ID。

---

## 9. 早鳥名額來源衝突（待人工確認）

| 來源 | 數字 |
|------|------|
| hub `MODULE_EARLY_BIRD_MAX` | **15**／模組 |
| NovaStore signup early bird | max **15**（計數邏輯本站） |
| 拓脈公開文案 | **前 10 組** |

→ 非同一可信後端；**禁止前端各自寫死互斥數字當真相**。需你確認是否同一活動。

---

## 10. 盤點結論（進入下一階段優先序）

1. **有碼站：** 可修資安／功能／品牌文案並部署。  
2. **無碼站：** 僅能列 P1（如拓脈 `/signup` 404、年繳不一致）並要求接 Git。  
3. **訂閱管家：** 維持免登入本機定位；主站勿導成「必須 NovaOS 登入」。  
4. **正式 DB migration 026–029：** 需你在 Supabase 套用（我無法直連 DDL）。


> Canonical copies also live on the NovaOS hub repo (`archer0965/novaos` / `docs/`).
