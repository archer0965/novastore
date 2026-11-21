/** Shared PWA install helpers for NovaStore home-screen UX. */

export const PWA_DISMISS_KEY = "novastore-pwa-install-dismissed";
export const PWA_DISMISS_DAYS = 14;

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || ios;
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && notOther;
}

/** Buyer storefronts should not push seller App install. */
export function shouldOfferInstallOnPath(pathname: string): boolean {
  if (!pathname) return true;
  if (pathname.startsWith("/shop/")) return false;
  if (pathname.startsWith("/p/")) return false;
  if (pathname.startsWith("/pay/")) return false;
  // Product pages: /{username}/{productId}
  const parts = pathname.split("/").filter(Boolean);
  if (
    parts.length === 2 &&
    !["dashboard", "login", "signup", "auth", "api", "contact", "privacy", "terms"].includes(
      parts[0]
    )
  ) {
    return false;
  }
  return true;
}

export function readInstallDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(PWA_DISMISS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return false;
    if (Date.now() > until) {
      window.localStorage.removeItem(PWA_DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function writeInstallDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    const until = Date.now() + PWA_DISMISS_DAYS * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(PWA_DISMISS_KEY, String(until));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearInstallDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PWA_DISMISS_KEY);
  } catch {
    /* ignore */
  }
}
