import { redirect } from "next/navigation";
import { CouponsPanel } from "@/components/dashboard/coupons-panel";
import { listSellerCoupons } from "@/lib/coupons";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "優惠碼",
};

export default async function DashboardCouponsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let coupons: Awaited<ReturnType<typeof listSellerCoupons>> = [];
  let loadError: string | null = null;
  try {
    coupons = await listSellerCoupons(user.id);
  } catch (error) {
    console.error("[dashboard/coupons]", error);
    loadError = "無法載入優惠碼，請稍後再試或重新整理頁面。";
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          優惠碼與折扣
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          建立促銷碼，買家可在商品下單頁套用折抵，提高轉換與客單價。
        </p>
      </div>
      {loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-sm text-destructive">
          {loadError}
        </div>
      ) : (
        <CouponsPanel initialCoupons={coupons} />
      )}
    </div>
  );
}
