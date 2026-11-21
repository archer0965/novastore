import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Shared auth cookie options for browser / server / middleware clients.
 * Must stay identical across createBrowserClient + createServerClient so
 * PWA standalone and SSR read the same session cookies.
 *
 * Defaults align with @supabase/ssr DEFAULT_COOKIE_OPTIONS (path=/, SameSite=Lax,
 * maxAge ≈ 400 days) and add Secure on HTTPS.
 */
export const authCookieOptions: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  // Chrome caps persistent cookies around 400 days.
  maxAge: 400 * 24 * 60 * 60,
  secure: process.env.NODE_ENV === "production",
};
