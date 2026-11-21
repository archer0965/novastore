"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  Banknote,
  ClipboardPenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/copy-button";
import {
  CONTACT_PLATFORMS,
  TRANSFER_BANKS,
  normalizeContactHandle,
} from "@/lib/buyer-contact";
import type { ContactPlatform, ShopPublic } from "@/types/database";
import { cn } from "@/lib/utils";

export function BuyerReportForm({
  shop,
  quotaFull = false,
  initial,
}: {
  shop: ShopPublic;
  quotaFull?: boolean;
  /** Prefill from checkout handoff (?amount&last5&name&order) */
  initial?: {
    buyer_name?: string;
    amount?: string;
    bank_last_five?: string;
    note?: string;
    order_id?: string;
  };
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inFlight = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    buyer_name: initial?.buyer_name || "",
    contact_platform: "ig" as ContactPlatform,
    buyer_contact: "",
    transfer_bank: "",
    transfer_bank_other: "",
    amount: initial?.amount || "",
    bank_last_five: initial?.bank_last_five || "",
    note:
      initial?.note ||
      (initial?.order_id ? `訂單編號 ${initial.order_id}` : ""),
  });

  const lastFiveReady = form.bank_last_five.length === 5;
  const contactReady = normalizeContactHandle(form.buyer_contact).length >= 2;
  const bankReady =
    form.transfer_bank === "其他"
      ? form.transfer_bank_other.trim().length >= 1
      : form.transfer_bank.trim().length >= 1;
  const canSubmit =
    !quotaFull &&
    !submitting &&
    !!form.buyer_name.trim() &&
    contactReady &&
    bankReady &&
    Number(form.amount) > 0 &&
    lastFiveReady;

  useEffect(() => {
    if (success) {
      successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [success]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quotaFull || submitting || inFlight.current || success || !canSubmit) {
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setError(null);

    const transferBank =
      form.transfer_bank === "其他"
        ? form.transfer_bank_other.trim()
        : form.transfer_bank.trim();

    try {
      const res = await fetch("/api/report/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_id: shop.id,
          buyer_name: form.buyer_name,
          contact_platform: form.contact_platform,
          buyer_contact: normalizeContactHandle(form.buyer_contact),
          transfer_bank: transferBank,
          amount: form.amount,
          bank_last_five: form.bank_last_five,
          note: form.note || null,
        }),
      });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) throw new Error(json.error || "提交失敗");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失敗");
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const platformMeta =
    CONTACT_PLATFORMS.find((p) => p.id === form.contact_platform) ||
    CONTACT_PLATFORMS[0];

  if (success) {
    return (
      <div ref={successRef} className="animate-fade-up space-y-4 pb-8">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/95 p-6 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h2 className="mt-4 font-display text-2xl font-semibold text-emerald-950">
            回報成功
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900/85">
            已自動通知賣家對帳，請留意出貨或私訊通知。
            <br />
            你可以關閉此頁面了。
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          為保護個資，本頁不會顯示任何歷史對帳紀錄。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 sm:pb-8">
      <ol className="grid grid-cols-2 gap-2 text-xs">
        <li className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
          <Banknote className="h-4 w-4 shrink-0 text-primary" />
          <span>
            <span className="font-medium text-foreground">1. 轉帳</span>
            <span className="mt-0.5 block text-muted-foreground">複製帳戶匯款</span>
          </span>
        </li>
        <li className="flex items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2.5">
          <ClipboardPenLine className="h-4 w-4 shrink-0 text-primary" />
          <span>
            <span className="font-medium text-foreground">2. 回報</span>
            <span className="mt-0.5 block text-muted-foreground">填末五碼送出</span>
          </span>
        </li>
      </ol>

      <section className="rounded-2xl border border-border/80 bg-card/95 p-4 shadow-sm sm:p-5">
        <p className="text-sm text-muted-foreground">轉帳至</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
          {shop.shop_name || "賣家店鋪"}
        </h1>
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/70 px-3 py-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">銀行代碼</p>
              <p className="font-mono text-xl font-semibold tracking-wide">
                {shop.bank_code || "—"}
              </p>
            </div>
            {shop.bank_code ? (
              <CopyButton
                value={shop.bank_code}
                label="複製"
                size="default"
                className="h-11 shrink-0 px-4"
                toastMessage="已複製銀行代碼"
              />
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/70 px-3 py-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">銀行帳號</p>
              <p className="break-all font-mono text-lg font-semibold tracking-wide sm:text-xl">
                {shop.bank_account || "—"}
              </p>
            </div>
            {shop.bank_account ? (
              <CopyButton
                value={shop.bank_account}
                label="複製"
                size="default"
                className="h-11 shrink-0 px-4"
                toastMessage="已複製銀行帳號"
              />
            ) : null}
          </div>
        </div>
      </section>

      {quotaFull ? (
        <div
          role="alert"
          className="animate-fade-up rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm sm:p-5"
        >
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-medium text-amber-950">
                該賣家本月訂單額度已滿，已自動通知賣家處理。
              </p>
              <p className="mt-2 text-sm text-amber-900/90">
                若需急迫對帳，請直接私訊賣家，謝謝！
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <form
        id="buyer-report-form"
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-sm sm:p-5"
      >
        <div>
          <h2 className="font-display text-lg font-semibold">填寫轉帳回報</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            轉帳完成後再填寫。聯絡方式與轉帳銀行為必填，方便賣家對帳與聯繫。
          </p>
        </div>

        <fieldset disabled={quotaFull || submitting} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="buyer_name">買家姓名</Label>
            <Input
              id="buyer_name"
              required
              autoComplete="name"
              enterKeyHint="next"
              className="h-12"
              value={form.buyer_name}
              onChange={(e) => setForm({ ...form, buyer_name: e.target.value })}
              placeholder="方便賣家對應訂單"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="buyer_contact">
              買家聯絡方式<span className="text-destructive">＊</span>
            </Label>
            <div className="grid gap-2 sm:grid-cols-[9.5rem_1fr]">
              <select
                id="contact_platform"
                aria-label="聯絡平台"
                className="h-12 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                value={form.contact_platform}
                onChange={(e) =>
                  setForm({
                    ...form,
                    contact_platform: e.target.value as ContactPlatform,
                  })
                }
              >
                {CONTACT_PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <Input
                id="buyer_contact"
                required
                enterKeyHint="next"
                className="h-12"
                value={form.buyer_contact}
                onChange={(e) =>
                  setForm({ ...form, buyer_contact: e.target.value })
                }
                placeholder={platformMeta.placeholder}
                autoComplete="username"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              必填，避免只留姓名找不到人。請填可私訊的 IG／Threads／LINE。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer_bank">
              轉帳銀行<span className="text-destructive">＊</span>
            </Label>
            <select
              id="transfer_bank"
              required
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              value={form.transfer_bank}
              onChange={(e) =>
                setForm({ ...form, transfer_bank: e.target.value })
              }
            >
              <option value="" disabled>
                請選擇你轉帳的銀行
              </option>
              {TRANSFER_BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
            {form.transfer_bank === "其他" ? (
              <Input
                id="transfer_bank_other"
                required
                className="h-12"
                value={form.transfer_bank_other}
                onChange={(e) =>
                  setForm({ ...form, transfer_bank_other: e.target.value })
                }
                placeholder="請輸入銀行名稱"
              />
            ) : null}
            <p className="text-xs text-muted-foreground">
              方便賣家對照銀行 App 入帳明細。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">轉帳金額</Label>
            <Input
              id="amount"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              enterKeyHint="next"
              className="h-12 text-lg tabular-nums"
              value={form.amount}
              onChange={(e) =>
                setForm({
                  ...form,
                  amount: e.target.value.replace(/\D/g, ""),
                })
              }
              placeholder="例如：1280"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="bank_last_five">轉帳帳號後 5 碼</Label>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  lastFiveReady ? "text-primary" : "text-muted-foreground"
                )}
              >
                {form.bank_last_five.length}/5
              </span>
            </div>
            <Input
              id="bank_last_five"
              required
              maxLength={5}
              pattern="\d{5}"
              inputMode="numeric"
              autoComplete="one-time-code"
              enterKeyHint="done"
              className="h-14 text-center font-mono text-2xl tracking-[0.35em]"
              value={form.bank_last_five}
              onChange={(e) =>
                setForm({
                  ...form,
                  bank_last_five: e.target.value.replace(/\D/g, "").slice(0, 5),
                })
              }
              placeholder="•••••"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">備註（選填）</Label>
            <Textarea
              id="note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="訂單編號、商品名稱等"
              rows={2}
              className="min-h-[72px] text-base"
            />
          </div>
        </fieldset>

        {error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="hidden h-12 w-full gap-2 text-base sm:inline-flex"
          disabled={!canSubmit}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? "提交中…" : "提交對帳回報"}
        </Button>

        <p className="hidden items-start gap-1.5 text-xs leading-relaxed text-muted-foreground sm:flex">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          本表單資料經 SSL 加密傳輸，僅供賣家對帳使用。
        </p>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:hidden">
        <Button
          type="submit"
          form="buyer-report-form"
          className="h-12 w-full gap-2 text-base"
          disabled={!canSubmit}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? "提交中…" : "提交對帳回報"}
        </Button>
        <p className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" />
          SSL 加密 · 僅供賣家對帳
        </p>
      </div>
    </div>
  );
}
