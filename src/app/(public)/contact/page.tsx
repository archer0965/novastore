import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "聯絡我們",
  description: "NovaStore 客服聯絡方式。",
};

export default function ContactPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          聯絡我們
        </h1>
        <p className="text-muted-foreground">
          金流、訂閱、對帳功能或個資相關問題，歡迎透過以下管道聯繫。
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-1">
        <a
          href={`mailto:${siteConfig.supportEmail}`}
          className="flex items-start gap-4 rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm transition hover:border-primary/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">客服 Email</p>
            <p className="mt-1 text-sm text-primary">{siteConfig.supportEmail}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              請附上註冊 Email 與問題說明，方便我們加速處理。
            </p>
          </div>
        </a>

        <a
          href={siteConfig.lineOfficialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-4 rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm transition hover:border-primary/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">LINE 官方帳號</p>
            <p className="mt-1 text-sm text-primary">點此加入官方帳號</p>
            <p className="mt-1 text-xs text-muted-foreground">
              適合快速詢問操作與升級相關問題。
            </p>
          </div>
        </a>
      </div>
    </div>
  );
}
