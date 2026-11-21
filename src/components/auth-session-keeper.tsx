"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps cookie-backed Supabase sessions alive in PWA / mobile without
 * hammering auth APIs on every focus event.
 */
export function AuthSessionKeeper() {
  useEffect(() => {
    const supabase = createClient();
    let lastResumeAt = 0;
    const RESUME_COOLDOWN_MS = 12_000;

    function resume() {
      if (document.visibilityState !== "visible") {
        void supabase.auth.stopAutoRefresh();
        return;
      }
      void supabase.auth.startAutoRefresh();
      const now = Date.now();
      if (now - lastResumeAt < RESUME_COOLDOWN_MS) return;
      lastResumeAt = now;
      void supabase.auth.getSession();
    }

    resume();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // Keep client subscribed for token refresh events.
    });

    return () => {
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pageshow", resume);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
