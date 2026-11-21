"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  const displayStandalone = window.matchMedia(
    "(display-mode: standalone)"
  ).matches;
  const iosStandalone = Boolean(
    (navigator as Navigator & { standalone?: boolean }).standalone
  );
  return displayStandalone || iosStandalone;
}

/**
 * Backup for older home-screen installs that still launch on "/":
 * if a cookie session exists (especially in standalone), jump to dashboard
 * without requiring a tap on 登入.
 */
export function PwaBootRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session) return;

      // Always send signed-in users from the marketing shell into the app.
      // Standalone launches are the main case; browser tabs benefit too.
      if (isStandaloneApp() || window.location.pathname === "/") {
        router.replace("/dashboard");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
