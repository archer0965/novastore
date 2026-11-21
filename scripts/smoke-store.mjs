/**
 * Live smoke test: store products/orders against Supabase.
 * Run: node scripts/smoke-store.mjs
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const map = {};
  for (const line of fs.readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    map[m[1]] = v;
  }
  return map;
}

const env = loadEnv(".env.local");
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log("✓", name);
  } catch (e) {
    results.push({ name, ok: false, error: e instanceof Error ? e.message : String(e) });
    console.error("✗", name, e instanceof Error ? e.message : e);
  }
}

await check("profiles table readable", async () => {
  const { data, error } = await admin.from("profiles").select("id").limit(1);
  assert(!error, error?.message || "profiles error");
  assert(Array.isArray(data), "profiles not array");
});

await check("products + orders tables exist", async () => {
  const { error: pErr } = await admin.from("products").select("id").limit(1);
  assert(!pErr, pErr?.message || "products missing");
  const { error: oErr } = await admin.from("orders").select("id").limit(1);
  assert(!oErr, oErr?.message || "orders missing");
});

let sellerId = null;
let productId = null;
let orderId = null;
const slug = `smoke-${Date.now().toString(36)}`;

await check("pick a seller profile", async () => {
  const { data, error } = await admin
    .from("profiles")
    .select("id, shop_name, shop_slug")
    .limit(1)
    .maybeSingle();
  assert(!error, error?.message || "no profile");
  assert(data?.id, "empty profiles — create a user first");
  sellerId = data.id;
  const { error: slugErr } = await admin
    .from("profiles")
    .update({ shop_slug: slug })
    .eq("id", sellerId);
  assert(!slugErr, slugErr?.message || "slug update failed");
});

await check("create agency product", async () => {
  const { data, error } = await admin
    .from("products")
    .insert({
      user_id: sellerId,
      title: "Smoke Agency Item",
      price: 199,
      mode: "agency",
      status: "active",
      variant_note: "紅",
      image_url: "",
      target_quantity: null,
      deadline: null,
    })
    .select("id")
    .single();
  assert(!error, error?.message || "insert agency failed");
  productId = data.id;
});

await check("create group_buy product + order reaches success", async () => {
  const { data: gb, error } = await admin
    .from("products")
    .insert({
      user_id: sellerId,
      title: "Smoke Group Buy",
      price: 99,
      mode: "group_buy",
      status: "active",
      target_quantity: 2,
      deadline: new Date(Date.now() + 86400000).toISOString(),
    })
    .select("id, status")
    .single();
  assert(!error, error?.message || "insert group_buy failed");

  const { data: o1, error: e1 } = await admin
    .from("orders")
    .insert({
      product_id: gb.id,
      buyer_name: "Tester A",
      quantity: 1,
      total_amount: 99,
      atm_last5: "12345",
      store_type: "711",
      store_info: "逢甲門市 / 店號 123456",
      receiver_phone: "0912345678",
      payment_status: "pending",
    })
    .select("id")
    .single();
  assert(!e1, e1?.message || "order1 failed");
  orderId = o1.id;

  const { error: e2 } = await admin.from("orders").insert({
    product_id: gb.id,
    buyer_name: "Tester B",
    quantity: 1,
    total_amount: 99,
    atm_last5: "54321",
    store_type: "family",
    store_info: "文心門市 / 店號 654321",
    receiver_phone: "0987654321",
    payment_status: "pending",
  });
  assert(!e2, e2?.message || "order2 failed");

  const { data: refreshed } = await admin
    .from("products")
    .select("status")
    .eq("id", gb.id)
    .single();
  assert(refreshed?.status === "success", `expected success got ${refreshed?.status}`);

  // cleanup group buy product (cascade orders)
  await admin.from("products").delete().eq("id", gb.id);
});

await check("match order payment_status", async () => {
  const { data: o, error } = await admin
    .from("orders")
    .insert({
      product_id: productId,
      buyer_name: "Match Me",
      quantity: 2,
      total_amount: 398,
      atm_last5: "99999",
      store_type: "711",
      store_info: "測試門市 / 店號 111111",
      receiver_phone: "0911222333",
      payment_status: "pending",
    })
    .select("id, store_type, store_info, receiver_phone")
    .single();
  assert(o.store_type === "711", "store_type missing");
  assert(o.receiver_phone === "0911222333", "receiver_phone missing");
  assert(!error, error?.message || "order insert failed");
  const { data: updated, error: uErr } = await admin
    .from("orders")
    .update({ payment_status: "matched" })
    .eq("id", o.id)
    .select("payment_status")
    .single();
  assert(!uErr, uErr?.message || "match failed");
  assert(updated.payment_status === "matched", "not matched");
});

await check("multi-variant order items json", async () => {
  const items = [
    { color: "黑", size: "M", quantity: 1 },
    { color: "白", size: "L", quantity: 2 },
  ];
  const { data: o, error } = await admin
    .from("orders")
    .insert({
      product_id: productId,
      buyer_name: "Multi Spec",
      quantity: 3,
      total_amount: 597,
      atm_last5: "11111",
      store_type: "family",
      store_info: "多規格門市 / 店號 222222",
      receiver_phone: "0911111222",
      selected_color: "黑",
      selected_size: "M",
      items,
      items_summary: "黑 / M ×1、白 / L ×2",
      payment_status: "pending",
    })
    .select("id, quantity, items, items_summary")
    .single();
  assert(!error, error?.message || "multi items insert failed");
  assert(o.quantity === 3, "quantity should be 3");
  assert(Array.isArray(o.items) && o.items.length === 2, "items jsonb missing");
  assert(
    String(o.items_summary).includes("白 / L"),
    `summary unexpected: ${o.items_summary}`
  );
});

await check("cleanup smoke rows", async () => {
  if (productId) await admin.from("products").delete().eq("id", productId);
});

await check("shop storefront resolves by slug", async () => {
  const { data: profile } = await admin
    .from("profiles")
    .select("id, shop_slug, shop_name, shop_bio")
    .not("shop_slug", "is", null)
    .neq("shop_slug", "")
    .limit(1)
    .maybeSingle();
  assert(profile?.shop_slug, "need a profile with shop_slug");
  assert("shop_bio" in (profile || {}), "shop_bio column missing");
  const { data: products, error } = await admin
    .from("products")
    .select("id, status")
    .eq("user_id", profile.id)
    .in("status", ["active", "success"])
    .limit(5);
  assert(!error, error?.message || "storefront product query failed");
  assert(Array.isArray(products), "products should be array");
});

await check("production public pages respond", async () => {
  for (const path of ["/", "/login", "/signup", "/contact", "/manifest.json", "/sw.js"]) {
    const res = await fetch(`https://paycheck.com.de${path}`, {
      redirect: "manual",
    });
    assert(
      res.status === 200 || res.status === 307 || res.status === 308,
      `${path} -> ${res.status}`
    );
  }
});

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
