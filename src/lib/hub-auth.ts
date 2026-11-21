import { NOVAOS_HUB_URL } from "@/lib/novaos-hub";

export const NOVASTORE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://novastore-omega.vercel.app";

/** Redirect product auth to NovaOS hub; return via /auth/receive after login. */
export function hubAuthRedirect(
  mode: "login" | "signup",
  nextPath = "/dashboard"
): string {
  const next = nextPath.startsWith("/") ? nextPath : "/dashboard";
  const returnTo = `${NOVASTORE_ORIGIN}/auth/receive?next=${encodeURIComponent(next)}`;
  return `${NOVAOS_HUB_URL}/${mode}?next=${encodeURIComponent(returnTo)}`;
}
