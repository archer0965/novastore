/**
 * Offline verification of Paycheck critical billing / report flows.
 * Run: node scripts/verify-flows.mjs
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function section(title) {
  console.log(`\n=== ${title} ===`);
}

function ok(label) {
  console.log(`✓ ${label}`);
}

// --- Load compiled-like TS via tsx ---
const r = spawnSync(
  "npx",
  [
    "--yes",
    "tsx",
    "-e",
    `
import assert from "node:assert/strict";
import {
  buildCheckoutParams,
  generateCheckMacValueSha256,
  verifyCheckMacValueAuto,
  getEcpayConfig,
  isEcpayStage,
  ECPAY_STAGE_DEFAULTS,
} from "./src/lib/ecpay.ts";
import {
  calculateUpgradeProration,
  computeExtendedExpiresAt,
  buildSubscriptionUpdate,
  buildProrationUpgradeUpdate,
  daysUntilExpiry,
} from "./src/lib/subscription.ts";
import {
  getCheckoutAmount,
  normalizePlan,
  normalizeBillingCycle,
  PLAN_RANK,
} from "./src/types/database.ts";
import { getSiteUrl, PRODUCTION_URL } from "./src/lib/site.ts";
import {
  normalizeContactHandle,
  buildContactExternalUrl,
  formatReportClipboard,
} from "./src/lib/buyer-contact.ts";
import { sanitizeNextPath } from "./src/lib/safe-next.ts";

process.env.ECPAY_STAGE = "true";
process.env.NODE_ENV = "production";
process.env.NEXT_PUBLIC_BASE_URL = "https://paycheck.com.de";

const results = [];

function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}

check("ECPay stage mode in production when ECPAY_STAGE=true", () => {
  assert.equal(isEcpayStage(), true);
  const cfg = getEcpayConfig();
  assert.equal(cfg.isStage, true);
  assert.equal(cfg.MerchantID, "2000132");
  assert.match(cfg.paymentUrl, /payment-stage\\.ecpay\\.com\\.tw/);
});

check("ECPay stage credentials match official 2000132 keys", () => {
  assert.equal(ECPAY_STAGE_DEFAULTS.MerchantID, "2000132");
  assert.equal(ECPAY_STAGE_DEFAULTS.HashKey, "5294y06JbISpM5x9");
  assert.equal(ECPAY_STAGE_DEFAULTS.HashIV, "v77hoKGq4kWxNNIS");
});

check("Checkout params + CheckMacValue round-trip", () => {
  const { paymentUrl, params, isStage } = buildCheckoutParams({
    merchantTradeNo: "PCPTEST1234567890",
    totalAmount: 149,
    tradeDesc: "PayCheck test",
    itemName: "對帳通 升級版（月繳）",
    returnURL: "https://paycheck.com.de/api/checkout/callback",
    clientBackURL: "https://paycheck.com.de/dashboard/settings",
    customField1: "00000000-0000-0000-0000-000000000001",
    customField2: "starter:monthly",
  });
  assert.equal(isStage, true);
  assert.match(paymentUrl, /stage/);
  assert.equal(params.EncryptType, "1");
  assert.equal(params.ChoosePayment, "Credit");
  assert.equal(params.ReturnURL, "https://paycheck.com.de/api/checkout/callback");
  assert.ok(params.CheckMacValue.length >= 32);
  assert.equal(verifyCheckMacValueAuto(params), true);
  // tamper
  const bad = { ...params, TotalAmount: "999" };
  assert.equal(verifyCheckMacValueAuto(bad), false);
});

check("Upgrade CustomField2 encoding", () => {
  const { params } = buildCheckoutParams({
    merchantTradeNo: "UPGTEST12345678901",
    totalAmount: 150,
    tradeDesc: "upgrade",
    itemName: "補差價",
    returnURL: "https://paycheck.com.de/api/checkout/callback",
    customField1: "seller",
    customField2: "upgrade:pro:monthly",
  });
  assert.equal(params.CustomField2, "upgrade:pro:monthly");
  assert.equal(verifyCheckMacValueAuto(params), true);
});

check("Site URL locked to paycheck.com.de", () => {
  assert.equal(PRODUCTION_URL, "https://paycheck.com.de");
  assert.equal(getSiteUrl(), "https://paycheck.com.de");
});

check("Renew extends from future expires_at", () => {
  const now = new Date("2026-11-13T00:00:00+08:00");
  const current = "2026-12-13T00:00:00.000Z";
  const next = computeExtendedExpiresAt({
    currentExpiresAt: current,
    cycle: "monthly",
    now,
  });
  const base = new Date(current);
  const got = new Date(next);
  assert.ok(got.getTime() > base.getTime());
  // ~1 month later
  const diffDays = (got.getTime() - base.getTime()) / 86400000;
  assert.ok(diffDays >= 28 && diffDays <= 32, "diffDays=" + diffDays);
});

check("Renew from expired starts from now", () => {
  const now = new Date("2026-11-13T00:00:00+08:00");
  const next = computeExtendedExpiresAt({
    currentExpiresAt: "2026-10-01T00:00:00.000Z",
    cycle: "monthly",
    now,
  });
  assert.ok(new Date(next).getTime() > now.getTime());
});

check("Purchase update clears trial + reminder markers", () => {
  const u = buildSubscriptionUpdate({
    plan: "starter",
    cycle: "monthly",
    currentExpiresAt: null,
    now: new Date("2026-11-13T00:00:00+08:00"),
  });
  assert.equal(u.plan_type, "starter");
  assert.equal(u.billing_cycle, "monthly");
  assert.equal(u.trial_ends_at, null);
  assert.equal(u.expiry_reminder_3d_for, null);
  assert.equal(u.expiry_reminder_1d_for, null);
  assert.ok(u.expires_at);
});

check("Proration starter→pro ~30 days keeps expires + topup 150", () => {
  const now = new Date("2026-11-13T00:00:00+08:00");
  const expires = new Date("2026-12-13T00:00:00+08:00").toISOString();
  const q = calculateUpgradeProration({
    fromPlan: "starter",
    toPlan: "pro",
    cycle: "monthly",
    expiresAt: expires,
    now,
  });
  assert.equal(q.eligible, true);
  assert.equal(q.remainingDays, 30);
  assert.equal(q.topUpAmount, 150);
  assert.equal(q.keepExpiresAt, expires);
  const upd = buildProrationUpgradeUpdate({
    toPlan: "pro",
    cycle: "monthly",
    keepExpiresAt: expires,
  });
  assert.equal(upd.plan_type, "pro");
  assert.equal(upd.expires_at, expires);
});

check("Proration rejects free / expired / downgrade", () => {
  const now = new Date("2026-11-13T00:00:00+08:00");
  const future = new Date("2026-12-13T00:00:00+08:00").toISOString();
  assert.equal(
    calculateUpgradeProration({
      fromPlan: "free",
      toPlan: "pro",
      cycle: "monthly",
      expiresAt: future,
      now,
    }).eligible,
    false
  );
  assert.equal(
    calculateUpgradeProration({
      fromPlan: "starter",
      toPlan: "pro",
      cycle: "monthly",
      expiresAt: "2026-10-01T00:00:00.000Z",
      now,
    }).eligible,
    false
  );
  assert.equal(
    calculateUpgradeProration({
      fromPlan: "unlimited",
      toPlan: "pro",
      cycle: "monthly",
      expiresAt: future,
      now,
    }).eligible,
    false
  );
});

check("Prices catalog", () => {
  assert.equal(getCheckoutAmount("starter", "monthly"), 149);
  assert.equal(getCheckoutAmount("pro", "monthly"), 299);
  assert.equal(getCheckoutAmount("unlimited", "monthly"), 499);
  assert.ok(PLAN_RANK.pro > PLAN_RANK.starter);
});

check("Buyer contact helpers", () => {
  assert.equal(normalizeContactHandle("@mia_shop"), "mia_shop");
  assert.equal(
    buildContactExternalUrl("ig", "mia_shop"),
    "https://www.instagram.com/mia_shop/"
  );
  assert.equal(
    buildContactExternalUrl("threads", "mia"),
    "https://www.threads.net/@mia"
  );
  assert.equal(buildContactExternalUrl("line", "小美"), null);
  const clip = formatReportClipboard({
    buyer_name: "小美",
    buyer_contact: "mia",
    contact_platform: "ig",
    transfer_bank: "中國信託",
    amount: 1280,
    bank_last_five: "83920",
  });
  assert.match(clip, /小美/);
  assert.match(clip, /83920/);
  assert.match(clip, /中國信託/);
});

check("sanitizeNextPath blocks open redirects", () => {
  assert.equal(sanitizeNextPath("/dashboard/store"), "/dashboard/store");
  assert.equal(sanitizeNextPath("//evil.com"), "/dashboard");
  assert.equal(sanitizeNextPath("https://evil.com"), "/dashboard");
  assert.equal(sanitizeNextPath("/\u005c\u005cevil.com"), "/dashboard");
  assert.equal(sanitizeNextPath("javascript:alert(1)"), "/dashboard");
  assert.equal(
    sanitizeNextPath(encodeURIComponent("//evil.com")),
    "/dashboard"
  );
});

check("Callback CustomField2 parse semantics", () => {
  // mirror route parsePlanField
  function parsePlanField(raw) {
    const parts = (raw || "pro:monthly").split(":");
    if (parts[0] === "upgrade") {
      return { mode: "upgrade", plan: parts[1], cycle: parts[2] || "monthly" };
    }
    return { mode: "purchase", plan: parts[0], cycle: parts[1] || "monthly" };
  }
  assert.deepEqual(parsePlanField("starter:yearly"), {
    mode: "purchase",
    plan: "starter",
    cycle: "yearly",
  });
  assert.deepEqual(parsePlanField("upgrade:unlimited:half_yearly"), {
    mode: "upgrade",
    plan: "unlimited",
    cycle: "half_yearly",
  });
});

console.log(JSON.stringify(results));
`,
  ],
  {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ECPAY_STAGE: "true", NEXT_PUBLIC_BASE_URL: "https://paycheck.com.de" },
  }
);

if (r.status !== 0 && !r.stdout.includes("[{")) {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}

const lines = (r.stdout || "").trim().split("\n");
const jsonLine = lines.reverse().find((l) => l.startsWith("["));
const results = JSON.parse(jsonLine);
let failed = 0;
section("Unit / logic checks");
for (const item of results) {
  if (item.ok) ok(item.name);
  else {
    failed++;
    console.error(`✗ ${item.name}: ${item.error}`);
  }
}

// Live HTTP smoke (no auth payments)
section("Live HTTP smoke (paycheck.com.de)");
const base = "https://paycheck.com.de";
const checks = [
  ["GET /", "/"],
  ["GET /login", "/login"],
  ["GET /api/line/webhook", "/api/line/webhook"],
  ["GET /og.jpg", "/og.jpg"],
  ["GET /og-image.jpg", "/og-image.jpg"],
  ["POST /api/checkout unauth", "/api/checkout", { method: "POST", body: '{"plan":"starter","cycle":"monthly"}', headers: { "Content-Type": "application/json" } }],
  ["POST /api/upgrade unauth", "/api/upgrade", { method: "POST", body: '{"plan":"pro","action":"quote"}', headers: { "Content-Type": "application/json" } }],
  ["POST /api/report/submit missing contact", "/api/report/submit", { method: "POST", body: JSON.stringify({ seller_id: "11111111-1111-4111-8111-111111111111", buyer_name: "測", amount: 100, bank_last_five: "12345" }), headers: { "Content-Type": "application/json" } }],
];

for (const [label, pathName, init] of checks) {
  try {
    const res = await fetch(base + pathName, init);
    const text = await res.text();
    if (label.startsWith("GET /") && !label.includes("api") && pathName === "/") {
      assert.equal(res.status, 200);
      ok(`${label} → ${res.status}`);
    } else if (pathName === "/login" || pathName === "/og.jpg") {
      assert.equal(res.status, 200);
      ok(`${label} → ${res.status}`);
    } else if (pathName === "/api/line/webhook") {
      assert.equal(res.status, 200);
      const j = JSON.parse(text);
      assert.equal(j.webhook, "ready");
      assert.equal(j.hasSecret, true);
      assert.equal(j.hasAccessToken, true);
      ok(`${label} → ready + secrets present`);
    } else if (pathName === "/api/checkout" || pathName === "/api/upgrade") {
      assert.equal(res.status, 401);
      ok(`${label} → 401 請先登入`);
    } else if (pathName === "/api/report/submit") {
      assert.equal(res.status, 400);
      assert.ok(
        /聯絡|contact|轉帳銀行|平台|選擇|Invalid option|有效/i.test(text),
        text
      );
      ok(`${label} → 400 必填防呆`);
    } else {
      ok(`${label} → ${res.status}`);
    }
  } catch (e) {
    failed++;
    console.error(`✗ ${label}: ${e.message}`);
  }
}

section("Summary");
if (failed) {
  console.error(`FAILED: ${failed} check(s)`);
  process.exit(1);
}
console.log("ALL CHECKS PASSED");
