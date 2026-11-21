"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PlanUpgrade } from "@/components/dashboard/plan-upgrade";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "@/types/database";

export type SettingsProfile = Profile & {
  line_channel_access_token_set?: boolean;
  line_channel_secret_set?: boolean;
};

export function SettingsForm({
  profile,
  isAdmin = false,
}: {
  profile: SettingsProfile;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [testingLine, setTestingLine] = useState(false);
  const [clearingLineChannel, setClearingLineChannel] = useState(false);
  const [tokenSet, setTokenSet] = useState(
    Boolean(
      profile.line_channel_access_token_set ||
        profile.line_channel_access_token
    )
  );
  const [secretSet, setSecretSet] = useState(
    Boolean(profile.line_channel_secret_set || profile.line_channel_secret)
  );
  const [digesting, setDigesting] = useState(false);
  const [form, setForm] = useState({
    shop_name: profile.shop_name || "",
    shop_bio: profile.shop_bio || "",
    bank_code: profile.bank_code || "",
    bank_account: profile.bank_account || "",
    line_user_id: profile.line_user_id || "",
    line_channel_access_token: "",
    line_channel_secret: "",
    enable_cod: Boolean(profile.enable_cod),
    cod_url: profile.cod_url || "",
    cod_label: profile.cod_label || "",
    shipping_fee: String(
      profile.shipping_fee == null ? 60 : Number(profile.shipping_fee) || 0
    ),
    free_shipping_enabled: Boolean(profile.free_shipping_enabled),
    free_shipping_threshold:
      profile.free_shipping_threshold == null
        ? ""
        : String(Number(profile.free_shipping_threshold) || 0),
  });

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (form.enable_cod && !form.cod_url.trim()) {
      toast.error("啟用外部結帳時，請填寫連結（賣貨便／好賣+／蝦皮／其他皆可）");
      return;
    }
    const shippingFee = Number(form.shipping_fee);
    if (!Number.isFinite(shippingFee) || shippingFee < 0) {
      toast.error("請輸入有效的固定運費（可為 0）");
      return;
    }
    let freeThreshold: number | null = null;
    if (form.free_shipping_enabled) {
      if (form.free_shipping_threshold.trim() === "") {
        freeThreshold = 0;
      } else {
        freeThreshold = Number(form.free_shipping_threshold);
        if (!Number.isFinite(freeThreshold) || freeThreshold < 0) {
          toast.error("請輸入有效的滿額免運門檻（填 0 表示全館免運）");
          return;
        }
      }
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_name: form.shop_name,
          shop_bio: form.shop_bio,
          bank_code: form.bank_code,
          bank_account: form.bank_account,
          line_user_id: form.line_user_id,
          line_channel_access_token: form.line_channel_access_token.trim() || null,
          line_channel_secret: form.line_channel_secret.trim() || null,
          enable_cod: form.enable_cod,
          cod_url: form.cod_url.trim() || null,
          cod_label: form.cod_label.trim() || null,
          shipping_fee: Math.round(shippingFee),
          free_shipping_enabled: form.free_shipping_enabled,
          free_shipping_threshold: freeThreshold,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "儲存失敗");
      if (json.profile?.line_channel_access_token_set != null) {
        setTokenSet(Boolean(json.profile.line_channel_access_token_set));
      } else if (form.line_channel_access_token.trim()) {
        setTokenSet(true);
      }
      if (json.profile?.line_channel_secret_set != null) {
        setSecretSet(Boolean(json.profile.line_channel_secret_set));
      } else if (form.line_channel_secret.trim()) {
        setSecretSet(true);
      }
      setForm((prev) => ({
        ...prev,
        line_channel_access_token: "",
        line_channel_secret: "",
      }));
      toast.success("設定已儲存");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function clearLineChannel() {
    setClearingLineChannel(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_name: form.shop_name,
          shop_bio: form.shop_bio,
          bank_code: form.bank_code,
          bank_account: form.bank_account,
          line_user_id: form.line_user_id,
          enable_cod: form.enable_cod,
          cod_url: form.cod_url.trim() || null,
          cod_label: form.cod_label.trim() || null,
          shipping_fee: Math.round(Number(form.shipping_fee) || 0),
          free_shipping_enabled: form.free_shipping_enabled,
          free_shipping_threshold:
            form.free_shipping_threshold.trim() === ""
              ? 0
              : Math.round(Number(form.free_shipping_threshold) || 0),
          clear_line_channel_credentials: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "清除失敗");
      setTokenSet(false);
      setSecretSet(false);
      setForm((prev) => ({
        ...prev,
        line_channel_access_token: "",
        line_channel_secret: "",
      }));
      toast.success("已清除你的 LINE 官方帳號 Token");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "清除失敗");
    } finally {
      setClearingLineChannel(false);
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSave}
        className="space-y-5 rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm md:p-6"
      >
        <div id="shop" className="scroll-mt-24">
          <h2 className="font-display text-xl font-semibold">店鋪與銀行資訊</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            這些資料會顯示在買家回報頁，方便對方轉帳。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="shop_name">店名</Label>
            <Input
              id="shop_name"
              className="h-12"
              value={form.shop_name}
              onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
              placeholder="例如：小柚手作工作室"
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="shop_bio">賣場簡介</Label>
            <Input
              id="shop_bio"
              className="h-12"
              value={form.shop_bio}
              onChange={(e) =>
                setForm({ ...form, shop_bio: e.target.value.slice(0, 200) })
              }
              placeholder="顯示在 /shop 賣場頁頭部，例如：本週新品與團購開團中"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              選填，最多 200 字。訪客開啟專屬賣場頁時會看到。
            </p>
          </div>
          <div
            id="bank"
            className="scroll-mt-24 space-y-4 md:col-span-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0"
          >
            <div className="space-y-2">
              <Label htmlFor="bank_code">銀行代碼</Label>
              <Input
                id="bank_code"
                className="h-12"
                inputMode="numeric"
                value={form.bank_code}
                onChange={(e) => setForm({ ...form, bank_code: e.target.value })}
                placeholder="例如：812"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_account">銀行帳號</Label>
              <Input
                id="bank_account"
                className="h-12"
                inputMode="numeric"
                value={form.bank_account}
                onChange={(e) =>
                  setForm({ ...form, bank_account: e.target.value })
                }
                placeholder="完整匯款帳號"
                required
              />
            </div>
          </div>
          <div
            id="shipping"
            className="scroll-mt-24 space-y-3 rounded-2xl border border-sky-500/20 bg-sky-50/40 p-4 md:col-span-2"
          >
            <div>
              <h3 className="font-display text-lg font-semibold">運費設定</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                設定 ATM 結帳的固定運費與滿額免運門檻；會自動加進買家應付總額。
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping_fee">固定運費（新台幣）</Label>
              <Input
                id="shipping_fee"
                className="h-12"
                inputMode="numeric"
                value={form.shipping_fee}
                onChange={(e) =>
                  setForm({
                    ...form,
                    shipping_fee: e.target.value.replace(/\D/g, "").slice(0, 5),
                  })
                }
                placeholder="例如：60（填 0 表示不另收運費）"
              />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-3">
              <div>
                <p className="text-sm font-semibold">滿額免運優惠</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  商品金額達門檻（折抵後）免運；門檻填 0 或留空＝全館免運。
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={form.free_shipping_enabled}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      free_shipping_enabled: e.target.checked,
                    })
                  }
                />
                啟用滿額免運
              </label>
            </div>
            {form.free_shipping_enabled ? (
              <div className="space-y-2">
                <Label htmlFor="free_shipping_threshold">滿額免運門檻</Label>
                <Input
                  id="free_shipping_threshold"
                  className="h-12"
                  inputMode="numeric"
                  value={form.free_shipping_threshold}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      free_shipping_threshold: e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 7),
                    })
                  }
                  placeholder="例如：1000（0 或空白＝全館免運）"
                />
              </div>
            ) : null}
          </div>

          <div
            id="cod"
            className="scroll-mt-24 space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-50/40 p-4 md:col-span-2"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">
                  外部結帳連結
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  賣貨便、好賣+、蝦皮或其他專屬賣場連結皆可。開啟後買家可選擇導向該頁完成下單。
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={form.enable_cod}
                  onChange={(e) =>
                    setForm({ ...form, enable_cod: e.target.checked })
                  }
                />
                啟用外部結帳連結
              </label>
            </div>
            {form.enable_cod ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="cod_label">選項顯示名稱</Label>
                  <Input
                    id="cod_label"
                    className="h-12"
                    value={form.cod_label}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        cod_label: e.target.value.slice(0, 40),
                      })
                    }
                    placeholder="例如：蝦皮下單、7-11 賣貨便、好賣+ 貨到付款"
                    maxLength={40}
                  />
                  <p className="text-xs text-muted-foreground">
                    會顯示在買家結帳的付款方式選項上（可留空使用預設名稱）。
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cod_url">外部結帳網址</Label>
                  <Input
                    id="cod_url"
                    className="h-12"
                    type="url"
                    value={form.cod_url}
                    onChange={(e) =>
                      setForm({ ...form, cod_url: e.target.value })
                    }
                    placeholder="https://shopee.tw/... 或賣貨便／好賣+／其他專屬連結"
                    required={form.enable_cod}
                  />
                  <p className="text-xs text-muted-foreground">
                    買家選擇此方式並結帳時，會直接跳轉到此連結。
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2 scroll-mt-24" id="line">
            <Label htmlFor="line_user_id">LINE User ID（接收通知）</Label>
            <Input
              id="line_user_id"
              value={form.line_user_id}
              onChange={(e) =>
                setForm({ ...form, line_user_id: e.target.value })
              }
              placeholder="例如：Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="h-12 font-mono text-sm"
            />
            <div className="rounded-xl bg-secondary/60 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">如何取得 User ID</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                <li>
                  加入你要接收通知的官方帳號（可為自有帳號，或平台預設帳號）
                </li>
                <li>對該官方帳號傳訊息，取得 U 開頭的 User ID</li>
                <li>貼到上方欄位並儲存，即可接收訂單／對帳推播</li>
              </ol>
            </div>
          </div>
        </div>

        <div
          id="line-channel"
          className="scroll-mt-24 space-y-4 rounded-2xl border border-sky-500/20 bg-sky-50/40 p-4"
        >
          <div>
            <h3 className="font-display text-lg font-semibold">
              LINE 官方帳號設定（獨立推播）
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              填入你自己的 Messaging API Channel Access Token 後，每日帳務彙整／團購達標通知會改由你的官方帳號發送。未設定時則使用平台預設 Token。新訂單改為每日彙整，不再逐筆即時推播。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="line_channel_access_token">
              Channel Access Token
            </Label>
            <Input
              id="line_channel_access_token"
              type="password"
              autoComplete="off"
              className="h-12 font-mono text-sm"
              value={form.line_channel_access_token}
              onChange={(e) =>
                setForm({
                  ...form,
                  line_channel_access_token: e.target.value,
                })
              }
              placeholder={
                tokenSet
                  ? "已設定（留空不變更；輸入新值可覆寫）"
                  : "貼上長期 Channel Access Token"
              }
            />
            <p className="text-xs text-muted-foreground">
              {tokenSet ? "狀態：已設定專屬 Token" : "狀態：尚未設定（使用平台預設）"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="line_channel_secret">Channel Secret（選填）</Label>
            <Input
              id="line_channel_secret"
              type="password"
              autoComplete="off"
              className="h-12 font-mono text-sm"
              value={form.line_channel_secret}
              onChange={(e) =>
                setForm({ ...form, line_channel_secret: e.target.value })
              }
              placeholder={
                secretSet
                  ? "已設定（留空不變更）"
                  : "選填，供後續 webhook 驗證擴充"
              }
            />
          </div>

          <div className="rounded-xl bg-background/80 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">設定步驟</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              <li>至 LINE Developers 建立／開啟 Messaging API Channel</li>
              <li>發行長期 Channel Access Token 並貼上儲存</li>
              <li>請買家（或你自己）加入該官方帳號並取得 User ID</li>
              <li>按「測試 LINE 推播」確認通知來自你的官方帳號</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={testingLine || !form.line_user_id}
              className="gap-1.5"
              onClick={async () => {
                setTestingLine(true);
                try {
                  const res = await fetch("/api/line/test", { method: "POST" });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error || "測試失敗");
                  toast.success(json.message || "測試推播已送出");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "測試失敗");
                } finally {
                  setTestingLine(false);
                }
              }}
            >
              {testingLine ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BellRing className="h-4 w-4" />
              )}
              測試 LINE 推播
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={digesting || !form.line_user_id}
              className="gap-1.5"
              onClick={async () => {
                setDigesting(true);
                try {
                  const res = await fetch("/api/line/daily-digest", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ force: true }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error || "彙整推播失敗");
                  toast.success(json.message || "已推播今日帳務彙整");
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "彙整推播失敗"
                  );
                } finally {
                  setDigesting(false);
                }
              }}
            >
              {digesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BellRing className="h-4 w-4" />
              )}
              立即推播今日彙整
            </Button>
            {(tokenSet || secretSet) && (
              <Button
                type="button"
                variant="ghost"
                disabled={clearingLineChannel}
                className="gap-1.5 text-destructive"
                onClick={() => void clearLineChannel()}
              >
                {clearingLineChannel ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                清除專屬 Token
              </Button>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="h-12 w-full gap-2 text-base sm:w-auto"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          儲存設定
        </Button>
      </form>

      {isAdmin ? (
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm">
          <p className="font-display text-lg font-semibold">管理者帳號</p>
          <p className="mt-1 text-muted-foreground">
            已開通全部功能與無限訂單額度，無需升級付費方案。可至「管理」查看營運統計。
          </p>
        </section>
      ) : (
        <PlanUpgrade profile={profile} />
      )}
    </div>
  );
}
