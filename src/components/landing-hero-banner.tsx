import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

/**
 * Full-bleed hero: pure tech background + CSS-rendered storefront positioning.
 */
export function LandingHeroBanner({
  trialLine,
}: {
  trialLine: ReactNode;
}) {
  return (
    <section
      aria-label="NovaStore 品牌介紹"
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-[#0B132B] md:min-h-[min(92svh,880px)]"
    >
      <div className="absolute inset-0 -z-20" aria-hidden>
        <Image
          src="/hero-bg-mobile.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center md:hidden"
        />
        <Image
          src="/hero-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hidden object-cover object-center md:block"
        />
      </div>

      <div
        className="absolute inset-0 -z-10 bg-[#0B132B]/60 md:bg-[#0B132B]/55"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0B132B]/50 via-transparent to-[#0B132B]/85"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-24 pt-24 text-center sm:px-6 md:pb-28 md:pt-28">
        <div className="animate-fade-up">
          <BrandLogo
            size="lg"
            className="justify-center text-sky-50 [&_span]:tracking-tight"
          />
        </div>
        <p className="animate-fade-up delay-100 mt-5 text-xs font-semibold tracking-[0.18em] text-sky-300/90">
          一站式獨立開店 × 自動對帳
        </p>

        <h1 className="animate-fade-up delay-100 mt-5 max-w-4xl text-balance font-display text-3xl font-bold leading-snug tracking-tight text-white md:text-5xl md:leading-[1.15]">
          3分鐘建立你的 IG 專屬獨立賣場：免手動對帳、免私訊收單，讓粉絲自己下單結帳！
        </h1>

        <p className="animate-fade-up delay-200 mt-6 max-w-3xl text-pretty text-base leading-relaxed text-sky-100/90 md:mt-8 md:text-lg md:leading-relaxed">
          專為台灣代購、團購主、微商打造的極速開店工具。支援多規格選購、超商取貨、團購達標進度，買家匯款後
          NovaStore 系統自動對帳、LINE 秒收通知，告別 Excel 與截圖地獄！
        </p>

        <div className="animate-fade-up delay-300 mt-10 flex flex-wrap items-center justify-center gap-3 md:mt-12">
          <Button
            asChild
            size="lg"
            className="h-12 bg-sky-400 px-6 text-base font-semibold text-slate-950 hover:bg-sky-300"
          >
            <Link href="/signup" prefetch>
              免費建立獨立賣場
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 border-sky-100/40 bg-transparent px-6 text-base text-sky-50 hover:bg-white/10 hover:text-white"
          >
            <Link href="#live-demo">體驗開店流程</Link>
          </Button>
        </div>

        <div className="animate-fade-up delay-300 mt-5 text-sm text-sky-100/80">
          {trialLine}
        </div>
      </div>
    </section>
  );
}
