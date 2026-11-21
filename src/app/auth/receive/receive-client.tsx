"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyHandoffSession } from "@/lib/auth-receive";
import { createClient } from "@/lib/supabase/client";
import { sanitizeNextPath } from "@/lib/safe-next";

export function AuthReceiveClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("正在完成登入…");

  useEffect(() => {
    const next = sanitizeNextPath(searchParams.get("next"), "/dashboard");
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const ok = await applyHandoffSession(supabase);
      if (cancelled) return;
      if (ok) {
        router.replace(next);
        router.refresh();
        return;
      }
      setMessage("登入狀態未帶入，改導向拓新雲端…");
      const hub =
        process.env.NEXT_PUBLIC_NOVAOS_URL?.replace(/\/$/, "") ||
        "https://paycheck.com.de";
      const returnTo = `${window.location.origin}/auth/receive?next=${encodeURIComponent(next)}`;
      window.location.replace(
        `${hub}/login?next=${encodeURIComponent(returnTo)}`
      );
    })().catch(() => {
      setMessage("登入失敗，請重新嘗試");
    });

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
