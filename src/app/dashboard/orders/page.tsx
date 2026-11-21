import Link from "next/link";
import { redirect } from "next/navigation";
import { SellerOrdersPanel } from "@/components/dashboard/seller-orders-panel";
import { Button } from "@/components/ui/button";
import { listSellerOrders } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "訂單與出貨",
};

export default async function DashboardOrdersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let orders: Awaited<ReturnType<typeof listSellerOrders>> = [];
  let loadError: string | null = null;
  try {
    orders = await listSellerOrders(user.id);
  } catch (error) {
    console.error("[dashboard/orders]", error);
    loadError = "無法載入訂單，請稍後再試或重新整理頁面。";
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            訂單與出貨
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            雙維度篩選對帳／出貨狀態，一鍵標記已出貨，方便包貨作業。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/store/stats">開店統計</Link>
          </Button>
          <Button asChild>
            <Link href="/track" target="_blank">
              買家查單頁
            </Link>
          </Button>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-sm text-destructive">
          {loadError}
        </div>
      ) : (
        <SellerOrdersPanel orders={orders} />
      )}
    </div>
  );
}
