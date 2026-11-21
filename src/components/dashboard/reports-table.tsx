"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildContactExternalUrl,
  contactPlatformLabel,
  formatReportClipboard,
} from "@/lib/buyer-contact";
import { formatDateTime, formatTWD } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import type { PaymentReport, ReportStatus } from "@/types/database";

const PAGE_SIZE = 15;

const statusMap: Record<
  ReportStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "待核對",
    className: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  },
  confirmed: {
    label: "已核對",
    className: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  },
  auto_confirmed: {
    label: "✅ 已自動核對",
    className: "bg-sky-100 text-sky-900 hover:bg-sky-100",
  },
  rejected: {
    label: "已拒絕",
    className: "bg-rose-100 text-rose-900 hover:bg-rose-100",
  },
  needs_contact: {
    label: "⚠️ 異常 / 需聯繫",
    className: "bg-orange-100 text-orange-950 hover:bg-orange-100",
  },
};

type FilterKey = "actionable" | "all" | ReportStatus;

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: "actionable", label: "待處理" },
  { id: "pending", label: "待核對" },
  { id: "needs_contact", label: "異常" },
  { id: "confirmed", label: "已核對" },
  { id: "all", label: "全部" },
];

function ContactCell({ report }: { report: PaymentReport }) {
  const platform = contactPlatformLabel(report.contact_platform);
  const handle = report.buyer_contact?.trim();
  if (!handle) {
    return (
      <span className="text-xs text-muted-foreground">未填聯絡方式</span>
    );
  }
  const url = buildContactExternalUrl(report.contact_platform, handle);
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-full items-center gap-1 text-sm font-medium text-primary hover:underline"
        title={`開啟 ${platform}`}
      >
        <span className="truncate">
          {platform} @{handle.replace(/^@/, "")}
        </span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>
    );
  }
  return (
    <span className="text-sm">
      <span className="text-muted-foreground">{platform}：</span>
      {handle}
    </span>
  );
}

export function ReportsTable({
  initialReports = [],
  initialTotal,
}: {
  initialReports?: PaymentReport[];
  initialTotal?: number;
}) {
  const [reports, setReports] = useState<PaymentReport[]>(initialReports);
  const [total, setTotal] = useState(initialTotal ?? initialReports.length);
  const [totalPages, setTotalPages] = useState(
    Math.max(1, Math.ceil((initialTotal ?? initialReports.length) / PAGE_SIZE))
  );
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterKey>("actionable");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const loadRequestId = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 280);
    return () => window.clearTimeout(t);
  }, [query]);

  const load = useCallback(
    async (opts?: { page?: number; filter?: FilterKey; q?: string }) => {
      const nextFilter = opts?.filter ?? filter;
      const nextPage = opts?.page ?? page;
      const nextQ = opts?.q ?? debouncedQuery;
      setLoading(true);
      const requestId = ++loadRequestId.current;
      try {
        const params = new URLSearchParams({
          filter: nextFilter,
          page: String(nextPage),
          pageSize: String(PAGE_SIZE),
        });
        if (nextQ) params.set("q", nextQ);
        const res = await fetch(`/api/reports?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "讀取失敗");
        if (requestId !== loadRequestId.current) return;
        setReports((json.reports || []) as PaymentReport[]);
        setTotal(json.total ?? 0);
        setTotalPages(json.totalPages ?? 1);
      } catch (e) {
        if (requestId !== loadRequestId.current) return;
        toast.error(e instanceof Error ? e.message : "讀取回報失敗");
      } finally {
        if (requestId === loadRequestId.current) setLoading(false);
      }
    },
    [filter, page, debouncedQuery]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
      return;
    }
  }, [filter, debouncedQuery, page]);

  async function updateStatus(id: string, status: ReportStatus) {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/reports/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "更新失敗");
      toast.success(
        status === "confirmed" || status === "auto_confirmed"
          ? "已標記為已核對"
          : status === "needs_contact"
            ? "已標記為異常／需聯繫"
            : status === "pending"
              ? "已改回待核對"
              : "已標記為拒絕"
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "更新失敗");
    } finally {
      setLoadingId(null);
    }
  }

  async function copyReport(report: PaymentReport) {
    const text = formatReportClipboard(report);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已複製整筆回報資訊");
    } catch {
      toast.error("無法複製，請手動選取");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="回報篩選"
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={
                  active
                    ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                    : "rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋姓名、聯絡、末五碼、銀行…"
            className="h-10 pl-9"
            aria-label="搜尋回報"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          共 {total} 筆
          {debouncedQuery ? ` · 「${debouncedQuery}」` : ""}
          {loading ? " · 載入中…" : ""}
        </span>
        <span>
          第 {page} / {totalPages} 頁
        </span>
      </div>

      {reports.length === 0 && !loading ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <p className="font-display text-lg font-semibold">
            {debouncedQuery || filter !== "all" ? "沒有符合的回報" : "尚無對帳回報"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {debouncedQuery || filter !== "all"
              ? "試試其他關鍵字或篩選條件。"
              : "分享你的專屬回報網址後，買家提交的紀錄會出現在這裡。"}
          </p>
        </div>
      ) : null}

      {loading && reports.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          載入回報中…
        </div>
      ) : null}

      {/* Mobile cards */}
      <div className={cn("space-y-3 md:hidden", loading && "opacity-70")}>
        {reports.map((r) => (
          <article
            key={r.id}
            className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.buyer_name}</p>
                <div className="mt-1">
                  <ContactCell report={r} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDateTime(r.created_at)}
                </p>
              </div>
              <Badge
                className={
                  (statusMap[r.status] ?? statusMap.pending).className
                }
              >
                {(statusMap[r.status] ?? statusMap.pending).label}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-lg bg-secondary/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">金額</p>
                <p className="font-semibold tabular-nums">{formatTWD(r.amount)}</p>
              </div>
              <div className="rounded-lg bg-secondary/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">末五碼</p>
                <p className="font-mono font-semibold tracking-wider">
                  {r.bank_last_five}
                </p>
              </div>
              <div className="rounded-lg bg-secondary/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">轉帳銀行</p>
                <p className="truncate font-medium">
                  {r.transfer_bank || "—"}
                </p>
              </div>
            </div>
            {r.note ? (
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                {r.note}
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                size="default"
                variant="outline"
                disabled={
                  loadingId === r.id ||
                  r.status === "confirmed" ||
                  r.status === "auto_confirmed"
                }
                onClick={() => updateStatus(r.id, "confirmed")}
                className="h-11 gap-1"
              >
                <Check className="h-4 w-4" />
                已核對
              </Button>
              <Button
                size="default"
                variant="outline"
                disabled={
                  loadingId === r.id || r.status === "needs_contact"
                }
                onClick={() => updateStatus(r.id, "needs_contact")}
                className="h-11 gap-1 border-orange-200 text-orange-900 hover:bg-orange-50"
              >
                <AlertTriangle className="h-4 w-4" />
                異常／需聯繫
              </Button>
              <Button
                size="default"
                variant="ghost"
                disabled={loadingId === r.id || r.status === "rejected"}
                onClick={() => updateStatus(r.id, "rejected")}
                className="h-11 gap-1 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
                拒絕
              </Button>
              <Button
                size="default"
                variant="secondary"
                onClick={() => copyReport(r)}
                className="h-11 gap-1"
              >
                <Copy className="h-4 w-4" />
                複製回報
              </Button>
            </div>
          </article>
        ))}
      </div>

      {/* Desktop table */}
      <div
        className={cn(
          "hidden overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-sm md:block",
          loading && "opacity-70"
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">買家／聯絡</th>
                <th className="px-4 py-3 font-medium">金額</th>
                <th className="px-4 py-3 font-medium">轉帳銀行</th>
                <th className="px-4 py-3 font-medium">帳號末五碼</th>
                <th className="px-4 py-3 font-medium">時間</th>
                <th className="px-4 py-3 font-medium">狀態</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.buyer_name}</div>
                    <div className="mt-0.5">
                      <ContactCell report={r} />
                    </div>
                    {r.note ? (
                      <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {r.note}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {formatTWD(r.amount)}
                  </td>
                  <td className="px-4 py-3">{r.transfer_bank || "—"}</td>
                  <td className="px-4 py-3 font-mono tracking-wider">
                    {r.bank_last_five}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formatDateTime(r.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        (statusMap[r.status] ?? statusMap.pending).className
                      }
                    >
                      {(statusMap[r.status] ?? statusMap.pending).label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          loadingId === r.id ||
                          r.status === "confirmed" ||
                          r.status === "auto_confirmed"
                        }
                        onClick={() => updateStatus(r.id, "confirmed")}
                        className="gap-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        已核對
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          loadingId === r.id || r.status === "needs_contact"
                        }
                        onClick={() => updateStatus(r.id, "needs_contact")}
                        className="gap-1 border-orange-200 text-orange-900 hover:bg-orange-50"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        異常
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={
                          loadingId === r.id || r.status === "rejected"
                        }
                        onClick={() => updateStatus(r.id, "rejected")}
                        className="gap-1 text-destructive hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                        拒絕
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyReport(r)}
                        className="gap-1"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        複製
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            上一頁
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="gap-1"
          >
            下一頁
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
