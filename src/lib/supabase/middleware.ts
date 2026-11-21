import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@/lib/safe-next";
import { authCookieOptions } from "@/lib/supabase/cookie-options";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touches / refreshes the session from cookies (writes Set-Cookie when needed).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isHome = path === "/";
  const isDashboard = path.startsWith("/dashboard");
  const isAuthPage = path === "/login" || path === "/signup";

  if (isDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Already signed in: skip marketing / auth screens and open the app shell.
  // Fixes PWA home-screen launches that still open "/" and required tapping 登入.
  // Honor sanitized ?next= on login/signup (e.g. /login?next=/dashboard/store).
  if (user && (isHome || isAuthPage)) {
    const dest =
      isAuthPage
        ? sanitizeNextPath(request.nextUrl.searchParams.get("next"))
        : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.nextUrl.origin));
  }

  return supabaseResponse;
}
