"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, Share, X } from "lucide-react";
import { usePwaInstall } from "@/components/pwa-install-provider";
import { Button } from "@/components/ui/button";
import {
  isIosSafari,
  shouldOfferInstallOnPath,
} from "@/lib/pwa-install";
import { cn } from "@/lib/utils";

const SHOW_DELAY_MS = 2200;

/**
 * Auto banner: invites users to install NovaStore as a home-screen App.
 * Chromium uses beforeinstallprompt; iOS Safari shows Share → 加入主畫面 steps.
 */
export function PwaInstallPrompt() {
  const pathname = usePathname() || "/";
  const { installed, canPrompt, dismissed, promptInstall, dismiss } =
    usePwaInstall();
  const [visible, setVisible] = useState(false);
  const [iosGuide, setIosGuide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [iosDevice, setIosDevice] = useState(false);

  useEffect(() => {
    setIosDevice(isIosSafari());
  }, []);

  useEffect(() => {
    if (installed || dismissed) {
      setVisible(false);
      return;
    }
    if (!shouldOfferInstallOnPath(pathname)) {
      setVisible(false);
      return;
    }

    // Chromium: wait until install is available. iOS: show guide (no BIP event).
    const eligible = canPrompt || iosDevice;
    if (!eligible) {
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [installed, dismissed, canPrompt, iosDevice, pathname]);

  if (!visible || installed) return null;

  async function onInstallClick() {
    if (busy) return;
    if (iosDevice && !canPrompt) {
      setIosGuide((v) => !v);
      return;
    }
    setBusy(true);
    const outcome = await promptInstall();
    setBusy(false);
    if (outcome === "accepted") {
      setVisible(false);
      return;
    }
    if (outcome === "unavailable") {
      setIosGuide(true);
    }
  }

  function onDismiss() {
    dismiss();
    setVisible(false);
  }

  const aboveMobileCta = pathname === "/";

  return (
    <div
      role="dialog"
      aria-label="加入 NovaStore 主畫面"
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-3",
        aboveMobileCta
          ? "bottom-[calc(4.25rem+env(safe-area-inset-bottom))] sm:bottom-4"
          : "bottom-[max(1rem,env(safe-area-inset-bottom))]"
      )}
    >
      <div
        className={cn(
          "pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-sky-300/25",
          "bg-[linear-gradient(145deg,#0B132B_0%,#13294d_55%,#0f1c38_100%)]",
          "text-sky-50 shadow-2xl shadow-black/40",
          "animate-fade-up"
        )}
      >
        <div className="flex items-start gap-3 p-3.5 sm:p-4">
          <div className="relative mt-0.5 h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-[#0B132B] shadow-inner">
            <Image
              src="/pwa-icon-192.png"
              alt="NovaStore"
              width={48}
              height={48}
              className="h-full w-full object-cover"
              priority={false}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-sky-300/90">
              NOVASTORE APP
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-snug text-white">
              一鍵加入主畫面
            </p>
            <p className="mt-1 text-xs leading-relaxed text-sky-100/75">
              像原生 App 全螢幕開啟，專屬頭貼與即時對帳通知都在手上。
            </p>
          </div>
          <button
            type="button"
            aria-label="稍後再說"
            onClick={onDismiss}
            className="rounded-lg p-1 text-sky-100/60 transition-colors hover:bg-white/10 hover:text-sky-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {iosGuide ? (
          <div className="border-t border-white/10 bg-black/20 px-4 py-3 text-xs leading-relaxed text-sky-100/85">
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>
                點 Safari 底部{" "}
                <Share className="inline h-3.5 w-3.5 text-sky-300" aria-hidden />{" "}
                「分享」
              </li>
              <li>向下滑並選擇「加入主畫面」</li>
              <li>確認後即可用 NovaStore 頭貼開啟</li>
            </ol>
          </div>
        ) : null}

        <div className="flex gap-2 border-t border-white/10 px-3.5 py-3 sm:px-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-10 flex-1 text-sky-100/80 hover:bg-white/10 hover:text-white"
          >
            稍後
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={onInstallClick}
            className="h-10 flex-[1.6] bg-sky-400 font-semibold text-slate-950 hover:bg-sky-300"
          >
            <Download className="mr-1.5 h-4 w-4" aria-hidden />
            {iosDevice && !canPrompt
              ? iosGuide
                ? "收合說明"
                : "如何加入"
              : busy
                ? "開啟中…"
                : "加入主畫面"}
          </Button>
        </div>
      </div>
    </div>
  );
}
