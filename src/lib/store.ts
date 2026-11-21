import {
  coerceOrderItems,
  formatOrderItemsSummary,
} from "@/lib/order-items";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site";
import type { Profile, StoreOrder, StoreProduct } from "@/types/database";

/** Reserved path segments that cannot be used as shop_slug. */
export const RESERVED_SHOP_SLUGS = new Set([
  "api",
  "auth",
  "login",
  "signup",
  "dashboard",
  "admin",
  "p",
  "pay",
  "privacy",
  "terms",
  "contact",
  "track",
  "orders",
  "coupons",
  "analytics",
  "store",
  "shop",
  "robots.txt",
  "sitemap.xml",
  "opengraph-image.jpg",
  "twitter-image.jpg",
  "og-image.jpg",
  "og.jpg",
  "sw.js",
  "manifest.json",
  "favicon.ico",
  "icon.png",
  "brand-mark.png",
  "pwa-icon.png",
  "pwa-icon-192.png",
  "pwa-icon-512.png",
  "pwa-icon-maskable-512.png",
  "pwa-apple-touch-icon.png",
  "hero-bg.jpg",
  "hero-bg-mobile.jpg",
  "hero-banner.png",
  "hero-banner-desktop.jpg",
  "hero-banner-mobile.jpg",
  "icon-192.png",
  "icon-512.png",
  "_next",
]);

function stableShopFallback(userId: string): string {
  return `u-${userId.replace(/-/g, "").slice(0, 10)}`;
}

export function slugifyShopName(input: string, userId?: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  // Prefer ascii-only public slugs for reliable URLs.
  const ascii = base
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return ascii || (userId ? stableShopFallback(userId) : "shop");
}

export function getStoreProductUrl(username: string, productId: string): string {
  return `${getSiteUrl()}/${encodeURIComponent(username)}/${productId}`;
}

export function getShopStorefrontUrl(username: string): string {
  return `${getSiteUrl()}/shop/${encodeURIComponent(username)}`;
}

export type PublicShopProduct = StoreProduct & {
  ordered_quantity: number;
};

export type PublicShopStorefront = {
  shop_name: string;
  shop_slug: string;
  shop_bio: string;
  products: PublicShopProduct[];
};

export async function getPublicShopStorefront(
  username: string
): Promise<PublicShopStorefront | null> {
  const admin = createAdminClient();
  const slug = decodeURIComponent(username).toLowerCase();
  if (RESERVED_SHOP_SLUGS.has(slug)) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("id, shop_name, shop_slug, shop_bio")
    .eq("shop_slug", slug)
    .maybeSingle();

  if (!profile) return null;

  const { data: products, error } = await admin
    .from("products")
    .select("*")
    .eq("user_id", profile.id)
    .in("status", ["active", "success"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  const expiredIds = (products || [])
    .filter(
      (p) =>
        p.mode === "group_buy" &&
        (p.status === "active" || p.status === "success") &&
        p.deadline &&
        new Date(p.deadline).getTime() < Date.now()
    )
    .map((p) => p.id);

  if (expiredIds.length) {
    await admin
      .from("products")
      .update({ status: "closed" })
      .in("id", expiredIds)
      .in("status", ["active", "success"]);
  }
  const expired = new Set(expiredIds);

  const openProducts: PublicShopProduct[] = [];
  for (const raw of products || []) {
    if (expired.has(raw.id)) continue;

    const color_options = Array.isArray(raw.color_options)
      ? raw.color_options.filter(
          (v: unknown): v is string =>
            typeof v === "string" && v.trim().length > 0
        )
      : [];
    const size_options = Array.isArray(raw.size_options)
      ? raw.size_options.filter(
          (v: unknown): v is string =>
            typeof v === "string" && v.trim().length > 0
        )
      : [];

    openProducts.push({
      ...(raw as StoreProduct),
      status: raw.status as StoreProduct["status"],
      price: Number(raw.price),
      color_options,
      size_options,
      ordered_quantity: 0,
    });
  }

  if (openProducts.length) {
    const ids = openProducts.map((p) => p.id);
    const { data: orderRows } = await admin
      .from("orders")
      .select("product_id, quantity")
      .in("product_id", ids);

    const qtyByProduct = new Map<string, number>();
    for (const row of orderRows || []) {
      qtyByProduct.set(
        row.product_id,
        (qtyByProduct.get(row.product_id) || 0) + Number(row.quantity || 0)
      );
    }
    for (const product of openProducts) {
      product.ordered_quantity = qtyByProduct.get(product.id) || 0;
    }
  }

  return {
    shop_name: profile.shop_name || slug,
    shop_slug: profile.shop_slug || slug,
    shop_bio: (profile.shop_bio as string) || "",
    products: openProducts,
  };
}

export async function ensureShopSlug(
  userId: string,
  shopName: string,
  existing?: string | null
): Promise<string> {
  if (existing && !RESERVED_SHOP_SLUGS.has(existing)) {
    return existing;
  }

  const admin = createAdminClient();
  // Re-read in case another request already assigned a slug (race).
  const { data: fresh } = await admin
    .from("profiles")
    .select("shop_slug")
    .eq("id", userId)
    .maybeSingle();
  if (fresh?.shop_slug && !RESERVED_SHOP_SLUGS.has(fresh.shop_slug)) {
    return fresh.shop_slug;
  }

  let candidate = slugifyShopName(shopName || "", userId);
  if (RESERVED_SHOP_SLUGS.has(candidate)) {
    candidate = `${candidate}-shop`;
  }

  for (let i = 0; i < 12; i += 1) {
    const trySlug = i === 0 ? candidate : `${candidate}-${i + 1}`;
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("shop_slug", trySlug)
      .maybeSingle();
    if (data && data.id !== userId) continue;

    const { error } = await admin
      .from("profiles")
      .update({ shop_slug: trySlug })
      .eq("id", userId);
    if (!error) return trySlug;

    // Unique violation — another writer won; re-read or try next candidate.
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      const { data: again } = await admin
        .from("profiles")
        .select("shop_slug")
        .eq("id", userId)
        .maybeSingle();
      if (again?.shop_slug && !RESERVED_SHOP_SLUGS.has(again.shop_slug)) {
        return again.shop_slug;
      }
      continue;
    }
    throw error;
  }

  const fallback = `${stableShopFallback(userId)}-x`;
  const { error } = await admin
    .from("profiles")
    .update({ shop_slug: fallback })
    .eq("id", userId);
  if (error) throw error;
  return fallback;
}

export type PublicStoreProduct = StoreProduct & {
  ordered_quantity: number;
  shop_name: string;
  shop_slug: string;
  bank_code: string;
  bank_account: string;
  enable_cod: boolean;
  cod_url: string | null;
  cod_label: string;
  shipping_fee: number;
  free_shipping_enabled: boolean;
  free_shipping_threshold: number | null;
};

async function closeExpiredGroupBuy(
  product: {
    id: string;
    mode: string;
    status: string;
    deadline: string | null;
  }
): Promise<string> {
  if (
    product.mode === "group_buy" &&
    (product.status === "active" || product.status === "success") &&
    product.deadline &&
    new Date(product.deadline).getTime() < Date.now()
  ) {
    const admin = createAdminClient();
    await admin
      .from("products")
      .update({ status: "closed" })
      .eq("id", product.id)
      .in("status", ["active", "success"]);
    return "closed";
  }
  return product.status;
}

export async function getPublicStoreProduct(
  username: string,
  productId: string
): Promise<PublicStoreProduct | null> {
  const admin = createAdminClient();
  const slug = decodeURIComponent(username).toLowerCase();

  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, shop_name, shop_slug, bank_code, bank_account, enable_cod, cod_url, cod_label, shipping_fee, free_shipping_enabled, free_shipping_threshold"
    )
    .eq("shop_slug", slug)
    .maybeSingle();

  if (!profile) return null;

  const { data: product, error } = await admin
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (error) throw error;
  if (!product) return null;

  product.status = await closeExpiredGroupBuy(product);

  const { data: orderRows } = await admin
    .from("orders")
    .select("quantity")
    .eq("product_id", product.id);

  const ordered_quantity = (orderRows || []).reduce(
    (sum, row) => sum + Number(row.quantity || 0),
    0
  );

  const color_options = Array.isArray(product.color_options)
    ? product.color_options.filter(
        (v: unknown): v is string => typeof v === "string" && v.trim().length > 0
      )
    : [];
  const size_options = Array.isArray(product.size_options)
    ? product.size_options.filter(
        (v: unknown): v is string => typeof v === "string" && v.trim().length > 0
      )
    : [];

  return {
    ...(product as StoreProduct),
    price: Number(product.price),
    target_quantity: product.target_quantity,
    color_options,
    size_options,
    ordered_quantity,
    shop_name: profile.shop_name || "",
    shop_slug: profile.shop_slug || slug,
    bank_code: profile.bank_code || "",
    bank_account: profile.bank_account || "",
    enable_cod: Boolean(profile.enable_cod) && Boolean(profile.cod_url),
    cod_url: profile.cod_url || null,
    cod_label:
      (typeof profile.cod_label === "string" && profile.cod_label.trim()) ||
      "外部賣場結帳（蝦皮／賣貨便等）",
    shipping_fee: Number(profile.shipping_fee) || 0,
    free_shipping_enabled: Boolean(profile.free_shipping_enabled),
    free_shipping_threshold:
      profile.free_shipping_threshold == null
        ? null
        : Number(profile.free_shipping_threshold) || 0,
  };
}

export type StoreStatsItem = StoreProduct & {
  order_count: number;
  ordered_quantity: number;
  matched_count: number;
  pending_count: number;
  fulfilled_count: number;
  unfulfilled_count: number;
  orders: StoreOrder[];
};

export type SellerPeriodMetrics = {
  revenue: number;
  orders: number;
  fulfilled: number;
  unfulfilled: number;
};

export type SellerOrderMetrics = {
  today: SellerPeriodMetrics;
  week: Pick<SellerPeriodMetrics, "revenue" | "orders">;
  month: Pick<SellerPeriodMetrics, "revenue" | "orders"> & {
    /** Alias for month.revenue — 本月總 GMV */
    gmv: number;
    pendingReconcileAmount: number;
    pendingReconcileOrders: number;
    shipCompletionRate: number;
    fulfilled: number;
    unfulfilled: number;
  };
};

function formatTaipeiYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function startOfDayTaipei(d = new Date()): Date {
  return new Date(`${formatTaipeiYmd(d)}T00:00:00+08:00`);
}

function startOfWeekTaipei(d = new Date()): Date {
  const dayStart = startOfDayTaipei(d);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = map[weekday] ?? 1;
  const daysFromMonday = (dow + 6) % 7;
  return new Date(dayStart.getTime() - daysFromMonday * 86_400_000);
}

function startOfMonthTaipei(d = new Date()): Date {
  const [y, m] = formatTaipeiYmd(d).split("-");
  return new Date(`${y}-${m}-01T00:00:00+08:00`);
}

function emptyPeriod(): SellerPeriodMetrics {
  return { revenue: 0, orders: 0, fulfilled: 0, unfulfilled: 0 };
}

/** 賣家商店訂單營收看板（Asia/Taipei 日／週／月） */
export async function getSellerOrderMetrics(
  userId: string
): Promise<SellerOrderMetrics> {
  const admin = createAdminClient();
  const { data: products, error } = await admin
    .from("products")
    .select("id")
    .eq("user_id", userId);

  if (error) throw error;
  if (!products?.length) {
    return {
      today: emptyPeriod(),
      week: { revenue: 0, orders: 0 },
      month: {
        revenue: 0,
        orders: 0,
        gmv: 0,
        pendingReconcileAmount: 0,
        pendingReconcileOrders: 0,
        shipCompletionRate: 0,
        fulfilled: 0,
        unfulfilled: 0,
      },
    };
  }

  const ids = products.map((p) => p.id);
  const monthStart = startOfMonthTaipei();
  const { data: orders, error: orderError } = await admin
    .from("orders")
    .select("total_amount, fulfillment_status, payment_status, created_at")
    .in("product_id", ids)
    .gte("created_at", monthStart.toISOString());

  if (orderError) throw orderError;

  const todayStart = startOfDayTaipei().getTime();
  const weekStart = startOfWeekTaipei().getTime();
  const monthStartMs = monthStart.getTime();

  const today = emptyPeriod();
  const week = { revenue: 0, orders: 0 };
  const month = {
    revenue: 0,
    orders: 0,
    gmv: 0,
    pendingReconcileAmount: 0,
    pendingReconcileOrders: 0,
    shipCompletionRate: 0,
    fulfilled: 0,
    unfulfilled: 0,
  };

  for (const row of orders || []) {
    const created = new Date(row.created_at).getTime();
    const amount = Number(row.total_amount) || 0;
    // 已成立訂單皆計入預估收益（商店訂單建立即成立）
    const fulfilled =
      (row.fulfillment_status as string) === "fulfilled" ? 1 : 0;
    const unfulfilled = fulfilled ? 0 : 1;
    const pendingPay = (row.payment_status as string) !== "matched";

    if (created >= monthStartMs) {
      month.revenue += amount;
      month.orders += 1;
      month.gmv += amount;
      month.fulfilled += fulfilled;
      month.unfulfilled += unfulfilled;
      if (pendingPay) {
        month.pendingReconcileAmount += amount;
        month.pendingReconcileOrders += 1;
      }
    }
    if (created >= weekStart) {
      week.revenue += amount;
      week.orders += 1;
    }
    if (created >= todayStart) {
      today.revenue += amount;
      today.orders += 1;
      today.fulfilled += fulfilled;
      today.unfulfilled += unfulfilled;
    }
  }

  const shipTotal = month.fulfilled + month.unfulfilled;
  month.shipCompletionRate =
    shipTotal > 0 ? Math.round((month.fulfilled / shipTotal) * 100) : 0;

  return { today, week, month };
}

export async function listSellerStoreStats(
  userId: string
): Promise<StoreStatsItem[]> {
  const admin = createAdminClient();
  const { data: products, error } = await admin
    .from("products")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!products?.length) return [];

  const ids = products.map((p) => p.id);
  const { data: orders, error: orderError } = await admin
    .from("orders")
    .select("*")
    .in("product_id", ids)
    .order("created_at", { ascending: false });

  if (orderError) throw orderError;

  const byProduct = new Map<string, StoreOrder[]>();
  for (const row of orders || []) {
    const list = byProduct.get(row.product_id) || [];
    const items = coerceOrderItems(row as StoreOrder);
    const fulfillment =
      (row as StoreOrder).fulfillment_status === "fulfilled"
        ? "fulfilled"
        : "unfulfilled";
    list.push({
      ...(row as StoreOrder),
      quantity: Number(row.quantity),
      total_amount: Number(row.total_amount),
      subtotal_amount:
        row.subtotal_amount == null ? null : Number(row.subtotal_amount),
      discount_amount: Number(row.discount_amount) || 0,
      shipping_fee: Number(row.shipping_fee) || 0,
      fulfillment_status: fulfillment,
      items,
      items_summary:
        (row as StoreOrder).items_summary || formatOrderItemsSummary(items),
    });
    byProduct.set(row.product_id, list);
  }

  const expiredIds = products
    .filter(
      (p) =>
        p.mode === "group_buy" &&
        (p.status === "active" || p.status === "success") &&
        p.deadline &&
        new Date(p.deadline).getTime() < Date.now()
    )
    .map((p) => p.id);

  if (expiredIds.length) {
    await admin
      .from("products")
      .update({ status: "closed" })
      .in("id", expiredIds)
      .in("status", ["active", "success"]);
  }

  const expired = new Set(expiredIds);
  return products.map((p) => {
    const list = byProduct.get(p.id) || [];
    const ordered_quantity = list.reduce((s, o) => s + o.quantity, 0);
    const fulfilled_count = list.filter(
      (o) => o.fulfillment_status === "fulfilled"
    ).length;
    return {
      ...(p as StoreProduct),
      status: (expired.has(p.id) ? "closed" : p.status) as StoreProduct["status"],
      price: Number(p.price),
      order_count: list.length,
      ordered_quantity,
      matched_count: list.filter((o) => o.payment_status === "matched").length,
      pending_count: list.filter((o) => o.payment_status === "pending").length,
      fulfilled_count,
      unfulfilled_count: list.length - fulfilled_count,
      orders: list,
    };
  });
}

export type SellerOrderListItem = StoreOrder & {
  product_title: string;
  product_mode: StoreProduct["mode"] | null;
  product_cod_url?: string | null;
  product_cod_label?: string | null;
  product_enable_cod?: boolean;
};

/** Flat seller order list for /dashboard/orders fulfillment management. */
export async function listSellerOrders(
  userId: string
): Promise<SellerOrderListItem[]> {
  const admin = createAdminClient();
  const [{ data: products, error }, { data: profile }] = await Promise.all([
    admin.from("products").select("id, title, mode").eq("user_id", userId),
    admin
      .from("profiles")
      .select("enable_cod, cod_url, cod_label")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (error) throw error;
  if (!products?.length) return [];

  const sellerCod = {
    enable_cod: Boolean(profile?.enable_cod) && Boolean(profile?.cod_url),
    cod_url: (profile?.cod_url as string) || null,
    cod_label:
      (typeof profile?.cod_label === "string" && profile.cod_label.trim()) ||
      "賣貨便／蝦皮",
  };

  const productMap = new Map(
    products.map((p) => [
      p.id,
      {
        title: p.title as string,
        mode: p.mode as StoreProduct["mode"],
      },
    ])
  );
  const ids = products.map((p) => p.id);

  const { data: orders, error: orderError } = await admin
    .from("orders")
    .select("*")
    .in("product_id", ids)
    .order("created_at", { ascending: false });

  if (orderError) throw orderError;

  return (orders || []).map((row) => {
    const items = coerceOrderItems(row as StoreOrder);
    const fulfillment =
      (row as StoreOrder).fulfillment_status === "fulfilled"
        ? "fulfilled"
        : "unfulfilled";
    const product = productMap.get(row.product_id);
    return {
      ...(row as StoreOrder),
      quantity: Number(row.quantity),
      total_amount: Number(row.total_amount),
      subtotal_amount:
        row.subtotal_amount == null ? null : Number(row.subtotal_amount),
      discount_amount: Number(row.discount_amount) || 0,
      shipping_fee: Number(row.shipping_fee) || 0,
      fulfillment_status: fulfillment,
      items,
      items_summary:
        (row as StoreOrder).items_summary || formatOrderItemsSummary(items),
      product_title: product?.title || "商品",
      product_mode: product?.mode || null,
      product_enable_cod: sellerCod.enable_cod,
      product_cod_url: sellerCod.cod_url,
      product_cod_label: sellerCod.cod_label,
    };
  });
}

export function profileSlug(profile: Pick<Profile, "shop_slug">): string | null {
  return profile.shop_slug?.trim() || null;
}
