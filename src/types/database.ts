export type PlanType = "free" | "starter" | "pro" | "unlimited";
/** Legacy plan ids still accepted from older rows / checkout payloads */
export type LegacyPlanType = "plus" | "premium";
export type BillingCycle = "monthly" | "half_yearly" | "yearly";
export type ReportStatus =
  | "pending"
  | "confirmed"
  | "auto_confirmed"
  | "rejected"
  | "needs_contact";

export type ContactPlatform = "ig" | "threads" | "line";

export type DiscountTier = "lifetime_special";

export interface Profile {
  id: string;
  shop_name: string;
  /** Public storefront slug used in /[username]/[productId] */
  shop_slug?: string | null;
  /** Public storefront bio shown on /shop/[username] */
  shop_bio?: string | null;
  bank_code: string;
  bank_account: string;
  line_user_id: string | null;
  /**
   * Seller's own LINE Official Account Channel Access Token.
   * When set, seller notifications are pushed via this token.
   */
  line_channel_access_token?: string | null;
  /** Seller's LINE Channel Secret (optional; for future webhook verification). */
  line_channel_secret?: string | null;
  /** 啟用外部結帳連結（賣貨便／好賣+／蝦皮／其他專屬連結） */
  enable_cod?: boolean | null;
  /** 外部結帳網址 */
  cod_url?: string | null;
  /** 買家看到的選項名稱，例如：蝦皮下單、7-11 賣貨便 */
  cod_label?: string | null;
  /** 預設固定運費（新台幣） */
  shipping_fee?: number | null;
  /** 是否啟用滿額免運 */
  free_shipping_enabled?: boolean | null;
  /** 滿額免運門檻；null/0 且開啟時視為全館免運 */
  free_shipping_threshold?: number | null;
  /** Asia/Taipei YYYY-MM-DD of last daily LINE digest */
  last_daily_digest_on?: string | null;
  plan_type: PlanType | LegacyPlanType | string;
  billing_cycle?: BillingCycle | null;
  trial_ends_at?: string | null;
  /** Paid plan end time (UTC ISO). null = never expires (e.g. admin). */
  expires_at?: string | null;
  /** Reminder dedupe: expires_at value when 3-day mail was sent */
  expiry_reminder_3d_for?: string | null;
  /** Reminder dedupe: expires_at value when 1-day mail was sent */
  expiry_reminder_1d_for?: string | null;
  /** Admin-approved 特約店家 (DB column kept as is_early_bird). */
  is_early_bird?: boolean | null;
  /** lifetime_special = permanent 特約店家 checkout discount */
  discount_tier?: DiscountTier | string | null;
  /** 註冊早鳥：前 15 名限量 14 天試用 */
  signup_early_bird?: boolean | null;
  monthly_usage_count: number;
  usage_month: string;
  created_at: string;
}

export type ProductMode = "agency" | "group_buy";
export type ProductStatus = "active" | "success" | "closed";
export type OrderPaymentStatus = "pending" | "matched";
export type OrderFulfillmentStatus = "unfulfilled" | "fulfilled";
/** atm = ATM 轉帳；myship_cod = 外部連結結帳（賣貨便／蝦皮等） */
export type OrderPaymentType = "atm" | "myship_cod";
export type ConvenienceStoreType = "711" | "family";
/** percentage: 90 = 九折；fixed: 折固定金額 */
export type CouponDiscountType = "percentage" | "fixed";
/** unlimited=不限總次數(每人手機仍限一次)；limited=全店總限量 */
export type CouponUsageType = "unlimited" | "limited";

export interface Coupon {
  id: string;
  seller_id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  min_spend: number | null;
  usage_type: CouponUsageType;
  /** Only used when usage_type = limited */
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  seller_id: string;
  phone: string;
  order_id?: string | null;
  created_at: string;
}

export interface StoreProduct {
  id: string;
  user_id: string;
  title: string;
  price: number;
  mode: ProductMode;
  /** 團購目標成團數量（件）；agency 為 null */
  target_quantity: number | null;
  /** 目前已累積訂購數量 */
  current_quantity?: number;
  /** 是否已達成團門檻（避免重複 LINE 通知） */
  is_target_reached?: boolean;
  deadline: string | null;
  status: ProductStatus;
  variant_note: string;
  /** Seller-defined color choices shown on the buyer page */
  color_options?: string[];
  /** Seller-defined size choices shown on the buyer page */
  size_options?: string[];
  image_url: string;
  /**
   * Max sellable units. null = unlimited.
   * Remaining ≈ stock - ordered_quantity.
   */
  stock?: number | null;
  /** Preorder mode badge + notice on storefront */
  is_preorder?: boolean;
  /** e.g.「預計 12/20 從日本發貨」 */
  preorder_notice?: string;
  created_at: string;
}

/** One variant line inside a multi-spec order. */
export type OrderLineItem = {
  color: string;
  size: string;
  quantity: number;
};

export interface StoreOrder {
  id: string;
  product_id: string;
  buyer_name: string;
  quantity: number;
  total_amount: number;
  atm_last5: string;
  payment_status: OrderPaymentStatus;
  /** atm | myship_cod */
  payment_type?: OrderPaymentType | string | null;
  /** unfulfilled = 未出貨, fulfilled = 已出貨 */
  fulfillment_status: OrderFulfillmentStatus;
  /** 711 | family */
  store_type?: ConvenienceStoreType | null;
  /** 門市名稱與店號 */
  store_info?: string | null;
  /** 收件手機 */
  receiver_phone?: string | null;
  /** Legacy single-variant fields (kept for older rows / quick glance) */
  selected_color?: string | null;
  selected_size?: string | null;
  /** Multi-variant line items */
  items?: OrderLineItem[] | null;
  /** Seller-facing summary of all variants */
  items_summary?: string | null;
  coupon_id?: string | null;
  coupon_code?: string | null;
  discount_amount?: number;
  /** 商品小計（折抵前） */
  subtotal_amount?: number | null;
  /** 該筆實際運費（免運為 0） */
  shipping_fee?: number | null;
  created_at: string;
}

export const STORE_TYPE_LABELS: Record<ConvenienceStoreType, string> = {
  "711": "7-11 超商取貨",
  family: "全家超商取貨",
};

export interface PaymentReport {
  id: string;
  seller_id: string;
  buyer_name: string;
  /** IG / Threads / LINE 暱稱（防失聯必填） */
  buyer_contact?: string | null;
  contact_platform?: ContactPlatform | string | null;
  /** 買家轉帳銀行（對照銀行 App） */
  transfer_bank?: string | null;
  amount: number;
  bank_last_five: string;
  note: string | null;
  status: ReportStatus;
  created_at: string;
}

export interface ShopPublic {
  id: string;
  shop_name: string;
  bank_code: string;
  bank_account: string;
}

export type PaidPlanKey = "starter" | "pro" | "unlimited";

export type CyclePrice = {
  total: number;
  avgMonthly: number;
};

export type PlanDefinition = {
  id: PlanType;
  name: string;
  /** -1 = unlimited */
  monthlyQuota: number;
  isPopular: boolean;
  popularBadge?: string;
  blurb: string;
  features: string[];
  prices: Record<BillingCycle, CyclePrice>;
};

export type CycleDefinition = {
  id: BillingCycle;
  label: string;
  discount: number;
  badge?: string;
  months: number;
};

/** 價格與方案單一來源（對齊產品 pricingConfig） */
export const PRICING_CONFIG = {
  currency: "NTD",
  freeTrial: {
    enabled: true,
    durationDays: 7,
    description:
      "於後台點「開始免費試用七天」後開通全功能，倒數 7 天（註冊本身不會開始試用）",
    /** Dashboard CTA label */
    startButtonLabel: "開始免費試用七天",
  },
  /**
   * 早鳥（本站獨立名額）：後台點開始試用時占用；限量前 N 名。
   * 終身續約：月繳 9 折／半年繳 85 折／年繳 8 折（與特約店家分開計算）
   */
  signupEarlyBird: {
    maxUsers: 15,
    trialDays: 7,
    label: "早鳥優惠",
    description:
      "早鳥限定 15 名：後台開始試用後享 7 天全功能，續約終身月繳 9 折、半年 85 折、整年 8 折",
    discountTier: "signup_early_bird" as const,
    cycleMultipliers: {
      monthly: 0.9,
      half_yearly: 0.85,
      yearly: 0.8,
    } satisfies Record<BillingCycle, number>,
  },
  /** 特約店家（DB／程式仍使用 is_early_bird + lifetime_special） */
  earlyBird: {
    /** null = 不限量 */
    maxSeats: null as number | null,
    trialDays: 14,
    /**
     * lifetime_special：對齊 NovaOS hub VIP 特約折扣
     * 月繳 9 折 / 半年繳 82 折 / 年繳 75 折
     */
    cycleMultipliers: {
      monthly: 0.9,
      half_yearly: 0.82,
      yearly: 0.75,
    } satisfies Record<BillingCycle, number>,
    discountTier: "lifetime_special" as const,
    label: "特約店家專屬優惠",
    applyLabel: "申請特約店家",
    pitchTitle: "誠徵特約店家",
    pitch:
      "進單、出貨穩定即可申請，私訊官方 LINE 並出示賣場連結，我們審核通過後即享特約店家專屬優惠！",
    description:
      "審核通過後由管理員開通；贈 14 天全功能試用，之後每次續約終身享月繳 9 折、半年繳 82 折、年繳 75 折（與拓新雲端 NovaOS 特約規則一致）。不限名額。",
    termsTitle: "特約店家合作條款",
    terms: [
      "申請人須能證明近 1～3 個月進單、出貨量穩定，並依官方要求提供賣場連結或其他可查核資料供審核。",
      "審核通過成為特約店家後，同意協助推廣 NovaStore 本網站（含但不限於社群、賣場簡介或買家常見路徑之合理曝光）。",
      "日後官方舉辦行銷或合作活動時，特約店家應於合理範圍內配合推廣；若長期未配合或進單／出貨明顯不符特約標準，官方得調整或取消特約資格與專屬優惠。",
      "特約專屬費率（月繳 9 折、半年繳 82 折、年繳 75 折）對齊拓新雲端 NovaOS 主站（paycheck.com.de），為終身續約優惠，僅適用通過審核並維持特約資格之帳號；資格異動以官方通知為準。若子站與主站文案衝突，以主站為準。",
      "特約優惠適用 NovaStore 與拓脈預約連動；不含訂閱管家（永久免費）與拓維空間獨立 Credit 方案。",
      "本條款得依營運需要更新；重大變更將透過官方 LINE 或站內公告告知。繼續使用特約權益即視為同意更新後條款。",
    ],
  },
  billingCycles: {
    monthly: {
      id: "monthly" as const,
      label: "月繳",
      discount: 1.0,
      months: 1,
    },
    half_yearly: {
      id: "half_yearly" as const,
      label: "半年繳 (省 10%)",
      discount: 0.9,
      badge: "省 10%",
      months: 6,
    },
    yearly: {
      id: "yearly" as const,
      label: "年繳",
      /** Display fold for general tier — hub authority is 0.85 (see paycheck pricing-tiers) */
      discount: 0.85,
      badge: "對齊主站一般資格 85 折",
      months: 12,
    },
  } satisfies Record<BillingCycle, CycleDefinition>,
  defaultCycle: "monthly" as BillingCycle,
  plans: {
    free: {
      id: "free",
      name: "免費版",
      monthlyQuota: 15,
      isPopular: false,
      blurb: "適合體驗",
      features: [
        "每月 15 筆站內 ATM 自動對帳額度",
        "買家填寫匯款末五碼自動勾稽",
        "7-11 賣貨便／蝦皮外部導流",
        "基礎訂單管理後台",
      ],
      prices: {
        monthly: { total: 0, avgMonthly: 0 },
        half_yearly: { total: 0, avgMonthly: 0 },
        yearly: { total: 0, avgMonthly: 0 },
      },
    },
    starter: {
      id: "starter",
      name: "專業版",
      /** -1 = 無限筆數 */
      monthlyQuota: -1,
      isPopular: true,
      popularBadge: "主推方案",
      blurb: "穩定出單賣家的主力方案",
      features: [
        "無限筆數站內 ATM 自動對帳",
        "固定運費與滿額免運優惠設定",
        "LINE 每日帳務彙整通知",
        "7-11 賣貨便／蝦皮無縫導流",
      ],
      // Prices locked to NovaOS hub catalog (owner authority 2026-11-22)
      prices: {
        monthly: { total: 299, avgMonthly: 299 },
        half_yearly: { total: 1794, avgMonthly: 299 },
        yearly: { total: 3588, avgMonthly: 299 },
      },
    },
    pro: {
      id: "pro",
      name: "旗艦版",
      monthlyQuota: -1,
      isPopular: false,
      blurb: "多品牌與數據成長需求",
      features: [
        "包含專業版所有功能",
        "多賣場／多品牌切換管理",
        "營收與熱門商品數據分析",
        "專屬優先技術支援",
      ],
      // Aligned to NovaOS hub unlimited / 旗艦 base prices
      prices: {
        monthly: { total: 499, avgMonthly: 499 },
        half_yearly: { total: 2994, avgMonthly: 499 },
        yearly: { total: 5988, avgMonthly: 499 },
      },
    },
    /** Legacy alias of 旗艦版 — kept for existing subscribers */
    unlimited: {
      id: "unlimited",
      name: "旗艦版",
      monthlyQuota: -1,
      isPopular: false,
      blurb: "多品牌與數據成長需求",
      features: [
        "包含專業版所有功能",
        "多賣場／多品牌切換管理",
        "營收與熱門商品數據分析",
        "專屬優先技術支援",
      ],
      prices: {
        monthly: { total: 499, avgMonthly: 499 },
        half_yearly: { total: 2994, avgMonthly: 499 },
        yearly: { total: 5988, avgMonthly: 499 },
      },
    },
  } satisfies Record<PlanType, PlanDefinition>,
} as const;

export const BILLING_CYCLES = PRICING_CONFIG.billingCycles;
export const FREE_TRIAL = PRICING_CONFIG.freeTrial;
export const SIGNUP_EARLY_BIRD = PRICING_CONFIG.signupEarlyBird;
export const EARLY_BIRD = PRICING_CONFIG.earlyBird;
export const PLAN_CATALOG = PRICING_CONFIG.plans;
/** All paid plan ids accepted by checkout / DB */
export const PAID_PLAN_KEYS: PaidPlanKey[] = ["starter", "pro", "unlimited"];
/** Marketing + upgrade UI：1 免費 + 2 收費（與拓脈架構對齊） */
export const PRIMARY_PAID_PLAN_KEYS: PaidPlanKey[] = ["starter", "pro"];
export const LANDING_PLAN_KEYS: Array<"free" | PaidPlanKey> = [
  "free",
  "starter",
  "pro",
];

export const FREE_PLAN_LIMIT = PLAN_CATALOG.free.monthlyQuota;
export const STARTER_PLAN_LIMIT = PLAN_CATALOG.starter.monthlyQuota;
export const PRO_PLAN_LIMIT = PLAN_CATALOG.pro.monthlyQuota;

/** @deprecated use STARTER_PLAN_LIMIT */
export const PLUS_PLAN_LIMIT = STARTER_PLAN_LIMIT;

export const PLAN_RANK: Record<PlanType, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  unlimited: 2,
};

export function normalizeBillingCycle(
  cycle: string | null | undefined
): BillingCycle {
  if (cycle === "half_yearly" || cycle === "halfYearly") return "half_yearly";
  if (cycle === "yearly") return "yearly";
  return "monthly";
}

export function normalizePlan(
  plan: string | null | undefined
): PlanType {
  if (plan === "starter" || plan === "plus") return "starter";
  // New purchases use `pro`；既有 unlimited 訂戶維持原 id
  if (plan === "pro" || plan === "premium") return "pro";
  if (plan === "unlimited") return "unlimited";
  return "free";
}

export function isPaidPlan(plan: string | null | undefined): plan is PaidPlanKey {
  const p = normalizePlan(plan);
  return p === "starter" || p === "pro" || p === "unlimited";
}

/**
 * Profiles created before this instant may keep auto-started DB-trigger trials.
 * After this gate, trial is only active when activated via the dashboard button
 * (discount_tier = activated_trial | signup_early_bird | lifetime_special).
 */
export const PROMO_TRIAL_GATE_AT_MS = Date.parse("2026-11-22T00:00:00.000Z");

export const TRIAL_ACTIVATED_TIER = "activated_trial" as const;

export type TrialActiveOptions = {
  now?: Date;
  createdAt?: string | null;
  discountTier?: string | null;
  isEarlyBird?: boolean | null;
};

function resolveTrialOptions(
  nowOrOpts?: Date | TrialActiveOptions,
  maybeOpts?: TrialActiveOptions
): TrialActiveOptions {
  if (nowOrOpts instanceof Date || nowOrOpts === undefined) {
    return {
      ...(maybeOpts || {}),
      now: nowOrOpts instanceof Date ? nowOrOpts : maybeOpts?.now,
    };
  }
  return nowOrOpts;
}

export function isTrialActivationTier(
  discountTier?: string | null
): boolean {
  return (
    discountTier === TRIAL_ACTIVATED_TIER ||
    discountTier === SIGNUP_EARLY_BIRD.discountTier ||
    discountTier === EARLY_BIRD.discountTier
  );
}

export function isTrialActive(
  trialEndsAt: string | null | undefined,
  nowOrOpts?: Date | TrialActiveOptions,
  maybeOpts?: TrialActiveOptions
): boolean {
  if (!FREE_TRIAL.enabled || !trialEndsAt) return false;
  const opts = resolveTrialOptions(nowOrOpts, maybeOpts);
  const now = opts.now ?? new Date();
  const ends = new Date(trialEndsAt);
  if (Number.isNaN(ends.getTime()) || ends.getTime() <= now.getTime()) {
    return false;
  }

  // Legacy auto-started trials (before promo gate)
  if (opts.createdAt) {
    const createdMs = Date.parse(opts.createdAt);
    if (
      !Number.isNaN(createdMs) &&
      createdMs < PROMO_TRIAL_GATE_AT_MS
    ) {
      return true;
    }
  } else if (nowOrOpts instanceof Date || nowOrOpts === undefined) {
    // Call sites that only pass a Date keep date-only behaviour for cron/legacy
    if (!maybeOpts) return true;
  }

  return (
    isTrialActivationTier(opts.discountTier) || Boolean(opts.isEarlyBird)
  );
}

/** null = unlimited（含試用期間全功能／管理者） */
export function getPlanLimit(
  plan: PlanType | string | null | undefined,
  trialEndsAt?: string | null,
  options?: {
    isAdmin?: boolean;
    expiresAt?: string | null;
    createdAt?: string | null;
    discountTier?: string | null;
    isEarlyBird?: boolean | null;
  }
): number | null {
  if (options?.isAdmin) return null;
  if (
    isTrialActive(trialEndsAt, {
      createdAt: options?.createdAt,
      discountTier: options?.discountTier,
      isEarlyBird: options?.isEarlyBird,
    })
  ) {
    return null;
  }
  // Expired paid subscription → free quota
  if (
    isPaidPlan(plan) &&
    options?.expiresAt &&
    new Date(options.expiresAt).getTime() <= Date.now()
  ) {
    return FREE_PLAN_LIMIT;
  }
  const p = normalizePlan(plan);
  const quota = PLAN_CATALOG[p].monthlyQuota;
  return quota < 0 ? null : quota;
}

export function getPlanDisplayName(
  plan: PlanType | string | null | undefined
): string {
  return PLAN_CATALOG[normalizePlan(plan)].name;
}

export function hasLifetimeSpecialDiscount(
  discountTier?: string | null,
  isEarlyBird?: boolean | null
): boolean {
  if (discountTier === EARLY_BIRD.discountTier) return true;
  return Boolean(isEarlyBird);
}

export function hasSignupEarlyBirdDiscount(
  discountTier?: string | null,
  signupEarlyBird?: boolean | null
): boolean {
  if (discountTier === SIGNUP_EARLY_BIRD.discountTier) return true;
  return Boolean(signupEarlyBird);
}

export function getEarlyBirdMultiplier(cycle: BillingCycle): number {
  return EARLY_BIRD.cycleMultipliers[normalizeBillingCycle(cycle)];
}

export function getSignupEarlyBirdMultiplier(cycle: BillingCycle): number {
  return SIGNUP_EARLY_BIRD.cycleMultipliers[normalizeBillingCycle(cycle)];
}

/** Human-readable fold label, e.g. 0.8 →「8 折」、0.75 →「75 折」 */
export function formatDiscountFold(multiplier: number): string {
  const pct = Math.round(multiplier * 100);
  if (pct % 10 === 0) return `${pct / 10} 折`;
  return `${pct} 折`;
}

export function getCheckoutAmount(
  plan: PaidPlanKey,
  cycle: BillingCycle,
  options?: {
    discountTier?: string | null;
    isEarlyBird?: boolean | null;
    signupEarlyBird?: boolean | null;
  }
): number {
  const normalized = normalizeBillingCycle(cycle);
  const base = PLAN_CATALOG[plan].prices[normalized].total;
  // Partner VIP takes precedence over launch early-bird
  if (
    hasLifetimeSpecialDiscount(options?.discountTier, options?.isEarlyBird)
  ) {
    return Math.max(1, Math.round(base * getEarlyBirdMultiplier(normalized)));
  }
  if (
    hasSignupEarlyBirdDiscount(
      options?.discountTier,
      options?.signupEarlyBird
    )
  ) {
    return Math.max(
      1,
      Math.round(base * getSignupEarlyBirdMultiplier(normalized))
    );
  }
  return base;
}

export function getCycleAvgMonthly(
  plan: PaidPlanKey,
  cycle: BillingCycle,
  options?: {
    discountTier?: string | null;
    isEarlyBird?: boolean | null;
    signupEarlyBird?: boolean | null;
  }
): number {
  const normalized = normalizeBillingCycle(cycle);
  const base = PLAN_CATALOG[plan].prices[normalized].avgMonthly;
  if (
    hasLifetimeSpecialDiscount(options?.discountTier, options?.isEarlyBird)
  ) {
    return Math.max(1, Math.round(base * getEarlyBirdMultiplier(normalized)));
  }
  if (
    hasSignupEarlyBirdDiscount(
      options?.discountTier,
      options?.signupEarlyBird
    )
  ) {
    return Math.max(
      1,
      Math.round(base * getSignupEarlyBirdMultiplier(normalized))
    );
  }
  return base;
}

export function getCycleLabel(cycle: BillingCycle): string {
  return BILLING_CYCLES[normalizeBillingCycle(cycle)].label;
}

export function isDowngrade(from: PlanType, to: PlanType): boolean {
  return PLAN_RANK[to] < PLAN_RANK[from];
}

export function trialEndsAtFromNow(now: Date = new Date()): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + FREE_TRIAL.durationDays);
  return d.toISOString();
}

/** NovaStore：所有方案（含免費／試用）皆標配智慧自動對帳 */
export function canUseAutoReconcile(
  _plan?: PlanType | string | null,
  _trialEndsAt?: string | null,
  options?: { isAdmin?: boolean; expiresAt?: string | null }
): boolean {
  if (options?.isAdmin) return true;
  return true;
}
