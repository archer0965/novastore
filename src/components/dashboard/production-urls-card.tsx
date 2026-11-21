"use client";

import { CheckCircle2, ExternalLink } from "lucide-react";
import { PRODUCTION_URL } from "@/lib/site";

const CHECKS = [
  {
    title: "Supabase Auth Site URL",
    detail: PRODUCTION_URL,
    href: "https://supabase.com/dashboard/project/cucxpmvbcakrfxhlvrbd/auth/url-configuration",
    steps: `Site URL 設為 ${PRODUCTION_URL}；Redirect URLs 加入 ${PRODUCTION_URL}/auth/callback（可保留舊 vercel.app 作為過渡）。`,
  },
  {
    title: "LINE Webhook URL",
    detail: `${PRODUCTION_URL}/api/line/webhook`,
    href: "https://developers.line.biz/console/",
    steps:
      "Messaging API → Webhook URL 改成上方網址，開啟 Use webhook。或本機執行 scripts/set-line-webhook.sh。",
  },
] as const;

/** Admin-facing checklist after permanent domain cutover. */
export function ProductionUrlsCard() {
  return (
    <section className="space-y-3 rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm">
      <div>
        <h2 className="font-display text-lg font-semibold">正式網域檢查清單</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          永久網址已鎖定為 {PRODUCTION_URL}。請確認下列外部服務設定已更新。
        </p>
      </div>
      <ul className="space-y-3">
        {CHECKS.map((item) => (
          <li
            key={item.title}
            className="rounded-xl border border-border/70 bg-background/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  {item.title}
                </p>
                <p className="mt-1 break-all font-mono text-xs text-primary">
                  {item.detail}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{item.steps}</p>
              </div>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
              >
                開啟
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
