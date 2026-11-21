import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { FREE_TRIAL, PLAN_CATALOG } from "@/types/database";

export const metadata: Metadata = {
  title: "服務條款與訂閱退款政策",
  description: "NovaStore 服務條款、訂閱與退款政策說明。",
};

export default function TermsPage() {
  return (
    <article className="prose-legal space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          服務條款
        </h1>
        <p className="text-sm text-muted-foreground">
          最後更新日期：2026 年 3 月 25 日 · 適用於 {siteConfig.legalName}
        </p>
      </header>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-xl font-semibold">1. 服務說明</h2>
        <p>
          「NovaStore」提供賣家建立專屬轉帳回報頁、管理對帳狀態，以及透過
          LINE 接收通知等軟體即服務（SaaS）。您註冊或使用本服務，即表示同意本條款。
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-xl font-semibold">2. 帳號與使用規範</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>您應提供正確之聯絡與店鋪資訊，並妥善保管登入憑證。</li>
          <li>
            不得利用本服務從事詐欺、洗錢、非法商品交易或其他違反中華民國法令之行為。
          </li>
          <li>
            買家透過回報頁提交之資料僅供對應賣家核對轉帳使用；賣家應合法、必要且最小化地處理該等資料。
          </li>
        </ul>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-xl font-semibold">
          3. 訂閱服務與計費
        </h2>
        <p>
          付費方案價目以本站為準；線上付款統一經拓新雲端主站之綠界科技（ECPay）結帳，包含：
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>{FREE_TRIAL.description}。</li>
          <li>
            {PLAN_CATALOG.free.name}：每月{" "}
            {PLAN_CATALOG.free.monthlyQuota}{" "}
            筆站內 ATM 自動對帳額度（NT$0）。
          </li>
          <li>
            {PLAN_CATALOG.starter.name}（主推）：無限筆數站內 ATM
            自動對帳；月繳 NT$
            {PLAN_CATALOG.starter.prices.monthly.total}、年繳 NT$
            {PLAN_CATALOG.starter.prices.yearly.total}。
          </li>
          <li>
            {PLAN_CATALOG.pro.name}：含專業版所有功能，另含多賣場／數據分析與優先支援；月繳
            NT${PLAN_CATALOG.pro.prices.monthly.total}、年繳 NT$
            {PLAN_CATALOG.pro.prices.yearly.total}。
          </li>
          <li>
            付費方案於拓新雲端主站經綠界 ECPay
            結帳，付款成功並回傳確認後即開通對應方案（請使用同一組帳號）。
          </li>
        </ul>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-xl font-semibold">4. 取消續訂與退款政策</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            賣家可隨時於後台（個人設定／訂閱區塊）申請或操作取消付費方案自動續訂。
          </li>
          <li>
            <strong>取消後將於下一個計費週期生效</strong>
            ：當期已付款之週期仍可繼續使用付費權益至該週期結束。
          </li>
          <li>
            除法令另有規定、或因本服務可歸責事由導致無法提供核心功能外，已扣款之當期訂閱費用原則上不予退款。
          </li>
          <li>
            若發生重複扣款、金額錯誤等金流異常，請於 7
            日內透過客服管道提出，我們將協助查明並依綠界與發卡行規範處理。
          </li>
        </ul>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-xl font-semibold">5. 免責與責任限制</h2>
        <p>
          本服務協助對帳流程數位化，但不代替銀行對帳或保證交易真實性。因網路中斷、第三方（含
          LINE、綠界、雲端主機）服務異常、或您提供錯誤資料所致之損害，於法律允許範圍內，我們之責任以您就該事件所支付之最近一期訂閱費用為上限。
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-xl font-semibold">6. 準據法</h2>
        <p>
          本條款以中華民國法律為準據法。因本服務所生爭議，雙方應先誠信協商；協商不成時，以台灣台北地方法院為第一審管轄法院。
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="font-display text-xl font-semibold">7. 聯絡方式</h2>
        <p>
          客服 Email：{" "}
          <a className="text-primary underline" href={`mailto:${siteConfig.supportEmail}`}>
            {siteConfig.supportEmail}
          </a>
        </p>
      </section>
    </article>
  );
}
