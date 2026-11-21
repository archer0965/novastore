import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { SiteFooter } from "@/components/site-footer";
import { getRemainingStock, isSoldOut } from "@/lib/product-stock";
import {
  getPublicShopStorefront,
  getStoreProductUrl,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatTWD } from "@/lib/utils-format";

export const dynamic = "force-dynamic";

function shopInitials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "店";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.slice(0, 2).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}) {
  try {
    const shop = await getPublicShopStorefront(params.username);
    if (!shop) return { title: "找不到賣場" };
    return {
      title: `${shop.shop_name}｜賣場`,
      description:
        shop.shop_bio?.trim() ||
        `${shop.shop_name} 的微商／團購賣場 · NovaStore`,
    };
  } catch {
    return { title: "賣場" };
  }
}

export default async function PublicShopPage({
  params,
}: {
  params: { username: string };
}) {
  let shop = null as Awaited<ReturnType<typeof getPublicShopStorefront>>;
  try {
    shop = await getPublicShopStorefront(params.username);
  } catch (error) {
    console.error("[shop-storefront]", error);
  }
  if (!shop) notFound();

  const bio =
    shop.shop_bio?.trim() ||
    "歡迎逛逛我的賣場。選好商品後即可填寫下單、超商取貨與匯款資訊。";

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,hsl(214_55%_93%),transparent_55%),linear-gradient(180deg,hsl(220_40%_98%),hsl(218_30%_95%))]">
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 flex justify-center sm:justify-start">
          <BrandLogo size="sm" />
        </div>

        <header className="relative overflow-hidden rounded-3xl border border-primary/15 bg-[linear-gradient(135deg,hsl(222_65%_16%),hsl(217_70%_28%)_55%,hsl(205_60%_36%))] px-5 py-8 text-primary-foreground shadow-sm sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-sky-300/15 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-indigo-300/20 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/15 font-display text-2xl font-semibold tracking-wide backdrop-blur-sm"
              aria-hidden
            >
              {shopInitials(shop.shop_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
                @{shop.shop_slug}
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {shop.shop_name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
                {bio}
              </p>
              <p className="mt-4 text-xs text-white/65">
                上架中 {shop.products.length} 件商品 · NovaStore
              </p>
            </div>
          </div>
        </header>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                商品列表
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                點選商品即可進入下單與匯款頁面
              </p>
            </div>
          </div>

          {shop.products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/70 px-4 py-12 text-center">
              <p className="font-display text-lg font-semibold">目前沒有上架商品</p>
              <p className="mt-2 text-sm text-muted-foreground">
                賣家尚未開放可購買的商品，請稍後再來看看。
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shop.products.map((product) => {
                const href = `/${encodeURIComponent(shop.shop_slug)}/${product.id}`;
                const absolute = getStoreProductUrl(shop.shop_slug, product.id);
                const target = product.target_quantity || 0;
                const progress =
                  product.mode === "group_buy" && target > 0
                    ? Math.min(
                        100,
                        Math.round((product.ordered_quantity / target) * 100)
                      )
                    : null;
                const reached =
                  progress !== null && product.ordered_quantity >= target;
                const remaining = getRemainingStock(product);
                const soldOut = isSoldOut(product);
                const isPreorder = Boolean(product.is_preorder);

                return (
                  <li key={product.id}>
                    <Link
                      href={href}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
                      title={absolute}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                        {product.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,hsl(175_30%_90%),hsl(168_20%_96%))]">
                            <span className="font-display text-3xl font-semibold text-primary/35">
                              {shopInitials(product.title)}
                            </span>
                          </div>
                        )}
                        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                          <span
                            className={cn(
                              "rounded-lg px-2 py-1 text-[11px] font-semibold shadow-sm",
                              product.mode === "group_buy"
                                ? "bg-emerald-700 text-white"
                                : "bg-primary text-primary-foreground"
                            )}
                          >
                            {product.mode === "group_buy" ? "團購" : "微商/代購"}
                          </span>
                          {isPreorder ? (
                            <span className="rounded-lg bg-amber-500 px-2 py-1 text-[11px] font-bold text-white shadow-sm">
                              預購
                            </span>
                          ) : null}
                        </div>
                        {soldOut ? (
                          <span className="absolute bottom-3 right-3 rounded-lg bg-slate-900/80 px-2 py-1 text-[11px] font-semibold text-white">
                            已售完
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug tracking-tight group-hover:text-primary">
                          {product.title}
                        </h3>
                        <p className="text-lg font-semibold tabular-nums text-foreground">
                          {formatTWD(product.price)}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            / 件
                          </span>
                        </p>
                        {remaining !== null ? (
                          <p className="text-xs text-muted-foreground">
                            {soldOut
                              ? "庫存：已售完"
                              : `庫存：${remaining} 件`}
                          </p>
                        ) : null}
                        {isPreorder && product.preorder_notice?.trim() ? (
                          <p className="line-clamp-2 text-xs text-amber-800">
                            {product.preorder_notice.trim()}
                          </p>
                        ) : null}

                        {progress !== null ? (
                          <div className="mt-auto rounded-xl bg-secondary/70 p-2.5">
                            <div className="mb-1.5 flex justify-between text-[11px]">
                              <span className="text-muted-foreground">
                                成團進度
                              </span>
                              <span className="font-semibold tabular-nums">
                                {product.ordered_quantity} / {target}
                                {reached ? " · 已達標" : ""}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-sky-100">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  reached ? "bg-emerald-600" : "bg-primary"
                                )}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="mt-auto text-xs text-muted-foreground">
                            {soldOut ? "目前無法下單" : "點擊進入下單"}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
