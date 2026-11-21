import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "退款說明",
  description: "NovaStore 退款與訂閱權益說明（對齊拓新雲端主站）。",
};

export default function RefundPage() {
  return (
    <article className="prose-legal space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          退款說明
        </h1>
        <p className="text-sm text-muted-foreground">
          NovaStore 付費方案之退款、取消與續費規則，以拓新雲端主站為權威來源。
        </p>
      </header>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
        <li>付款成功後，權益由主站後端回調更新，不以前端顯示為準。</li>
        <li>取消訂閱可至主站「訂閱中控」申請；定期定額另需停止綠界扣款。</li>
        <li>詳細條款與退款條件請見主站退款頁。</li>
      </ul>
      <p className="text-sm">
        <a
          href="https://paycheck.com.de/refund"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary underline-offset-2 hover:underline"
        >
          開啟主站退款說明 →
        </a>
      </p>
      <p className="text-sm text-muted-foreground">
        客服：{" "}
        <a
          href={siteConfig.lineOfficialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          LINE @469uykad
        </a>
        {" · "}
        <Link href="/legal" className="underline-offset-2 hover:underline">
          法律資訊
        </Link>
      </p>
    </article>
  );
}
