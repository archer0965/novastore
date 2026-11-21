"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, Store, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatExpiresAtTaipei } from "@/lib/subscription";
import type { PartnerStoreListItem } from "@/lib/early-bird";
import {
  getPlanDisplayName,
  normalizePlan,
} from "@/types/database";

type PartnerState = {
  used: number;
  trialDays: number;
  cycleMultipliers: {
    monthly: number;
    half_yearly: number;
    yearly: number;
  };
  label: string;
  description?: string;
  seats: PartnerStoreListItem[];
};

export function AdminEarlyBirdPanel() {
  const [data, setData] = useState<PartnerState | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/admin/early-bird", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "載入失敗");
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "載入失敗");
      }
    });
  }

  useEffect(() => {
    load();
  }, []);

  function assign() {
    const target = email.trim();
    if (!target) {
      toast.error("請輸入客戶信箱");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/early-bird", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: target, action: "assign" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "開通失敗");
        toast.success(json.message || "已開通特約店家，優惠已生效");
        setEmail("");
        load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "開通失敗");
      }
    });
  }

  function revoke(targetEmail: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`確定取消 ${targetEmail} 的特約店家資格？`)) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/early-bird", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: targetEmail, action: "revoke" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "取消失敗");
        toast.success(json.message || "已取消");
        load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "取消失敗");
      }
    });
  }

  return (
    <section
      id="partners"
      className="scroll-mt-20 space-y-5 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-card via-card to-amber-500/[0.06] p-5 shadow-sm md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
            <Store className="h-4 w-4" />
            特約店家
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold">
            特約店家管理
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            輸入已註冊客戶 Email 立即開通：{data?.trialDays ?? 14}{" "}
            天全功能試用＋終身月繳 8 折／半年 75 折／年繳 7 折。點列可看詳情以便活動聯繫。
          </p>
        </div>
        <div className="rounded-xl border bg-background/80 px-4 py-2 text-right">
          <p className="text-xs text-muted-foreground">已開通</p>
          <p className="font-display text-2xl font-semibold tabular-nums">
            {data ? `${data.used} 家` : "—"}
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          placeholder="客戶註冊信箱，例如 buyer@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") assign();
          }}
          disabled={pending}
        />
        <Button
          type="button"
          onClick={assign}
          disabled={pending}
          className="shrink-0"
        >
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          加入特約店家
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">店家</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">
                方案
              </th>
              <th className="hidden px-3 py-2 font-medium md:table-cell">
                試用至
              </th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {(data?.seats || []).length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  尚無特約店家 — 上方輸入 Email 即可加入
                </td>
              </tr>
            ) : (
              data?.seats.map((seat) => (
                <tr key={seat.id} className="border-t hover:bg-secondary/30">
                  <td className="px-3 py-2">
                    <Link
                      href={`/dashboard/admin/partners/${seat.id}`}
                      className="group block"
                    >
                      <span className="font-medium text-foreground group-hover:text-primary">
                        {seat.shop_name?.trim() || "未命名店家"}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {seat.email || "—"}
                        {seat.line_user_id ? " · 已綁 LINE" : ""}
                      </span>
                    </Link>
                  </td>
                  <td className="hidden px-3 py-2 sm:table-cell">
                    {getPlanDisplayName(normalizePlan(seat.plan_type))}
                  </td>
                  <td className="hidden px-3 py-2 tabular-nums md:table-cell">
                    {formatExpiresAtTaipei(seat.trial_ends_at)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-2">
                      {seat.email ? (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
                          disabled={pending}
                          onClick={(e) => revoke(seat.email!, e)}
                        >
                          取消
                        </button>
                      ) : null}
                      <Link
                        href={`/dashboard/admin/partners/${seat.id}`}
                        className="inline-flex items-center text-xs font-medium text-primary"
                        aria-label="查看詳情"
                      >
                        詳情
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
