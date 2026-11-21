"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Download, Menu, Share, X } from "lucide-react";
import { usePwaInstall } from "@/components/pwa-install-provider";
import { isIosSafari } from "@/lib/pwa-install";
import { cn } from "@/lib/utils";
import { EARLY_BIRD } from "@/types/database";

const SECTIONS = [
  {
    title: "探索產品",
    items: [
      { href: "#demo", label: "開店動態示範" },
      { href: "#live-demo", label: "3 秒體驗開店" },
      { href: "#features", label: "三大核心" },
      { href: "#how-it-works", label: "賣家旅程" },
      { href: "#pricing", label: "方案價格" },
      { href: "#faq", label: "常見問題" },
      { href: "#trust", label: "安心保證" },
    ],
  },
  {
    title: "合作與安裝",
    items: [{ href: "#partner", label: EARLY_BIRD.applyLabel }],
  },
] as const;

const MENU_Z = 100;

/** Header hamburger: categorized page links + Add to Home Screen. */
export function LandingNavMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [installTip, setInstallTip] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number }>({
    top: 0,
    right: 16,
  });
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { installed, canPrompt, promptInstall } = usePwaInstall();

  useEffect(() => {
    setMounted(true);
  }, []);

  function updatePanelPos() {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const right = Math.max(12, window.innerWidth - rect.right);
    setPanelPos({
      top: rect.bottom + 8,
      right,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPos();
    function onScrollOrResize() {
      updatePanelPos();
    }
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
      setInstallTip(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setInstallTip(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function onInstall() {
    if (installed) return;
    if (canPrompt) {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        setInstallTip(false);
        setOpen(false);
      } else if (outcome === "unavailable") {
        setInstallTip(true);
      }
      return;
    }
    setInstallTip(true);
  }

  const panel =
    open && mounted
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="關閉選單"
              className="fixed inset-0 bg-black/20"
              style={{ zIndex: MENU_Z }}
              onClick={() => {
                setOpen(false);
                setInstallTip(false);
              }}
            />
            <div
              ref={panelRef}
              id={panelId}
              role="menu"
              className="fixed w-[min(18.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl shadow-black/20"
              style={{
                zIndex: MENU_Z + 1,
                top: panelPos.top,
                right: panelPos.right,
              }}
            >
              <div className="max-h-[min(70vh,28rem)] overflow-y-auto p-3">
                {SECTIONS.map((section) => (
                  <div key={section.title} className="mb-3 last:mb-0">
                    <p className="px-2 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
                      {section.title}
                    </p>
                    <ul className="space-y-0.5">
                      {section.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            role="menuitem"
                            onClick={() => setOpen(false)}
                            className="block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                      {section.title === "合作與安裝" ? (
                        <li>
                          {installed ? (
                            <p className="px-3 py-2.5 text-sm text-muted-foreground">
                              已加入主畫面
                            </p>
                          ) : (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={onInstall}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-secondary"
                            >
                              <Download
                                className="h-4 w-4 text-primary"
                                aria-hidden
                              />
                              加入主畫面
                            </button>
                          )}
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ))}

                {installTip ? (
                  <div className="mt-1 rounded-xl border border-border bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
                    {isIosSafari() ? (
                      <ol className="list-decimal space-y-1.5 pl-4">
                        <li>
                          點底部{" "}
                          <Share
                            className="inline h-3.5 w-3.5 text-primary"
                            aria-hidden
                          />{" "}
                          「分享」
                        </li>
                        <li>選擇「加入主畫面」</li>
                        <li>確認後即可像 App 全螢幕開啟</li>
                      </ol>
                    ) : (
                      <p>
                        請用瀏覽器選單的「安裝應用程式」或「加到主畫面」。若沒看到選項，稍後再試一次。
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="mt-2 border-t border-border pt-2 sm:hidden">
                  <p className="px-2 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
                    帳號
                  </p>
                  <Link
                    href="/login"
                    prefetch
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                  >
                    登入
                  </Link>
                  <Link
                    href="/signup"
                    prefetch
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-sm font-medium text-primary hover:bg-secondary"
                  >
                    免費試用
                  </Link>
                </div>
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "關閉選單" : "開啟選單"}
        onClick={() => {
          setOpen((v) => !v);
          setInstallTip(false);
        }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-sky-50 transition-colors hover:bg-white/10"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {panel}
    </div>
  );
}
