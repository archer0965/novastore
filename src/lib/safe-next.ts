/**
 * Sanitize post-login redirect targets to prevent open redirects.
 * Only same-origin relative paths starting with a single `/` are allowed.
 */
export function sanitizeNextPath(
  raw: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!raw) return fallback;
  let next = String(raw).trim();
  try {
    // Decode once; reject nested encoding that could reintroduce //
    next = decodeURIComponent(next);
  } catch {
    return fallback;
  }
  next = next.trim().replace(/\\/g, "/");
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("://") || next.includes("@")) return fallback;
  if (/[\x00-\x1f\x7f]/.test(next)) return fallback;
  // Reject remaining percent-encoding (nested open-redirect tricks)
  if (/%2f/i.test(next)) return fallback;
  return next || fallback;
}
