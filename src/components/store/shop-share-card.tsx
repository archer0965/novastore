"use client";

import Link from "next/link";
import { ExternalLink, Store } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";

export function ShopShareCard({
  shopUrl,
  shopSlug,
  shopName,
}: {
  shopUrl: string;
  shopSlug: string;
  shopName: string;
}) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,hsl(214_55%_96%),hsl(0_0%_100%))] p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Store className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold">
            我的專屬賣場連結
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            貼到 IG Bio、LINE 或社團，訪客可一次看到 {shopName || "你"}{" "}
            所有上架中的商品。
          </p>
          <code className="mt-3 block overflow-x-auto rounded-xl border border-border/70 bg-white/90 px-3 py-3 text-sm break-all text-foreground">
            {shopUrl}
          </code>
          <p className="mt-2 text-xs text-muted-foreground">
            賣場代碼{" "}
            <span className="font-mono text-foreground">@{shopSlug}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton
              value={shopUrl}
              label="一鍵複製賣場連結"
              size="default"
              className="h-11"
              toastMessage="已複製賣場連結"
            />
            <Button asChild variant="outline" className="h-11 gap-2">
              <Link href={shopUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden />
                預覽賣場
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
