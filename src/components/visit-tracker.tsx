"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const COOKIE = "pc_vid";
const COOKIE_DAYS = 400;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days: number) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function ensureVisitorKey(): string {
  let key = readCookie(COOKIE);
  if (!key || key.length < 8) {
    key =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    writeCookie(COOKIE, key, COOKIE_DAYS);
  }
  return key;
}

/** Records one pageview per client navigation on public pages. */
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/auth")
    ) {
      return;
    }

    const visitorKey = ensureVisitorKey();
    const payload = JSON.stringify({
      path: pathname,
      visitorKey,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    });

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/visit", blob);
      } else {
        void fetch("/api/visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    } catch {
      /* ignore */
    }
  }, [pathname]);

  return null;
}
