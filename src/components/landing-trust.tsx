import Link from "next/link";
import { Lock, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const POINTS = [
  {
    icon: Sparkles,
    title: "免複雜串接",
    desc: "不用先接綠界／金流 API 才能用。註冊後立刻取得專屬賣場，今晚就能開始收單。",
  },
  {
    icon: Users,
    title: "同行開發背景",
    desc: "由實際做代購、團購與 IG 賣場的團隊打造，對準私訊收單與截圖對帳的真實痛點。",
  },
  {
    icon: Lock,
    title: "資料安全安心",
    desc: "賣家資料與訂單紀錄分開權限控管，買家頁只露出必要欄位；正式環境採加密連線。",
  },
] as const;

export function LandingTrust({ trialDays }: { trialDays: number }) {
  return (
    <section
      id="trust"
      className="relative z-10 scroll-mt-20 border-t border-border/70 py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          給忙碌代購／團購主的安心保證
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          先免費建立獨立賣場、跑通收單與末五碼核對，確認適合你的出貨節奏再決定要不要升級。
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {POINTS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start gap-4 border-t border-border/70 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl font-semibold md:text-2xl">
              今晚就建立你的獨立賣場
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {trialDays} 天全功能試用，確認適合再選擇方案。
            </p>
          </div>
          <Button asChild size="lg" className="h-11 shrink-0 px-6 text-base">
            <Link href="/signup" prefetch>
              免費建立賣場
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
