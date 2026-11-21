"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Grid3X3, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NOVAOS_HUB_URL, NOVAOS_MATRIX } from "@/lib/novaos-matrix";
import { cn } from "@/lib/utils";

/** Top-right NovaOS account status + product switcher for seller admin. */
export function NovaOsAccountBar({ className }: { className?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("NovaOS 用戶");
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const meta = user.user_metadata || {};
      setEmail(user.email || "");
      setName(
        (typeof meta.shop_name === "string" && meta.shop_name) ||
          (typeof meta.full_name === "string" && meta.full_name) ||
          user.email?.split("@")[0] ||
          "NovaOS 用戶"
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setMatrixOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initials = (name || email || "?").slice(0, 2).toUpperCase();

  return (
    <div
      ref={rootRef}
      className={cn("flex items-center justify-end gap-2", className)}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setMatrixOpen((v) => !v);
            setMenuOpen(false);
          }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground shadow-sm hover:bg-secondary"
          aria-label="切換拓新雲端產品"
          title="快速切換至主站／其他工具"
        >
          <Grid3X3 className="h-4 w-4" />
        </button>
        {matrixOpen ? (
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-border bg-card p-2 shadow-xl">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              拓新雲端產品矩陣
            </p>
            {NOVAOS_MATRIX.map((p) => (
              <a
                key={p.href}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-secondary"
                onClick={() => setMatrixOpen(false)}
              >
                {p.name}
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setMenuOpen((v) => !v);
            setMatrixOpen(false);
          }}
          className="inline-flex max-w-[12rem] items-center gap-2 rounded-xl border border-border bg-background py-1 pl-1 pr-2.5 shadow-sm"
          aria-label="拓新雲端 NovaOS 帳號狀態"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-xs font-semibold text-white">
            {initials}
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-xs font-semibold">
              拓新雲端 NovaOS 帳號
            </span>
            <span className="block truncate text-[10px] text-muted-foreground">
              {email || name}
            </span>
          </span>
        </button>
        {menuOpen ? (
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-border bg-card p-2 shadow-xl">
            <p className="truncate px-3 py-2 text-xs text-muted-foreground">
              {email}
            </p>
            <a
              href="/dashboard"
              className="block rounded-xl px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50"
              onClick={() => setMenuOpen(false)}
            >
              前往功能工作台
            </a>
            <a
              href="/dashboard/admin"
              className="block rounded-xl px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
              onClick={() => setMenuOpen(false)}
            >
              進入管理後台
            </a>
            <a
              href={`${NOVAOS_HUB_URL}/admin/novastore`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
              onClick={() => setMenuOpen(false)}
            >
              NovaOS Master Admin
            </a>
            <a
              href={`${NOVAOS_HUB_URL}/dashboard`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50"
              onClick={() => setMenuOpen(false)}
            >
              前往 NovaOS 主站中控
            </a>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
              onClick={() => void signOut()}
            >
              <LogOut className="h-4 w-4" />
              登出
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
