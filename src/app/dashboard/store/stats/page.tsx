import Link from "next/link";
import { redirect } from "next/navigation";
import { StoreStatsPanel } from "@/components/store/store-stats-panel";
import { Button } from "@/components/ui/button";
import { ensureShopSlug, listSellerStoreStats } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "開店統計",
};

export default async function StoreStatsPage() {
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
  const items = await listSellerStoreStats(user.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            開店統計
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            即時成團進度、下單人數與匯款對帳狀態。店舖代碼：
            <span className="font-mono text-foreground"> {shopSlug}</span>
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/store/create">新開團／上架</Link>
        </Button>
      </div>
      <StoreStatsPanel items={items} shopSlug={shopSlug} />
    </div>
  );
}
