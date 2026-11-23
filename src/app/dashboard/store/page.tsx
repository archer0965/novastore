import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Package, PackagePlus, Sparkles, Ticket } from "lucide-react";
import { ShopShareCard } from "@/components/store/shop-share-card";
import { Button } from "@/components/ui/button";
import {
  ensureShopSlug,
  getShopStorefrontUrl,
  listSellerStoreStats,
} from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { formatTWD } from "@/lib/utils-format";

export const metadata = {
  title: "商店中心",
};

export default async function StoreHubPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("shop_name, shop_slug")
    .eq("id", user.id)
    .maybeSingle();

  const shopSlug = await ensureShopSlug(
    user.id,
    profile?.shop_name || "shop",
    profile?.shop_slug
  );
  const shopUrl = getShopStorefrontUrl(shopSlug);
  const items = await listSellerStoreStats(user.id);
  const active = items.filter((i) => i.status !== "closed").length;
  const pending = items.reduce((s, i) => s + i.pending_count, 0);
  const sold = items.reduce((s, i) => s + i.ordered_quantity, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          商店中心
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          微商/代購／團購開團、連結分享與對帳統計。店舖代碼{" "}
          <span className="font-mono text-foreground">{shopSlug}</span>
        </p>
      </div>

      <ShopShareCard
        shopUrl={shopUrl}
        shopSlug={shopSlug}
        shopName={profile?.shop_name || ""}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/store/create"
          prefetch
          className="group rounded-2xl border border-primary/25 bg-primary/5 p-5 transition hover:border-primary/50 hover:bg-primary/10"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <PackagePlus className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold group-hover:text-primary">
            開團／上架
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            微商/代購或團購雙模式，建立後立刻複製買家連結。
          </p>
        </Link>
        <Link
          href="/dashboard/orders"
          prefetch
          className="group rounded-2xl border border-sky-500/20 bg-sky-50/50 p-5 transition hover:border-sky-500/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white">
            <Package className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold">
            訂單與出貨
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            出貨／對帳雙篩選，一鍵標記已出貨。
          </p>
        </Link>
        <Link
          href="/dashboard/coupons"
          prefetch
          className="group rounded-2xl border border-amber-500/20 bg-amber-50/40 p-5 transition hover:border-amber-500/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white">
            <Ticket className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold">
            優惠碼
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            打折或折現金，設定門檻與使用上限。
          </p>
        </Link>
        <Link
          href="/dashboard/store/stats"
          prefetch
          className="group rounded-2xl border border-border/80 bg-card/80 p-5 transition hover:border-primary/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
            <BarChart3 className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold">
            開店統計
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            成團進度、訂單列表與匯款末五碼對帳。
          </p>
        </Link>
      </div>

      <section className="grid grid-cols-3 gap-3">
        {[
          { label: "進行中", value: String(active) },
          { label: "待付款", value: String(pending) },
          { label: "已售件數", value: String(sold) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border/70 bg-card/70 px-3 py-3 text-center"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 font-display text-xl font-semibold tabular-nums">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border/80 bg-card/70 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="font-display text-base font-semibold">最近商品</h2>
        </div>
        {items.length === 0 ? (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">還沒有商品，先開第一團吧。</p>
            <Button asChild className="mt-3">
              <Link href="/dashboard/store/create" prefetch>
                立刻開團
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border/70">
            {items.slice(0, 5).map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.mode === "group_buy" ? "團購" : "微商/代購"} ·{" "}
                    {formatTWD(item.price)} · 訂單 {item.order_count}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/store/stats" prefetch>
                    查看
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
