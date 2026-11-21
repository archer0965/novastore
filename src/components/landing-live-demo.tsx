"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Package,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Step = "shop" | "checkout" | "pay" | "line";

const COLORS = ["黑", "白", "藍"] as const;
const SIZES = ["S", "M", "L"] as const;

/** Interactive demo: storefront pick → CVS checkout → last-5 → LINE notify. */
export function LandingLiveDemo() {
  const [step, setStep] = useState<Step>("shop");
  const [color, setColor] = useState<(typeof COLORS)[number]>("黑");
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");
  const [storeBrand, setStoreBrand] = useState<"7-11" | "全家">("7-11");
  const [storeCode, setStoreCode] = useState("123456");
  const [storeName, setStoreName] = useState("台北站前門市");
  const [digits, setDigits] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const steps = useMemo(
    () =>
      [
        { id: "shop" as const, label: "1 選購" },
        { id: "checkout" as const, label: "2 超商取貨" },
        { id: "pay" as const, label: "3 回報末五碼" },
        { id: "line" as const, label: "4 LINE 通知" },
      ] as const,
    []
  );

  function goCheckout() {
    setStep("checkout");
  }

  function goPay(e: FormEvent) {
    e.preventDefault();
    if (!storeCode.trim() || !storeName.trim()) return;
    setStep("pay");
  }

  function submitPay(e: FormEvent) {
    e.preventDefault();
    const value = digits.replace(/\D/g, "").slice(0, 5);
    if (value.length < 4) return;
    setSubmitted(value);
    setStep("line");
  }

  function reset() {
    setStep("shop");
    setColor("黑");
    setSize("M");
    setStoreBrand("7-11");
    setStoreCode("123456");
    setStoreName("台北站前門市");
    setDigits("");
    setSubmitted(null);
  }

  return (
    <section
      id="live-demo"
      className="relative z-10 scroll-mt-24 overflow-hidden py-16 md:py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,hsl(210_45%_94%),transparent_55%)]" />

      <div className="relative mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">點擊體驗 · Live Demo</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            3 秒體驗完整開店收單流程
          </h2>
          <p className="mt-3 text-muted-foreground">
            模擬買家在獨立賣場選規格、填超商取貨、送出訂單，再回報末五碼——賣家
            LINE 立刻收到通知。
          </p>
        </div>

        <ol className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-2">
          {steps.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (s.id === "line" && !submitted) return;
                  setStep(s.id);
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  step === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {s.label}
              </button>
              {i < steps.length - 1 ? (
                <ChevronRight
                  className="h-3.5 w-3.5 text-muted-foreground/50"
                  aria-hidden
                />
              ) : null}
            </li>
          ))}
        </ol>

        <div className="mx-auto mt-10 grid max-w-5xl gap-8 md:grid-cols-2 md:items-start md:gap-10">
          <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm md:p-8">
            {step === "shop" ? (
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                  模擬獨立賣場 · /shop/demo
                </p>
                <p className="mt-1 font-display text-lg font-semibold">
                  日系寬褲 · 開團中
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  NT$ 499 · 團購達標進度 18 / 30
                </p>

                <div className="mt-6">
                  <p className="text-xs font-medium text-muted-foreground">顏色</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                          color === c
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-secondary"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground">尺寸</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SIZES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                          size === s
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-secondary"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="mt-6 h-11 w-full"
                  onClick={goCheckout}
                >
                  <Package className="mr-2 h-4 w-4" aria-hidden />
                  加入訂單 · {color} / {size}
                </Button>
              </div>
            ) : null}

            {step === "checkout" ? (
              <form onSubmit={goPay}>
                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                  結帳 · 超商取貨
                </p>
                <p className="mt-1 font-display text-lg font-semibold">
                  {color} / {size} × 1 · NT$ 499
                </p>

                <div className="mt-6">
                  <p className="text-xs font-medium text-muted-foreground">
                    取貨超商
                  </p>
                  <div className="mt-2 flex gap-2">
                    {(["7-11", "全家"] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setStoreBrand(b)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm font-medium",
                          storeBrand === b
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-secondary"
                        )}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="mt-4 block text-xs font-medium text-muted-foreground">
                  店號
                  <input
                    value={storeCode}
                    onChange={(e) => setStoreCode(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="mt-3 block text-xs font-medium text-muted-foreground">
                  門市名稱
                  <input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={() => setStep("shop")}
                  >
                    上一步
                  </Button>
                  <Button type="submit" className="h-11 flex-1">
                    <MapPin className="mr-2 h-4 w-4" aria-hidden />
                    送出訂單
                  </Button>
                </div>
              </form>
            ) : null}

            {step === "pay" || step === "line" ? (
              <form onSubmit={submitPay}>
                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                  匯款回報 · 自動對帳
                </p>
                <p className="mt-1 font-display text-lg font-semibold">示範小舖</p>
                <div className="mt-4 rounded-xl border border-border bg-secondary/40 px-3 py-3 text-sm">
                  <p className="font-semibold tabular-nums">應匯 NT$ 499</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {color}/{size} · {storeBrand} {storeName}（{storeCode}）
                  </p>
                </div>

                <label
                  htmlFor="live-demo-digits"
                  className="mt-4 block text-xs font-medium text-muted-foreground"
                >
                  銀行帳號末五碼
                </label>
                <input
                  id="live-demo-digits"
                  name="digits"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={5}
                  placeholder="例如 83920"
                  value={digits}
                  onChange={(e) =>
                    setDigits(e.target.value.replace(/\D/g, "").slice(0, 5))
                  }
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 font-display text-lg font-semibold tracking-[0.35em] tabular-nums outline-none ring-primary/20 placeholder:tracking-normal placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2"
                />

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={() => setStep("checkout")}
                  >
                    上一步
                  </Button>
                  <Button type="submit" className="h-11 flex-1">
                    模擬送出回報
                  </Button>
                  {submitted ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11"
                      onClick={reset}
                    >
                      重來一次
                    </Button>
                  ) : null}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  此為前端模擬，不會送出真實資料。
                </p>
              </form>
            ) : null}
          </div>

          <div className="relative min-h-[300px]">
            <div className="overflow-hidden rounded-[1.5rem] bg-[#748896] shadow-lg shadow-black/15">
              <div className="flex items-end justify-between bg-[#3a4752] px-4 pb-2.5 pt-4 text-white">
                <div>
                  <p className="text-[10px] text-white/70">賣家手機 · LINE</p>
                  <p className="font-display text-sm font-semibold">NovaStore</p>
                </div>
                <Bell className="h-4 w-4 text-white/80" aria-hidden />
              </div>

              <div className="flex min-h-[260px] flex-col gap-3 px-3 py-4">
                {step !== "line" || !submitted ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
                    <Store className="h-8 w-8 text-white/70" aria-hidden />
                    <p className="text-sm text-white/85">
                      {step === "shop"
                        ? "先在左側選規格，體驗獨立賣場下單"
                        : step === "checkout"
                          ? "填好超商門市後送出訂單"
                          : "輸入末五碼，右側會跳出 LINE 入帳通知"}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-center text-[10px] text-white/80">剛剛</p>
                    <div className="ml-1 max-w-[95%] animate-fade-up rounded-2xl rounded-bl-md bg-white px-3.5 py-3 text-[#1a1a1a] shadow-md">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#06C755]">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        【新訂單已對帳】
                      </div>
                      <p className="text-[13px] leading-relaxed">
                        {color}/{size} · NT${" "}
                        <span className="font-semibold tabular-nums">499</span>
                        <br />
                        {storeBrand} {storeName} · 末五碼{" "}
                        <span className="font-semibold tabular-nums">
                          {submitted}
                        </span>
                      </p>
                      <p className="mt-2 text-[10px] text-black/40">剛剛</p>
                    </div>
                    <div className="ml-1 max-w-[90%] animate-fade-up rounded-2xl rounded-bl-md bg-white/95 px-3.5 py-2.5 text-[12px] text-[#333] shadow-sm">
                      已寫入後台商店中心，可直接安排出貨。
                    </div>
                  </>
                )}
              </div>

              <div className="bg-[#3a4752] px-3 py-2.5">
                <div className="rounded-full bg-white/15 px-3 py-2 text-[11px] text-white/50">
                  輸入訊息…
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
