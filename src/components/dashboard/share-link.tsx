"use client";

import { Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";

export function ShareLink({ url }: { url: string }) {
  async function nativeShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "轉帳後請點此回報末五碼",
          text: "轉帳完成後請點連結回報帳號末五碼，方便賣家核對後出貨。",
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("已複製網址（此裝置不支援系統分享）");
    } catch (err) {
      // user cancelled share — ignore
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error("分享失敗，請改用複製網址");
    }
  }

  return (
    <section
      id="share-link"
      className="scroll-mt-24 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link2 className="h-4 w-4" />
        賣家專屬回報網址
      </div>
      <div className="mt-3 flex flex-col gap-2.5">
        <code className="block overflow-x-auto rounded-xl bg-secondary/70 px-3 py-3 text-sm break-all">
          {url}
        </code>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <CopyButton
            value={url}
            label="複製網址"
            size="default"
            className="h-11 w-full sm:w-auto"
            toastMessage="已複製回報網址，可貼給買家"
          />
          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full gap-1.5 sm:w-auto"
            onClick={nativeShare}
          >
            <Share2 className="h-4 w-4" />
            分享給買家
          </Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        放到 IG 簡介、限動連結或 LINE 自動回覆；所有買家共用這一個網址。
      </p>
    </section>
  );
}
