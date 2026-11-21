import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "隱私權政策",
  description:
    "NovaStore 隱私權政策，說明依台灣個人資料保護法之資料蒐集與使用方式。",
};

export default function PrivacyPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          隱私權政策
        </h1>
        <p className="text-sm text-muted-foreground">
          本政策依據中華民國《個人資料保護法》及相關法令訂定，適用於{" "}
          {siteConfig.legalName}。
        </p>
      </header>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-xl font-semibold">1. 蒐集之個人資料類別</h2>
        <p>視您使用情境，我們可能蒐集：</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>賣家帳號資料</strong>
            ：Email、店名、銀行代碼／帳號、LINE User ID、訂閱方案與使用量。
          </li>
          <li>
            <strong>買家對帳回報資料</strong>
            ：姓名或 LINE 稱呼、轉帳金額、轉帳帳號後五碼、選填備註。
          </li>
          <li>
            <strong>金流相關資料</strong>
            ：由綠界科技處理之付款結果與訂單編號（我們不儲存完整信用卡卡號）。
          </li>
          <li>
            <strong>技術紀錄</strong>：必要之伺服器日誌、裝置／瀏覽器資訊，用於資安與除錯。
          </li>
        </ul>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-xl font-semibold">2. 蒐集目的與使用方式</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            買家提交之<strong>姓名、金額、轉帳後五碼</strong>
            等資料，<strong>僅供對應賣家核對轉帳／出貨</strong>
            ，不會用於行銷分析以外之目的，亦不會建立買家公開目錄。
          </li>
          <li>賣家資料用於提供控制台、額度控管、LINE 通知與客戶支援。</li>
          <li>付款資料用於完成 Pro 訂閱請款、對帳與法令要求之保存。</li>
        </ul>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-xl font-semibold">3. 資料保存、安全與加密</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            傳輸過程採用 SSL／TLS 加密；資料庫由受信任之雲端服務（如 Supabase）託管，並啟用存取控制與
            Row Level Security。
          </li>
          <li>
            買家無法查閱其他買家或該賣家之歷史對帳紀錄；僅該賣家本人之帳號可讀取自己的回報列表。
          </li>
          <li>
            我們<strong>絕不對外販售</strong>
            您的個人資料。除法令要求、金流／託管必要之處理者（如綠界、雲端基礎設施、LINE
            Messaging API）外，不會提供予無關第三方。
          </li>
        </ul>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-xl font-semibold">4. 當事人權利</h2>
        <p>
          依個資法，您得就其個人資料行使查詢、閱覽、製給複製本、補充更正、請求停止蒐集／處理／利用或刪除等權利。請以
          Email 聯絡：{" "}
          <a className="text-primary underline" href={`mailto:${siteConfig.supportEmail}`}>
            {siteConfig.supportEmail}
          </a>
          。我們將於合理期間內回覆（原則上 15 日內，必要時得延長並告知原因）。
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-xl font-semibold">5. Cookie 與類似技術</h2>
        <p>
          本服務使用登入工作階段（Session）Cookie
          以維持賣家登入狀態。我們不使用第三方廣告追蹤 Cookie；若未來有變更將更新本政策。
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-xl font-semibold">6. 政策更新</h2>
        <p>
          我們得視法規或服務調整更新本政策，並於本頁公告生效。重大變更時，將以站內或 Email
          合理方式通知賣家用戶。
        </p>
      </section>
    </article>
  );
}
