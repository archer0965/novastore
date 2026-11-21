import { createBrowserClient } from "@supabase/ssr";
import { authCookieOptions } from "@/lib/supabase/cookie-options";

/**
 * Browser Supabase client — session is persisted in cookies (not localStorage)
 * via @supabase/ssr so SSR/middleware and PWA standalone can restore login.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: authCookieOptions,
      auth: {
        // Explicit: keep tokens across tab/app restarts (cookie-backed).
        persistSession: true,
        // Explicit: refresh access token in the background while the app is open.
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}
