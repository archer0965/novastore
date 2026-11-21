"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type DemoScreen = "shop" | "checkout" | "pay" | "line";

const ROTATE_MS = 3800;

const TABS: { id: DemoScreen; label: string }[] = [
  { id: "shop", label: "逛賣場" },
  { id: "checkout", label: "超商取貨" },
  { id: "pay", label: "回報末五碼" },
  { id: "line", label: "賣家 LINE" },
];

function ShopScreen({ active }: { active: boolean }) {
  const [picked, setPicked] = useState(false);
  useEffect(() => {
    if (!active) {
      setPicked(false);
      return;
    }
    const t = window.setTimeout(() => setPicked(true), 900);
    return () => window.clearTimeout(t);
  }, [active]);

  return (
    <div className="flex h-full flex-col bg-[#f4f7fb] text-foreground">
      <div className="border-b border-slate-900/10 bg-[#0B132B] px-4 pb-4 pt-12 text-sky-50">
        <p className="text-center text-[10px] text-sky-200/80">
          /shop/demo · IG Bio 專屬賣場
        </p>
        <p className="mt-1 text-center font-display text-base font-semibold">
          示範小舖
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
          <p className="text-xs text-muted-foreground">團購進行中 · 18/30</p>
          <p className="mt-1 font-display text-sm font-semibold">日系寬褲</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-primary">
            NT$ 499
          </p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-lg bg-secondary px-2 py-1 text-[11px]">
              黑
            </span>
            <span className="rounded-lg bg-secondary px-2 py-1 text-[11px]">
              M
            </span>
          </div>
          <button
            type="button"
            tabIndex={-1}
            className={cn(
              "mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition",
              picked ? "bg-primary" : "bg-primary/50"
            )}
          >
            {picked ? "已選 · 前往結帳" : "選擇規格中…"}
          </button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground">
          粉絲自己逛、自己選，不用私訊問還有沒有貨
        </p>
      </div>
    </div>
  );
}

function CheckoutScreen({ active }: { active: boolean }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active) {
      setDone(false);
      return;
    }
    const t = window.setTimeout(() => setDone(true), 1100);
    return () => window.clearTimeout(t);
  }, [active]);

  return (
    <div className="flex h-full flex-col bg-[#f4f7fb] text-foreground">
      <div className="border-b border-slate-900/10 bg-white px-4 pb-3 pt-12">
        <p className="text-center text-[11px] font-medium text-slate-600/80">
          結帳 · 超商取貨
        </p>
        <p className="mt-1 text-center font-display text-base font-semibold">
          黑 / M × 1
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        <div className="rounded-2xl border border-border bg-white p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
            7-11 取貨
          </p>
          <p className="mt-2 text-sm">店號 123456</p>
          <p className="text-sm text-muted-foreground">台北站前門市</p>
        </div>
        <button
          type="button"
          tabIndex={-1}
          className={cn(
            "mt-auto rounded-xl py-3 text-sm font-semibold text-white",
            done ? "bg-primary" : "bg-primary/45"
          )}
        >
          {done ? "訂單已送出" : "確認門市中…"}
        </button>
      </div>
    </div>
  );
}

function PayScreen({ active }: { active: boolean }) {
  const [digits, setDigits] = useState("");

  useEffect(() => {
    if (!active) {
      setDigits("");
      return;
    }
    const target = "83920";
    let i = 0;
    setDigits("");
    const id = window.setInterval(() => {
      i += 1;
      setDigits(target.slice(0, i));
      if (i >= target.length) window.clearInterval(id);
    }, 260);
    return () => window.clearInterval(id);
  }, [active]);

  return (
    <div className="flex h-full flex-col bg-[#f4faf9] text-foreground">
      <div className="border-b border-slate-900/10 bg-white px-4 pb-3 pt-12">
        <p className="text-center text-[11px] font-medium text-slate-600/80">
          NovaStore · 匯款回報
        </p>
        <p className="mt-1 text-center font-display text-base font-semibold">
          示範小舖
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-4 px-4 py-5">
        <div className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm">
          <p className="font-semibold tabular-nums">NT$ 499</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            黑/M · 7-11 台北站前
          </p>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground">
            銀行帳號末五碼
          </label>
          <div
            className={cn(
              "mt-1.5 flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2.5 transition-colors",
              digits.length === 5
                ? "border-primary ring-2 ring-primary/15"
                : "border-border"
            )}
          >
            {Array.from({ length: 5 }).map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  "flex h-9 w-8 items-center justify-center rounded-lg bg-secondary font-display text-lg font-semibold tabular-nums",
                  digits[idx] ? "text-foreground" : "text-muted-foreground/35"
                )}
              >
                {digits[idx] || "·"}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          tabIndex={-1}
          className={cn(
            "mt-auto rounded-xl py-3 text-sm font-semibold text-primary-foreground transition",
            digits.length === 5 ? "bg-primary" : "bg-primary/40"
          )}
        >
          {digits.length === 5 ? "送出回報" : "輸入末五碼…"}
        </button>
      </div>
    </div>
  );
}

function LineScreen({ active }: { active: boolean }) {
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    if (!active) {
      setShowBubble(false);
      return;
    }
    setShowBubble(false);
    const t = window.setTimeout(() => setShowBubble(true), 350);
    return () => window.clearTimeout(t);
  }, [active]);

  return (
    <div className="flex h-full flex-col bg-[#748896]">
      <div className="flex items-end justify-between bg-[#3a4752] px-4 pb-2.5 pt-11 text-white">
        <div>
          <p className="text-[10px] text-white/70">官方帳號</p>
          <p className="font-display text-sm font-semibold">NovaStore</p>
        </div>
        <Bell className="h-4 w-4 text-white/80" aria-hidden />
      </div>

      <div className="flex flex-1 flex-col gap-3 px-3 py-4">
        <p className="text-center text-[10px] text-white/80">今天</p>
        <div
          className={cn(
            "ml-1 max-w-[92%] origin-bottom-left transition-all duration-500",
            showBubble
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-3 scale-95 opacity-0"
          )}
        >
          <div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-3 text-[#1a1a1a] shadow-md shadow-black/10">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#06C755]">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              【新訂單已對帳】
            </div>
            <p className="text-[13px] leading-relaxed">
              黑/M ·{" "}
              <span className="font-semibold tabular-nums">499 元</span>
              <br />
              7-11 台北站前 · 末五碼{" "}
              <span className="font-semibold tabular-nums">83920</span>
            </p>
            <p className="mt-2 text-[10px] text-black/40">剛剛</p>
          </div>
        </div>
        <div
          className={cn(
            "ml-1 max-w-[85%] transition-all delay-150 duration-500",
            showBubble ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          )}
        >
          <div className="rounded-2xl rounded-bl-md bg-white/95 px-3.5 py-2.5 text-[12px] text-[#333] shadow-sm">
            已寫入商店中心，可安排出貨。
          </div>
        </div>
      </div>

      <div className="bg-[#3a4752] px-3 py-2.5 pb-6">
        <div className="rounded-full bg-white/15 px-3 py-2 text-[11px] text-white/50">
          輸入訊息…
        </div>
      </div>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[min(100%,280px)] sm:w-[300px]">
      <div
        className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-primary/10 blur-2xl"
        aria-hidden
      />
      <div className="relative rounded-[2.4rem] bg-gradient-to-b from-neutral-800 to-neutral-950 p-[10px] shadow-[0_25px_60px_-20px_rgba(15,40,80,0.45)] ring-1 ring-black/40">
        <div className="absolute -left-[2px] top-24 h-8 w-[3px] rounded-l bg-neutral-700" />
        <div className="absolute -left-[2px] top-36 h-12 w-[3px] rounded-l bg-neutral-700" />
        <div className="absolute -right-[2px] top-32 h-16 w-[3px] rounded-r bg-neutral-700" />
        <div className="relative overflow-hidden rounded-[1.9rem] bg-black">
          <div className="pointer-events-none absolute left-1/2 top-2.5 z-20 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
          <div className="relative h-[520px] w-full overflow-hidden bg-white sm:h-[560px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

const ORDER: DemoScreen[] = ["shop", "checkout", "pay", "line"];

export function LandingInteractiveDemo() {
  const [screen, setScreen] = useState<DemoScreen>("shop");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setScreen((s) => {
        const i = ORDER.indexOf(s);
        return ORDER[(i + 1) % ORDER.length];
      });
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <section
      id="demo"
      className="relative z-10 scroll-mt-20 overflow-hidden py-16 md:py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(210_40%_93%),transparent_55%)]" />

      <div className="relative mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">產品運作動態視圖</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            從獨立賣場下單到 LINE 入帳，一眼看懂
          </h2>
          <p className="mt-3 text-muted-foreground">
            逛賣場、選規格、填超商、回報末五碼——賣家在 LINE
            收到完整訂單與對帳成功推播。
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setScreen(tab.id);
                setPaused(true);
              }}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                screen === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <PhoneFrame>
            <div className="relative h-full w-full">
              {(
                [
                  ["shop", ShopScreen],
                  ["checkout", CheckoutScreen],
                  ["pay", PayScreen],
                  ["line", LineScreen],
                ] as const
              ).map(([id, Screen]) => (
                <div
                  key={id}
                  className={cn(
                    "absolute inset-0 transition-all duration-500 ease-out",
                    screen === id
                      ? "translate-x-0 opacity-100"
                      : screen ===
                          ORDER[
                            (ORDER.indexOf(id) - 1 + ORDER.length) % ORDER.length
                          ]
                        ? "-translate-x-6 opacity-0 pointer-events-none"
                        : "translate-x-6 opacity-0 pointer-events-none"
                  )}
                >
                  <Screen active={screen === id} />
                </div>
              ))}
            </div>
          </PhoneFrame>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {paused
            ? "已暫停輪播 · 點上方切換畫面"
            : "自動輪播中 · 滑鼠移入可暫停"}
        </p>
      </div>
    </section>
  );
}
