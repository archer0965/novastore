import { redirect } from "next/navigation";
import { SellerAnalyticsPanel } from "@/components/dashboard/seller-analytics-panel";
import {
  getSellerAnalyticsDetail,
  isAnalyticsRangeKey,
  type AnalyticsRangeKey,
} from "@/lib/seller-analytics";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "詳細數據分析",
};

export default async function DashboardAnalyticsPage({
  searchParams,
}: {
  searchParams?: { range?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const raw = searchParams?.range || "30d";
  const range: AnalyticsRangeKey = isAnalyticsRangeKey(raw) ? raw : "30d";
  const initial = await getSellerAnalyticsDetail(user.id, range).catch(
    async () => {
      const { resolveAnalyticsRange } = await import("@/lib/seller-analytics");
      const { from, to, label } = resolveAnalyticsRange(range);
      return {
        range,
        rangeLabel: label,
        from: from.toISOString(),
        to: to.toISOString(),
        summary: {
          revenue: 0,
          orders: 0,
          avgOrderValue: 0,
          fulfilled: 0,
          unfulfilled: 0,
          matched: 0,
          pending: 0,
          itemsSold: 0,
        },
        series: [],
        topProducts: [],
      };
    }
  );

  return (
    <div className="animate-fade-in">
      <SellerAnalyticsPanel initial={initial} />
    </div>
  );
}
