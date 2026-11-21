import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "法律資訊",
  description: "NovaStore 法律資訊入口。",
};

export default function LegalIndexPage() {
  return (
    <article className="prose-legal space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          法律資訊
        </h1>
        <p className="text-sm text-muted-foreground">
          適用於 {siteConfig.legalName}。生態系統一文件請見拓新雲端主站。
        </p>
      </header>
      <ul className="space-y-3 text-sm">
        <li>
          <Link
            href="/terms"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            服務條款與訂閱退款政策
          </Link>
        </li>
        <li>
          <Link
            href="/privacy"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            隱私權政策
          </Link>
        </li>
        <li>
          <a
            href="https://paycheck.com.de/legal"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            NovaOS 法律中心（總站）
          </a>
        </li>
      </ul>
    </article>
  );
}
