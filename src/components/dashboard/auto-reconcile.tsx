"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/types/database";
import { cn } from "@/lib/utils";

export function AutoReconcilePanel({
  profile,
  isAdmin = false,
}: {
  profile: Profile;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  // Props retained for dashboard call sites; auto-reconcile is available on all plans.
  void profile;
  void isAdmin;
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!text.trim()) {
      toast.error("請先貼上銀行交易明細文字");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reports/auto-reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json().catch(
        () =>
          ({} as {
            error?: string;
            message?: string;
            matchedCount?: number;
            parsedCount?: number;
            unmatchedParsed?: unknown[];
          })
      );
      if (!res.ok) {
        throw new Error(json.error || "自動勾稽失敗");
      }
      const matchedCount = Number(json.matchedCount) || 0;
      const parsedCount = Number(json.parsedCount) || 0;
      if (matchedCount > 0) {
        toast.success(
          json.message ||
            `末五碼比對相符 ${matchedCount} 筆（解析 ${parsedCount} 筆；≠銀行入帳確認）`
        );
        setText("");
        router.refresh();
      } else {
        toast.message(
          parsedCount
            ? `已解析 ${parsedCount} 筆，但沒有可自動核對的待處理回報`
            : "未解析到可辨識的金額與後五碼，請確認貼上內容"
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "自動勾稽失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      id="auto-reconcile"
      className="space-y-4 rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm md:p-6"
    >
      <div>
        <div className="flex items-center gap-2">
          <ScanSearch className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">
            一鍵末五碼比對
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          全方案標配。從手機銀行 App 複製交易明細貼上，系統會抓取金額與後五碼比對買家回報。比對相符僅表示末五碼／金額吻合，不等於銀行已確認入帳。
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "範例：\n金額：1,280元\n轉入帳號：****83920\n\n可一次貼上多筆交易明細"
          }
          className={cn("min-h-[140px] resize-y font-mono text-sm")}
          disabled={loading}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="h-11 gap-1.5" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            開始自動勾稽
          </Button>
          {text ? (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={loading}
              onClick={() => setText("")}
            >
              清空
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
