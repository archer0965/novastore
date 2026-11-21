import { BellRing, Package, ShoppingBag, Store } from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: Store,
    title: "建店 Storefront",
    desc: "3 分鐘建立專屬獨立賣場 /shop/[username]，直接放進 IG Bio，粉絲一點就到店。",
  },
  {
    step: "02",
    icon: Package,
    title: "上架 Products",
    desc: "支援多規格（尺寸、顏色）、庫存管理，以及代購／團購雙模式與達標進度條。",
  },
  {
    step: "03",
    icon: ShoppingBag,
    title: "收單 Checkout",
    desc: "買家自助選購、填寫 7-11／全家取貨門市，免私訊、免截圖來回確認。",
  },
  {
    step: "04",
    icon: BellRing,
    title: "收款與對帳",
    desc: "買家轉帳後填末五碼，系統自動勾稽，賣家在 LINE 秒收入帳通知即可出貨。",
  },
] as const;

export function LandingHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative z-10 scroll-mt-20 border-y border-border/70 bg-card/40 py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          賣家旅程：建店 → 上架 → 收單 → 自動對帳
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          把 IG 粉絲變成可結帳的顧客。你負責選品與出貨，NovaStore
          幫你承接下單與匯款對帳。
        </p>

        <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STEPS.map(({ step, icon: Icon, title, desc }, index) => (
            <li
              key={title}
              className="relative animate-fade-up"
              style={{ animationDelay: `${0.08 * (index + 1)}s` }}
            >
              <p className="font-display text-4xl font-bold tabular-nums text-primary/25">
                {step}
              </p>
              <div className="mt-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
