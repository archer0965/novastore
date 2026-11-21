"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  Store,
  Ticket,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { NovaOsAccountBar } from "@/components/dashboard/novaos-account-bar";
import { cn } from "@/lib/utils";

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "儀表板", icon: LayoutDashboard },
    { href: "/dashboard/orders", label: "訂單", icon: Package },
    { href: "/dashboard/store", label: "商店", icon: Store },
    { href: "/dashboard/coupons", label: "優惠", icon: Ticket },
    { href: "/dashboard/settings", label: "設定", icon: Settings },
    ...(isAdmin
      ? [{ href: "/dashboard/admin", label: "管理", icon: Shield }]
      : []),
  ];

  return (
    <>
      <header className="nav-surface sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <BrandLogo size="sm" href="/dashboard" />
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map(({ href, label, icon: Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
            <NovaOsAccountBar />
          </nav>
          <div className="flex items-center gap-1 sm:hidden">
            <NovaOsAccountBar />
          </div>
        </div>
      </header>

      <nav className="nav-surface fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div
          className={cn(
            "mx-auto grid max-w-lg",
            isAdmin ? "grid-cols-6" : "grid-cols-5"
          )}
        >
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                prefetch
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-2.5 text-[11px] transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground active:bg-secondary/60"
                )}
              >
                <Icon
                  className={cn("h-5 w-5", active && "stroke-[2.25px]")}
                />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
