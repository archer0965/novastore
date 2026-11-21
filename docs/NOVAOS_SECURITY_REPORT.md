# NovaOS Security Report

**更新：** 2026-11-22（Asia/Taipei）

## 總覽

| 嚴重度 | 項目 | 狀態 |
|--------|------|------|
| P0 | profiles 計費欄位 client 可寫 | 程式＋migration 026 就緒；**正式 DB 待套用** |
| P0 | 付款前解鎖 | 已修 |
| P1 | AI／ECPay 金鑰前端暴露 | 有碼站抽查：未見 NEXT_PUBLIC SERVICE_ROLE／金鑰硬編碼 |
| P1 | 跨站 IDOR | NovaStore／hub 有 RLS 與 owner 檢查；拓脈／拓維無碼無法驗證 |
| P2 | 無碼站金流 webhook 驗證 | 未知 |
| P2 | 訂閱管家 localStorage XSS 風險 | 本機工具固有風險；勿存敏感金流資料 |

## 有碼站檢查結果

### hub（paycheck-tw）

- ECPay CheckMacValue 驗證：有
- TradeNo／MerchantTradeNo dedupe：有
- Checkout 僅建立 pending order，不解鎖：有
- `createAdminClient` 僅 server：有
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE`：未發現
- RLS：多數業務表；migration 026 收緊 profiles 計費欄

### NovaStore

- 訂單／商品依 `user_id`／store owner：有 intentional 隔離
- ATM 末五碼 ≠ 銀行入帳：文件與 UI 應持續標示
- 升級導向 hub：減少本站自管金流攻擊面

### DocMate

- Gemini key：server-only（`.env.example` 註明）
- 文件所有權：依 user／profile
- 額度扣除：需持續確認「失敗不扣／重試不重複扣」（有碼可後續單測）

### 無碼站（拓脈／訂閱管家／拓維）

- **無法做 RLS／webhook／檔案上傳安全碼審**
- 線上僅能確認公開路由與文案
- 建議：接 Git 後立刻重跑本報告

## 建議（未擅自執行）

1. 正式套用 migration 026（及 027–029 若要用 hub 訂閱管家雲端實驗）
2. 定期 `npm audit`；重大 CVE 再升版
3. ECPay／Auth redirect URL 清單對齊正式網域
4. 勿在日誌印出 token、卡號、CheckMacValue 原文

## 本輪未做之危險測試

- 未對正式用戶寫入假訂單／假預約
- 未直連正式 DB 改資料
- 未更換金流／API Key
