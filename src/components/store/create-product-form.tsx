"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Package, Plane } from "lucide-react";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button";
import { OptionTagsInput } from "@/components/store/option-tags-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ProductMode } from "@/types/database";

type CreatedResult = {
  shareUrl: string;
  shopSlug: string;
  productId: string;
  title: string;
};

const emptyForm = {
  title: "",
  price: "",
  variant_note: "",
  image_url: "",
  target_quantity: "",
  deadline: "",
  stock: "",
  preorder_notice: "",
};

export function CreateProductForm() {
  const [mode, setMode] = useState<ProductMode>("agency");
  const [isPreorder, setIsPreorder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedResult | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [colorOptions, setColorOptions] = useState<string[]>([]);
  const [sizeOptions, setSizeOptions] = useState<string[]>([]);

  const deadlineLocalMin = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setCreated(null);
    try {
      const stockRaw = form.stock.trim();
      const payload: Record<string, unknown> = {
        title: form.title,
        price: Number(form.price),
        mode,
        variant_note: form.variant_note,
        image_url: form.image_url,
        color_options: colorOptions,
        size_options: sizeOptions,
        stock: stockRaw === "" ? null : Number(stockRaw),
        is_preorder: isPreorder,
        preorder_notice: isPreorder ? form.preorder_notice.trim() : "",
      };
      if (mode === "group_buy") {
        payload.target_quantity = Number(form.target_quantity);
        if (form.deadline) {
          payload.deadline = new Date(form.deadline).toISOString();
        }
      }

      const res = await fetch("/api/store/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({} as { error?: string; shareUrl?: string; shopSlug?: string; product?: { id: string; title: string } }));
      if (!res.ok) throw new Error(json.error || "建立失敗");
      if (!json.product?.id || !json.shareUrl) {
        throw new Error("建立成功但回應格式異常，請重新整理後台確認");
      }

      setCreated({
        shareUrl: json.shareUrl,
        shopSlug: json.shopSlug || "",
        productId: json.product.id,
        title: json.product.title || form.title,
      });
      toast.success("商品已建立");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "建立失敗");
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Check className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="mt-0 font-display text-lg font-semibold text-emerald-950">
              建立成功：{created.title}
            </h2>
            <p className="mt-1 text-sm text-emerald-900/75">
              專屬下單連結已產生，可貼到 IG、LINE 或限動。
            </p>
            <code className="mt-4 block overflow-x-auto rounded-xl bg-white/80 px-3 py-3 text-sm break-all text-foreground">
              {created.shareUrl}
            </code>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton
                value={created.shareUrl}
                label="一鍵複製連結"
                size="default"
                className="h-11"
                toastMessage="已複製下單連結"
              />
              <Button asChild variant="outline" className="h-11">
                <a href={created.shareUrl} target="_blank" rel="noreferrer">
                  開啟買家頁
                </a>
              </Button>
              <Button asChild variant="outline" className="h-11">
                <Link href="/dashboard/store/stats">查看開店統計</Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                onClick={() => {
                  setCreated(null);
                  setForm(emptyForm);
                  setMode("agency");
                  setIsPreorder(false);
                  setColorOptions([]);
                  setSizeOptions([]);
                }}
              >
                再建立一個
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">選擇模式</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                id: "agency" as const,
                title: "微商/代購模式",
                emoji: "✈️",
                icon: Plane,
                desc: "微商或代購常態上架，買家隨時可下單回報末五碼。",
              },
              {
                id: "group_buy" as const,
                title: "團購模式 (Group Buy)",
                emoji: "📦",
                icon: Package,
                desc: "設定成團門檻與結單時間，達標自動標示成功。",
              },
            ] as const
          ).map((item) => {
            const active = mode === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={cn(
                  "rounded-2xl border-2 px-4 py-4 text-left transition",
                  active
                    ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden>
                    {item.emoji}
                  </span>
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                    aria-hidden
                  />
                  <span className="font-display text-sm font-semibold">
                    {item.title}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="title">商品名稱</Label>
          <Input
            id="title"
            className="h-12"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="例如：日本藥妝防曬乳 50ml"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">單價（NT$）</Label>
          <Input
            id="price"
            className="h-12"
            inputMode="decimal"
            required
            min={0}
            step="1"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="499"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <OptionTagsInput
            id="color_options"
            label="顏色選項"
            values={colorOptions}
            onChange={setColorOptions}
            placeholder="輸入後按 Enter，例如：米白"
            hint="選填。可新增多個顏色供買家下單時選擇。"
          />
          <OptionTagsInput
            id="size_options"
            label="尺寸選項"
            values={sizeOptions}
            onChange={setSizeOptions}
            placeholder="輸入後按 Enter，例如：M"
            hint="選填。可新增多個尺寸供買家下單時選擇。"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="variant_note">其他規格說明（選填）</Label>
          <Input
            id="variant_note"
            className="h-12"
            value={form.variant_note}
            onChange={(e) =>
              setForm({ ...form, variant_note: e.target.value })
            }
            placeholder="例如：含運／兩件優惠說明"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stock">庫存數量（選填）</Label>
          <Input
            id="stock"
            className="h-12"
            inputMode="numeric"
            min={0}
            value={form.stock}
            onChange={(e) =>
              setForm({
                ...form,
                stock: e.target.value.replace(/[^\d]/g, ""),
              })
            }
            placeholder="例如：50（空白＝不限量）"
          />
          <p className="text-xs text-muted-foreground">
            有設定庫存時，賣完會自動顯示「已售完」並停止下單。
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-secondary/30 p-4">
          <p className="text-sm font-medium">販售模式</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(
              [
                {
                  id: false,
                  title: "現貨販售",
                  desc: "有貨可盡快出貨，前台不顯示預購標籤。",
                },
                {
                  id: true,
                  title: "預購商品",
                  desc: "顯示【預購】徽章，並可填寫預計出貨說明。",
                },
              ] as const
            ).map((item) => {
              const active = isPreorder === item.id;
              return (
                <button
                  key={String(item.id)}
                  type="button"
                  onClick={() => setIsPreorder(item.id)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left transition",
                    active
                      ? "border-primary bg-primary/10 ring-2 ring-primary/15"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <span className="text-sm font-semibold">{item.title}</span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>
          {isPreorder ? (
            <div className="mt-4 space-y-2">
              <Label htmlFor="preorder_notice">預計出貨日／預購說明</Label>
              <Input
                id="preorder_notice"
                className="h-12 bg-background"
                value={form.preorder_notice}
                onChange={(e) =>
                  setForm({ ...form, preorder_notice: e.target.value })
                }
                placeholder="例如：預計 12/20 從日本發貨"
                maxLength={200}
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="image_url">商品圖片連結（選填）</Label>
          <Input
            id="image_url"
            className="h-12"
            type="url"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://..."
          />
          <p className="text-xs text-muted-foreground">
            可貼雲端公開圖片網址，暫不支援本機上傳。
          </p>
        </div>

        {mode === "group_buy" ? (
          <div className="grid gap-4 border-t border-border/70 pt-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="target_quantity">成團門檻數量</Label>
              <Input
                id="target_quantity"
                className="h-12"
                inputMode="numeric"
                required
                min={1}
                value={form.target_quantity}
                onChange={(e) =>
                  setForm({ ...form, target_quantity: e.target.value })
                }
                placeholder="例如：20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">結單時間</Label>
              <Input
                id="deadline"
                className="h-12"
                type="datetime-local"
                required
                min={deadlineLocalMin}
                value={form.deadline}
                onChange={(e) =>
                  setForm({ ...form, deadline: e.target.value })
                }
              />
            </div>
          </div>
        ) : null}

        <Button type="submit" disabled={loading} className="h-12 w-full sm:w-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "group_buy" ? "建立開團並產生連結" : "上架微商/代購並產生連結"}
        </Button>
      </div>
    </form>
  );
}
