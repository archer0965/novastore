# NovaOS 正式部署檢查清單

**更新：** 2026-11-22（Asia/Taipei）

## 可部署條件（須全部成立）

- [ ] Build 通過  
- [ ] 核心測試通過（或標明未測項目）  
- [ ] 無已知重大未緩解 P0  
- [ ] 環境變數完整（Vercel／本機）  
- [ ] 無未經授權正式資料變更  
- [ ] 無擅自更改正式價格／收費規則  
- [ ] Git commit 可回復  

## 有碼站部署狀態

| 站 | Vercel 專案 | 建議 | 備註 |
|----|-------------|------|------|
| hub | `novaos` → paycheck.com.de | 本輪 build ✅；文案／redirect 後部署 | |
| NovaStore | `novastore` | 本輪 build ✅；`/legal` 後部署 | |
| DocMate | `docmate-ai` | 本輪 build ✅；法律頁後部署 | |
| 拓脈 | `taiwanbiz` | **不可部署碼** | Git Not connected |
| 訂閱管家 | `temporary-speedy-reef-cy4xhhu` | **不可部署碼** | 無 Git |
| 拓維 | `novadimension` | **不可部署碼** | 無 Git |

## 部署前每站檢查

1. `npm ci`／install  
2. `npm run build`  
3. TypeScript／ESLint  
4. 單元／E2E（有則跑）  
5. env：`NEXT_PUBLIC_SUPABASE_*`、server keys、ECPay、AI keys  
6. 確認無 `SERVICE_ROLE` 進 `NEXT_PUBLIC_*`  
7. sitemap／robots／OG／404  
8. DNS／SSL（主站已有）  

## 部署後抽查

- 正式網址 `/`、`/login`、產品矩陣連結  
- 訂閱管家 → temporary-speedy-reef…  
- Nova AI Doc → docmate-ai-one…  
- 升級按鈕仍導 hub Pass（Store／DocMate）  

## 失敗時

- 立刻停止後續站部署  
- `vercel rollback`／前一 Git SHA  
- 記錄於 BUG／TEST 報告  

## 需你處理（我無法代做）

1. Supabase 正式套用 migration **026–029**  
2. 將 taiwanbiz／訂閱管家／novadimension **接上 Git**  
3. 刪除空專案 `vbiz`  
4. 確認早鳥名額規則  
5. 公司統編／金流帳號變更（若需要）  
6. Auth／ECPay redirect 白名單對齊  

## 本輪授權邊界

依你的授權：低風險、build 通過、未改價／未動正式資料 → 可部署有碼站。  
**價格、金鑰、正式資料、不可逆操作 → 必須先問你。**
