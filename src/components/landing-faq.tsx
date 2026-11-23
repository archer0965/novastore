"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ_ITEMS = [
  {
    q: "NovaStore 跟單純對帳工具差在哪？",
    a: "NovaStore 是一站式獨立開店平台：你先建立 /shop/[username] 賣場、上架多規格商品（代購／團購），買家自助下單與超商取貨；匯款末五碼由系統協助比對並 LINE 通知商家核對。末五碼比對只表示比對結果，不等於銀行已確認入帳。",
  },
  {
    q: "買家需要下載 App 才能逛賣場、下單嗎？",
    a: "不用。把專屬賣場連結放進 IG Bio，買家用手機網頁就能選規格、填 7-11／全家門市與末五碼結帳。",
  },
  {
    q: "需要串接銀行 API 或綁定網銀密碼嗎？",
    a: "完全不需要。NovaStore 只做末五碼比對與通知，絕不經手買家或賣家的網銀帳密，也不等同銀行入帳確認。",
  },
  {
    q: "LINE 通知與末五碼比對要額外付費嗎？",
    a: "不用。免費版即含站內 ATM 末五碼比對額度；專業版起為無限筆數，並含運費設定與 LINE 每日帳務彙整。付費升級統一走拓新雲端主站綠界 ECPay（同一帳號）。",
  },
] as const;

export function LandingFaq() {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="relative z-10 scroll-mt-20 border-t border-border/70 bg-card/30 py-16 md:py-20"
    >
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          常見問題
        </h2>
        <p className="mt-3 text-muted-foreground">
          代購／團購主最常問的開店與對帳問題，先講清楚再建立賣場。
        </p>

        <div className="mt-8 divide-y divide-border/80 border-y border-border/80">
          {FAQ_ITEMS.map((item, index) => {
            const open = openIndex === index;
            const panelId = `${baseId}-panel-${index}`;
            const buttonId = `${baseId}-button-${index}`;

            return (
              <div key={item.q} className="py-1">
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-primary"
                  >
                    <span className="font-display text-base font-semibold leading-snug md:text-lg">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                        open && "rotate-180 text-primary"
                      )}
                      aria-hidden
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-out",
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="pb-4 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
