# NovaOS 整合規劃（會員／方案／付款／資料）

**更新：** 2026-11-22（Asia/Taipei）  
**原則：** 先評估、不合併 DB、不假裝 SSO、不改正式價格。

---

## 1. 產品定位（勿混淆）

| 名稱 | 角色 |
|------|------|
| 拓新雲端 NovaOS | 母品牌／主站／帳號入口 |
| 訂閱中控（Pass／`module=pass`） | **跨產品訂閱與綠界付費中樞** |
| 訂閱管家 | **個人訂閱支出管理**（正式＝免登入本機站） |
| NovaStore／拓脈／Nova AI Doc／拓維 | 獨立產品 |

**禁止：** 把「訂閱管家」當 Nova Pass／跨站會員系統。

---

## 2. 會員（NovaOS Account）現況

| 站 | Auth | 可互通 |
|----|------|--------|
| hub ⇄ NovaStore | 同 Supabase project | Cookie **不同網域** → 需各站登入 |
| DocMate | 設計共用 Auth／profiles | 同左 |
| 拓脈／拓維 | 未知 | 不可假設 |
| 訂閱管家 | 無帳號 | 不強制雲端帳號 |

### 可行方案（建議順序）

**A. 短期（低風險，建議先做）**

- 主站會員中心列出五產品＋「已連線／未連線」狀態（hub 側 entitlement）
- 各產品「用 NovaOS 帳號登入」＝同 Email／同 Supabase，**仍各自 session**
- 明確文案：「登入狀態不會自動帶過其他網域」

**B. 中期（真正跨站 session）**

- 中央 Auth 網域（例如 `auth.paycheck.com.de`）＋ OAuth／token 交換
- 或 Supabase custom domain＋同父網域 cookie（需各產品遷到子網域）

**C. 禁止**

- 把不同 project 的 user 表直接 merge／overwrite
- 前端塞假 JWT／共享 localStorage 當 SSO

---

## 3. 方案與價格權威

| 產品 | 價格權威（現行） | 付費路徑 |
|------|------------------|----------|
| NovaStore | 產品站顯示；與 hub 月價對齊 | → hub ECPay |
| 拓脈 | 產品站；年繳公式與 hub 不一致 | 宣稱綠界（未證實） |
| Nova AI Doc | **產品站** FREE／PRO／BUSINESS | → hub ECPay |
| 拓維 | **產品站** Credit／週期 | 宣稱主站綠界 |
| 訂閱管家 | 免費本機 | 無 |
| hub 單模組／全家桶 | hub `CENTRAL_PLANS` | hub ECPay |

**整合建議：** 「付費路徑統一」與「價格統一」分開。路徑可導 hub；價格變更須你授權。

**中央方案表（理想欄位）：** product_id、plan_id、月／年價、trial、usage_limit、billing_cycle、status — 以 hub 後端為 source of truth，子站 **讀取** 而非各自硬編碼（實作需你確認後再改正式價顯示來源）。

---

## 4. 早鳥

目前非單一後端。整合前需你確認：

1. 是否同一活動？  
2. 名額上限是 15 還是 10？  
3. 計數單位是「啟用模組」還是「店家註冊」？

確認前：**標「需人工確認」**，不虛構剩餘名額。

---

## 5. 付款整合

- 現況：hub 為唯一已驗證 ECPay 實作；Store／DocMate 已導流。
- 拓脈／拓維：接 Git 後對齊「checkout 建立 pending → callback 解鎖」。
- Webhook 必須驗 CheckMacValue；權益以 callback 為準。

---

## 6. 訂閱管家雙軌說明

| 軌 | URL／路徑 | 定位 |
|----|-----------|------|
| 正式產品 | temporary-speedy-reef… | 免登入本機 |
| hub 實驗 | `/dashboard/subkeeper` | 可選雲端（需 migration 028／029） |

對外矩陣只推正式產品 URL；勿強制使用者改雲端。
