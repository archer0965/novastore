import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { BuyerOrderForm } from "@/components/store/buyer-order-form";
import { SiteFooter } from "@/components/site-footer";
import { getRemainingStock, isSoldOut } from "@/lib/product-stock";
import { RESERVED_SHOP_SLUGS, getPublicStoreProduct } from "@/lib/store";
import { formatDateTime, formatTWD } from "@/lib/utils-format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { username: string; productId: string };
}) {
  if (RESERVED_SHOP_SLUGS.has(params.username.toLowerCase())) {
    return { title: "找不到頁面" };
  }
  try {
    const product = await getPublicStoreProduct(
      params.username,
      params.productId
    );
    if (!product) return { title: "找不到商品" };
    return {
      title: `${product.title}｜${product.shop_name || "NovaStore"}`,
      description: `${product.shop_name || "賣家"} · ${formatTWD(product.price)}`,
    };
  } catch {
    return { title: "商品頁" };
  }
}

export default async function PublicStoreProductPage({
  params,
}: {
  params: { username: string; productId: string };
}) {
  const username = params.username.toLowerCase();
  if (RESERVED_SHOP_SLUGS.has(username)) notFound();

  // UUID-ish product ids only (avoid catching unrelated two-segment paths)
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      params.productId
    )
  ) {
    notFound();
  }

  let product = null as Awaited<ReturnType<typeof getPublicStoreProduct>>;
  try {
    product = await getPublicStoreProduct(username, params.productId);
  } catch (error) {
    console.error("[store-public]", error);
  }
  if (!product) notFound();

  const target = product.target_quantity || 0;
  const progress =
    product.mode === "group_buy" && target > 0
      ? Math.min(100, Math.round((product.ordered_quantity / target) * 100))
      : null;
  const reached = progress !== null && product.ordered_quantity >= target;
  const remaining = getRemainingStock(product);
  const soldOut = isSoldOut(product);
  const isPreorder = Boolean(product.is_preorder);

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,hsl(214_50%_95%),transparent_55%)]">
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <div className="mb-6 flex justify-center">
          <BrandLogo size="sm" />
        </div>

        <article className="overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-sm">
          {product.image_url ? (
            <div className="relative aspect-[4/3] w-full bg-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.image_url}
                alt={product.title}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
              {isPreorder ? (
                <span className="absolute left-3 top-3 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                  預購
                </span>
              ) : null}
              {soldOut ? (
                <span className="absolute bottom-3 right-3 rounded-lg bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white">
                  已售完
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium text-primary">
                <Link
                  href={`/shop/${encodeURIComponent(product.shop_slug)}`}
                  className="hover:underline"
                >
                  {product.shop_name || "賣家商店"}
                </Link>
                {" · "}
                {product.mode === "group_buy" ? "團購" : "微商/代購"}
              </p>
              {isPreorder ? (
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                  預購
                </span>
              ) : null}
              {soldOut ? (
                <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  已售完
                </span>
              ) : null}
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {isPreorder ? `【預購】${product.title}` : product.title}
            </h1>
            <p className="text-xl font-semibold tabular-nums text-foreground">
              {formatTWD(product.price)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / 件
              </span>
            </p>
            {(product.color_options?.length || product.size_options?.length) ? (
              <div className="space-y-1 text-sm text-muted-foreground">
                {product.color_options?.length ? (
                  <p>可選顏色：{product.color_options.join("、")}</p>
                ) : null}
                {product.size_options?.length ? (
                  <p>可選尺寸：{product.size_options.join("、")}</p>
                ) : null}
                <p className="text-xs">下方可一次加購多組規格與數量</p>
              </div>
            ) : null}
            {remaining !== null ? (
              <p className="text-sm font-medium text-foreground">
                庫存：
                <span className="tabular-nums">
                  {soldOut ? "已售完" : `${remaining} 件`}
                </span>
              </p>
            ) : null}
            {isPreorder && product.preorder_notice?.trim() ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-3 text-sm text-amber-950">
                <p className="font-semibold">預購出貨說明</p>
                <p className="mt-1 leading-relaxed">
                  {product.preorder_notice.trim()}
                </p>
              </div>
            ) : isPreorder ? (
              <p className="text-sm text-amber-800">此商品為預購，下單後依賣家通知出貨。</p>
            ) : null}
            {product.variant_note ? (
              <p className="text-sm text-muted-foreground">
                其他說明：{product.variant_note}
              </p>
            ) : null}
            {product.deadline ? (
              <p className="text-sm text-muted-foreground">
                結單時間：{formatDateTime(product.deadline)}
              </p>
            ) : null}

            {progress !== null ? (
              <div className="rounded-xl bg-secondary/50 p-3">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-muted-foreground">成團進度</span>
                  <span className="font-semibold">
                    {product.ordered_quantity} / {target}
                    {reached ? " · 已達標" : ""}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-sky-100">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      reached ? "bg-emerald-600" : "bg-primary"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </article>

        <div className="mt-5">
          <BuyerOrderForm product={product} />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
