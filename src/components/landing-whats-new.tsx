import Link from "next/link";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    emoji: "🛍️",
    title: "個人獨立賣場",
    desc: "一鍵產生專屬網址 /shop/[username]，商品分類與結帳頁面一氣呵成，完美放進 IG Bio。",
  },
  {
    emoji: "📦",
    title: "代購與團購雙模式",
    desc: "代購快速收單；團購自訂達標門檻與即時進度條，開團節奏一次到位。",
  },
  {
    emoji: "⚡",
    title: "智慧自動對帳（全方案標配）",
    desc: "買家填末五碼自動勾稽，LINE 秒速播報入帳，告別 Excel 與截圖地獄。",
  },
] as const;

/** Three core pillars: storefront, dual modes, auto-reconciliation. */
export function LandingWhatsNew() {
  return (
    <section
      id="features"
      className="relative z-10 scroll-mt-24 overflow-hidden border-y border-border/70 bg-gradient-to-b from-sky-50/80 via-background to-background py-16 md:py-20"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_50%_0%,hsl(210_70%_90%/_0.85),transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl px-4">
        <p className="text-sm font-semibold tracking-wide text-primary">
          NovaStore 三大核心
        </p>
        <h2 className="mt-2 max-w-3xl font-display text-2xl font-semibold tracking-tight md:text-3xl">
          從建店、上架、收單到自動收款，一站搞定
        </h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          NovaStore
          不是單純對帳工具，而是專為台灣代購、團購主打造的一站式獨立賣場與自動對帳平台。
        </p>

        <ul className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {FEATURES.map(({ emoji, title, desc }, index) => (
            <li
              key={title}
              className="animate-fade-up"
              style={{ animationDelay: `${0.08 * (index + 1)}s` }}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl"
                aria-hidden
              >
                {emoji}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {desc}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg" className="h-11">
            <Link href="/signup" prefetch>
              免費建立賣場
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11">
            <Link href="/login?next=%2Fdashboard%2Fstore">登入開啟商店中心</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
