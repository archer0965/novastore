/**
 * Shared auth for Vercel Cron / keep-alive endpoints.
 * Fail closed in production when CRON_SECRET is missing.
 */
export function authorizeCronRequest(
  request: Request,
  logTag: string
): boolean {
  const secret = (process.env.CRON_SECRET || "").trim();
  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";

  if (!secret) {
    if (isProd) {
      console.error(`[${logTag}] CRON_SECRET missing in production — denying`);
      return false;
    }
    console.warn(`[${logTag}] CRON_SECRET not set — allowing (non-production)`);
    return true;
  }

  const auth = request.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const headerSecret = request.headers.get("x-cron-secret") || "";
  const urlSecret = new URL(request.url).searchParams.get("secret") || "";

  return bearer === secret || headerSecret === secret || urlSecret === secret;
}
