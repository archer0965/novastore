import { BrandLogo } from "@/components/brand-logo";
import { SiteFooter } from "@/components/site-footer";
import { BuyerReportForm } from "@/components/report/buyer-form";
import { sendLineTextMessage } from "@/lib/line";
import { getSiteUrl } from "@/lib/site";
import { getBuyerShopContext } from "@/lib/shop-public";

export const metadata = {
  title: "轉帳對帳回報",
};

export default async function BuyerReportPage({
  params,
}: {
  params: { sellerId: string };
}) {
  let loadError: string | null = null;
  let shop = null as Awaited<ReturnType<typeof getBuyerShopContext>>;

  try {
    shop = await getBuyerShopContext(params.sellerId);
    if (!shop) {
      loadError = "找不到此賣家或連結無效";
    }
  } catch (error) {
    console.error("[buyer-page]", error);
    // Never surface raw 500 to buyers — graceful fallback
    loadError =
      "暫時無法載入店家資料，請稍後再試。若持續發生，請私訊賣家。";
  }

  if (shop?.quotaFull && shop.lineUserId) {
    // Await so the serverless isolate does not freeze before the push finishes
    await sendLineTextMessage(
      shop.lineUserId,
      [
        "⚠️ 免費對帳額度已滿",
        "有買家開啟了你的回報頁，但本月 Free 額度已用完。",
        "請升級方案或直接私訊買家完成對帳。",
        `後台：${getSiteUrl()}/dashboard/settings#upgrade`,
      ].join("\n"),
      { accessToken: shop.lineAccessToken }
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <div className="mb-6 flex justify-center">
          <BrandLogo size="sm" />
        </div>

        {loadError || !shop ? (
          <div className="rounded-2xl border border-border bg-card/90 p-6 text-center shadow-sm">
            <h1 className="font-display text-xl font-semibold">無法開啟回報頁</h1>
            <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          </div>
        ) : (
          <BuyerReportForm shop={shop.shop} quotaFull={shop.quotaFull} />
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
