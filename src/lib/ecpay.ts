import crypto from "crypto";

export type EcpayOrderInput = {
  merchantTradeNo: string;
  totalAmount: number;
  tradeDesc: string;
  itemName: string;
  returnURL: string;
  clientBackURL?: string;
  customField1?: string;
  customField2?: string;
};

export type EcpayConfig = {
  MerchantID: string;
  HashKey: string;
  HashIV: string;
  paymentUrl: string;
  isStage: boolean;
};

/** Official ECPay staging credentials (MerchantID 2000132, no 3D) */
export const ECPAY_STAGE_DEFAULTS = {
  MerchantID: "2000132",
  HashKey: "5294y06JbISpM5x9",
  HashIV: "v77hoKGq4kWxNNIS",
} as const;

/**
 * Auto-select stage vs production:
 * - ECPAY_STAGE=true|1|yes → stage
 * - ECPAY_STAGE=false|0|no → production (requires env credentials)
 * - unset → stage when NODE_ENV !== "production", else production
 */
export function isEcpayStage(): boolean {
  const flag = (process.env.ECPAY_STAGE || "").trim().toLowerCase();
  if (["1", "true", "yes", "stage", "test"].includes(flag)) return true;
  if (["0", "false", "no", "prod", "production"].includes(flag)) return false;
  return process.env.NODE_ENV !== "production";
}

function trimEnv(name: string): string {
  return (process.env[name] || "").trim();
}

/**
 * Which ECPay checkout methods to offer.
 * Default ALL — Credit alone fails with 10200074 when card collection is not enabled.
 * Override with ECPAY_CHOOSE_PAYMENT=Credit|ATM|CVS|...
 */
export function getEcpayChoosePayment(): string {
  const raw = trimEnv("ECPAY_CHOOSE_PAYMENT").toLowerCase();
  const map: Record<string, string> = {
    all: "ALL",
    credit: "Credit",
    webatm: "WebATM",
    atm: "ATM",
    cvs: "CVS",
    barcode: "BARCODE",
    applepay: "ApplePay",
    twqr: "TWQR",
    bnpl: "BNPL",
    weixin: "WeiXin",
    digitalpayment: "DigitalPayment",
  };
  if (!raw) return "ALL";
  return map[raw] || trimEnv("ECPAY_CHOOSE_PAYMENT") || "ALL";
}

export function getEcpayConfig(): EcpayConfig {
  const stage = isEcpayStage();

  if (stage) {
    return {
      MerchantID: trimEnv("ECPAY_MERCHANT_ID") || ECPAY_STAGE_DEFAULTS.MerchantID,
      HashKey: trimEnv("ECPAY_HASH_KEY") || ECPAY_STAGE_DEFAULTS.HashKey,
      HashIV: trimEnv("ECPAY_HASH_IV") || ECPAY_STAGE_DEFAULTS.HashIV,
      paymentUrl: "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
      isStage: true,
    };
  }

  const MerchantID = trimEnv("ECPAY_MERCHANT_ID");
  const HashKey = trimEnv("ECPAY_HASH_KEY");
  const HashIV = trimEnv("ECPAY_HASH_IV");

  if (!MerchantID || !HashKey || !HashIV) {
    throw new Error(
      "Production ECPay requires ECPAY_MERCHANT_ID, ECPAY_HASH_KEY, ECPAY_HASH_IV"
    );
  }

  // Safety: never silently use stage merchant in production mode
  if (MerchantID === ECPAY_STAGE_DEFAULTS.MerchantID) {
    console.warn(
      "[ECPay] Production mode is using stage MerchantID 2000132 — check ECPAY_STAGE / credentials"
    );
  }

  return {
    MerchantID,
    HashKey,
    HashIV,
    paymentUrl: "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5",
    isStage: false,
  };
}

/** ECPay URL-encode rules for CheckMacValue */
export function ecpayUrlEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function sortedQuery(
  params: Record<string, string | number>,
  hashKey: string,
  hashIV: string
): string {
  const sorted = Object.keys(params)
    .filter(
      (k) =>
        k !== "CheckMacValue" &&
        params[k] !== undefined &&
        params[k] !== null &&
        params[k] !== ""
    )
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  return `HashKey=${hashKey}&${sorted}&HashIV=${hashIV}`;
}

export function generateCheckMacValue(
  params: Record<string, string | number>,
  hashKey?: string,
  hashIV?: string
): string {
  const cfg = getEcpayConfig();
  const raw = sortedQuery(params, hashKey || cfg.HashKey, hashIV || cfg.HashIV);
  const encoded = ecpayUrlEncode(raw).toLowerCase();
  return crypto.createHash("md5").update(encoded).digest("hex").toUpperCase();
}

export function generateCheckMacValueSha256(
  params: Record<string, string | number>,
  hashKey?: string,
  hashIV?: string
): string {
  const cfg = getEcpayConfig();
  const raw = sortedQuery(params, hashKey || cfg.HashKey, hashIV || cfg.HashIV);
  const encoded = ecpayUrlEncode(raw).toLowerCase();
  return crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

/** Prefer SHA256 (EncryptType=1); also accept MD5 for legacy callbacks. */
export function verifyCheckMacValueAuto(
  params: Record<string, string>
): boolean {
  const incoming = (params.CheckMacValue || "").toUpperCase();
  if (!incoming) return false;
  const sha = generateCheckMacValueSha256(params);
  const md5 = generateCheckMacValue(params);
  return incoming === sha || incoming === md5;
}

export function verifyCheckMacValue(params: Record<string, string>): boolean {
  return verifyCheckMacValueAuto(params);
}

/** ECPay expects local merchant time; always format in Asia/Taipei on Vercel (UTC). */
function formatTradeDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value || "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}/${get("month")}/${get("day")} ${hour}:${get("minute")}:${get("second")}`;
}

/** ECPay TradeDesc/ItemName reject many punctuation marks — keep CJK/alnum/space. */
export function sanitizeEcpayText(value: string, maxLen: number): string {
  return value
    .replace(/[^\u4e00-\u9fffA-Za-z0-9\s_\-.#]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function buildCheckoutParams(input: EcpayOrderInput) {
  const { MerchantID, paymentUrl, isStage } = getEcpayConfig();

  const params: Record<string, string> = {
    MerchantID,
    MerchantTradeNo: input.merchantTradeNo,
    MerchantTradeDate: formatTradeDate(),
    PaymentType: "aio",
    TotalAmount: String(Math.max(1, Math.round(Number(input.totalAmount) || 0))),
    TradeDesc: sanitizeEcpayText(input.tradeDesc, 200),
    ItemName: sanitizeEcpayText(input.itemName, 400),
    ReturnURL: input.returnURL,
    // ALL shows methods the merchant actually enabled (avoids 10200074 when Credit is closed)
    ChoosePayment: getEcpayChoosePayment(),
    EncryptType: "1",
  };

  if (input.clientBackURL) params.ClientBackURL = input.clientBackURL;
  if (input.customField1) params.CustomField1 = input.customField1;
  if (input.customField2) params.CustomField2 = input.customField2;

  const CheckMacValue = generateCheckMacValueSha256(params);
  return {
    paymentUrl,
    isStage,
    params: { ...params, CheckMacValue },
  };
}

export function buildAutoSubmitHtml(
  paymentUrl: string,
  params: Record<string, string>
): string {
  const fields = Object.entries(params)
    .map(
      ([key, value]) =>
        `<input type="hidden" name="${key}" value="${String(value).replace(/"/g, "&quot;")}" />`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>前往綠界付款…</title>
</head>
<body>
  <p style="font-family:sans-serif;text-align:center;margin-top:3rem;">正在前往綠界付款頁面…</p>
  <form id="ecpay" method="post" action="${paymentUrl}">
    ${fields}
  </form>
  <script>document.getElementById('ecpay').submit();</script>
</body>
</html>`;
}
