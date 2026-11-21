"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatTWD } from "@/lib/utils-format";
import type { SellerOrderListItem } from "@/lib/store";

/** Dedicated pending-reconcile desk highlighting 末五碼 / amount / order id. */
export function PendingReconcileDesk({
  orders,
}: {
  orders: SellerOrderListItem[];
}) {
  const router = useRouter();
  const pending = orders.filter((o) => o.payment_status === "pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!pending.length) {
    return (
      <section className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-emerald-600" />
          <h2 className="font-display text-lg font-semibold">對帳工作台</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          目前沒有待對帳訂單。匯款回報與商店訂單核對完成後會顯示於此。
        </p>
        <Button asChild variant="outline" className="mt-3" size="sm">
          <Link href="/dashboard/orders?focus=pending">查看全部訂單</Link>
        </Button>
      </section>
    );
  }

  async function confirm(orderId: string) {
    setBusyId(orderId);
    try {
      const res = await fetch(`/api/store/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: "matched" }),
      });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) throw new Error(json.error || "對帳失敗");
      toast.success("已一鍵確認對帳");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "對帳失敗");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-card to-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-amber-700" />
            <h2 className="font-display text-lg font-semibold">待對帳列表</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            醒目顯示末五碼、金額與訂單編號，支援一鍵勾稽確認。
          </p>
        </div>
        <p className="text-sm font-semibold text-amber-900">
          {pending.length} 筆待處理
        </p>
      </div>

      <ul className="mt-4 space-y-2">
        {pending.slice(0, 12).map((order) => (
          <li
            key={order.id}
            className="flex flex-col gap-3 rounded-xl border border-amber-200/70 bg-white/90 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{order.buyer_name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {order.product_title}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-amber-100 px-2 py-1 font-mono font-semibold text-amber-950">
                  末五碼 {order.atm_last5 || "—"}
                </span>
                <span className="rounded-lg bg-slate-100 px-2 py-1 font-semibold tabular-nums text-slate-900">
                  {formatTWD(order.total_amount)}
                </span>
                <span className="rounded-lg bg-slate-50 px-2 py-1 font-mono text-slate-600">
                  訂單 {order.id.slice(0, 10)}…
                </span>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0 bg-emerald-700 hover:bg-emerald-800"
              disabled={busyId === order.id}
              onClick={() => void confirm(order.id)}
            >
              <Check className="h-4 w-4" />
              一鍵確認對帳
            </Button>
          </li>
        ))}
      </ul>

      {pending.length > 12 ? (
        <Button asChild variant="link" className="mt-2 px-0">
          <Link href="/dashboard/orders">查看其餘 {pending.length - 12} 筆</Link>
        </Button>
      ) : null}
    </section>
  );
}
