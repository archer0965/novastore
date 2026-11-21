"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl font-semibold">出了一點狀況</h1>
      <p className="mt-3 text-muted-foreground">
        頁面暫時無法載入，請再試一次。若持續發生，請稍後再來或聯絡客服。
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={reset}>
          再試一次
        </Button>
        <Button asChild variant="outline">
          <Link href="/">回首頁</Link>
        </Button>
      </div>
    </div>
  );
}
