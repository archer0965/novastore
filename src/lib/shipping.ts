export type ShippingSettings = {
  shipping_fee: number;
  free_shipping_enabled: boolean;
  /** null/undefined/0 + enabled = free shipping for all orders */
  free_shipping_threshold: number | null;
};

export type ShippingQuote = {
  merchandiseTotal: number;
  baseShippingFee: number;
  shippingFee: number;
  freeShippingApplied: boolean;
  freeShippingEnabled: boolean;
  freeShippingThreshold: number | null;
  /** true when enabled and threshold is 0/null (全館免運) */
  storewideFreeShipping: boolean;
  grandTotal: number;
  remainingToFreeShipping: number | null;
};

function asMoney(n: unknown, fallback = 0): number {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return fallback;
  return Math.round(v);
}

export function normalizeShippingSettings(
  raw: Partial<ShippingSettings> | null | undefined
): ShippingSettings {
  const thresholdRaw = raw?.free_shipping_threshold;
  return {
    shipping_fee: asMoney(raw?.shipping_fee, 0),
    free_shipping_enabled: Boolean(raw?.free_shipping_enabled),
    free_shipping_threshold:
      thresholdRaw == null || thresholdRaw === ("" as unknown)
        ? null
        : asMoney(thresholdRaw, 0),
  };
}

/**
 * merchandiseTotal = goods payable after coupon (or raw subtotal if no coupon).
 * total = merchandiseTotal + shippingFee
 */
export function quoteShipping(
  merchandiseTotalRaw: number,
  settingsRaw: Partial<ShippingSettings> | null | undefined
): ShippingQuote {
  const settings = normalizeShippingSettings(settingsRaw);
  const merchandiseTotal = asMoney(merchandiseTotalRaw, 0);
  const baseShippingFee = settings.shipping_fee;
  const threshold = settings.free_shipping_threshold;
  const storewideFreeShipping =
    settings.free_shipping_enabled && (threshold == null || threshold <= 0);

  let freeShippingApplied = false;
  if (settings.free_shipping_enabled) {
    if (storewideFreeShipping) {
      freeShippingApplied = true;
    } else if (threshold != null && merchandiseTotal >= threshold) {
      freeShippingApplied = true;
    }
  }

  const shippingFee = freeShippingApplied ? 0 : baseShippingFee;
  const remainingToFreeShipping =
    settings.free_shipping_enabled &&
    !storewideFreeShipping &&
    threshold != null &&
    merchandiseTotal < threshold
      ? threshold - merchandiseTotal
      : null;

  return {
    merchandiseTotal,
    baseShippingFee,
    shippingFee,
    freeShippingApplied,
    freeShippingEnabled: settings.free_shipping_enabled,
    freeShippingThreshold: threshold,
    storewideFreeShipping,
    grandTotal: merchandiseTotal + shippingFee,
    remainingToFreeShipping,
  };
}
