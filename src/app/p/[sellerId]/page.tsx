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
  searchParams,
}: {
  params: { sellerId: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  let loadError: string | null = null;
  let shop = null as Awaited<ReturnType<typeof getBuyerShopContext>>;

  const pick = (key: string) => {
    const v = searchParams?.[key];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : "";
  };
  const amount = pick("amount");
  const last5 = pick("last5") || pick("bank_last_five");
  const name = pick("name") || pick("buyer_name");
  const orderId = pick("order") || pick("order_id");
  const fromCheckout = pick("from") === "checkout";

  try {
    shop = await getBuyerShopContext(params.sellerId);
    if (!shop) {
      loadError = "找不到此賣家或連結無效";
    }
  } catch (error) {
    console.error("[buyer-page]", error);
    loadError =
      "暫時無法載入店家資料，請稍後再試。若持續發生，請私訊賣家。";
  }

  if (shop?.quotaFull && shop.lineUserId) {
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
          <>
            {fromCheckout ? (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
                <p className="font-semibold">訂單已建立，請完成匯款回報</p>
                <p className="mt-1 text-emerald-900/80">
                  請確認／補填匯款末五碼與金額後送出，賣家即可對帳出貨。
                </p>
                {orderId ? (
                  <p className="mt-2 font-mono text-[11px] text-emerald-800/80">
                    訂單編號 {orderId}
                  </p>
                ) : null}
              </div>
            ) : null}
            <BuyerReportForm
              shop={shop.shop}
              quotaFull={shop.quotaFull}
              initial={{
                buyer_name: name || undefined,
                amount: amount || undefined,
                bank_last_five: last5 || undefined,
                order_id: orderId || undefined,
              }}
            />
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
