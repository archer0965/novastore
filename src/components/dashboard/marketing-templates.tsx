"use client";

import { MessageCircle, Share2 } from "lucide-react";
import { CopyButton } from "@/components/copy-button";

export function MarketingTemplates({ shareUrl }: { shareUrl: string }) {
  const igBio = `轉帳後請點此回報末五碼👉 ${shareUrl}`;
  const lineAutoReply = `感謝購買！請點擊連結填寫轉帳後五碼：${shareUrl}`;

  return (
    <section className="rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm">
      <div>
        <h2 className="font-display text-lg font-semibold">賣家爆款社群範本</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          一鍵複製到 IG 簡介或 LINE 官方帳號自動回覆，加速冷啟動成交對帳。
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-xl bg-secondary/50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Share2 className="h-4 w-4 text-primary" />
            IG 簡介文字
          </div>
          <p className="mt-3 whitespace-pre-wrap break-all text-sm leading-relaxed">
            {igBio}
          </p>
          <div className="mt-3">
            <CopyButton
              value={igBio}
              label="一鍵複製 IG 簡介"
              toastMessage="已複製 IG 簡介文字"
            />
          </div>
        </div>

        <div className="rounded-xl bg-secondary/50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageCircle className="h-4 w-4 text-primary" />
            LINE 官方帳號自動回覆範本
          </div>
          <p className="mt-3 whitespace-pre-wrap break-all text-sm leading-relaxed">
            {lineAutoReply}
          </p>
          <div className="mt-3">
            <CopyButton
              value={lineAutoReply}
              label="一鍵複製 LINE 回覆"
              toastMessage="已複製 LINE 自動回覆範本"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
