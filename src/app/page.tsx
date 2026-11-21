import dynamic from "next/dynamic";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LandingHeroBanner } from "@/components/landing-hero-banner";
import { LandingNavMenu } from "@/components/landing-nav-menu";
import { PwaBootRedirect } from "@/components/pwa-boot-redirect";
import { SignupEarlyBirdTopBanner } from "@/components/signup-early-bird-top-banner";
import { Button } from "@/components/ui/button";
import { getSignupEarlyBirdStatus } from "@/lib/signup-early-bird";
import { PRODUCTION_URL, siteConfig } from "@/lib/site";
import { FREE_TRIAL } from "@/types/database";

export const revalidate = 60;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: PRODUCTION_URL,
  description:
    "專為台灣代購、團購主打造的一站式獨立賣場與自動對帳平台。3分鐘建立賣場，買家自助下單，系統自動對帳並 LINE 通知。",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "TWD",
    description: FREE_TRIAL.description,
  },
};

const sectionFallback = (
  <section className="relative z-10 py-16 md:py-20">
    <div className="mx-auto max-w-6xl px-4">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-secondary" />
      <div className="mt-8 h-48 animate-pulse rounded-2xl border border-border bg-card/60" />
    </div>
  </section>
);

/** Below-fold sections are code-split to shrink the hero JS payload. */
const LandingWhatsNew = dynamic(
  () =>
    import("@/components/landing-whats-new").then((m) => m.LandingWhatsNew),
  { loading: () => sectionFallback }
);
const LandingInteractiveDemo = dynamic(
  () =>
    import("@/components/landing-interactive-demo").then(
      (m) => m.LandingInteractiveDemo
    ),
  { loading: () => sectionFallback }
);
const LandingLiveDemo = dynamic(
  () =>
    import("@/components/landing-live-demo").then((m) => m.LandingLiveDemo),
  { loading: () => sectionFallback }
);
const LandingHowItWorks = dynamic(
  () =>
    import("@/components/landing-how-it-works").then(
      (m) => m.LandingHowItWorks
    ),
  { loading: () => sectionFallback }
);
const LandingPricing = dynamic(
  () => import("@/components/landing-pricing").then((m) => m.LandingPricing),
  { loading: () => sectionFallback }
);
const PartnerStoreSection = dynamic(
  () =>
    import("@/components/partner-store-apply").then(
      (m) => m.PartnerStoreSection
    ),
  { loading: () => sectionFallback }
);
const LandingTrust = dynamic(
  () => import("@/components/landing-trust").then((m) => m.LandingTrust),
  { loading: () => sectionFallback }
);
const LandingFaq = dynamic(
  () => import("@/components/landing-faq").then((m) => m.LandingFaq),
  { loading: () => sectionFallback }
);
const SiteFooter = dynamic(
  () => import("@/components/site-footer").then((m) => m.SiteFooter),
  { loading: () => null }
);

export default async function LandingPage() {
  const earlySignup = await getSignupEarlyBirdStatus();
  const trialDays = earlySignup.open
    ? earlySignup.trialDays
    : FREE_TRIAL.durationDays;

  const trialLine = earlySignup.open ? (
    <p>
      早鳥優惠進行中：前 {earlySignup.max} 名享 {earlySignup.trialDays}{" "}
      天試用（{earlySignup.used}/{earlySignup.max}）
    </p>
  ) : (
    <p>新註冊先免費試用 {trialDays} 天，立刻建立獨立賣場開始收單。</p>
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0B132B] pb-20 sm:pb-0">
      <PwaBootRedirect />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {earlySignup.open ? (
        <SignupEarlyBirdTopBanner
          used={earlySignup.used}
          max={earlySignup.max}
          trialDays={earlySignup.trialDays}
          remaining={earlySignup.remaining}
        />
      ) : null}

      <header
        className={
          earlySignup.open
            ? "relative z-50 mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 md:py-5"
            : "relative z-50 mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 md:absolute md:inset-x-0 md:top-0 md:mx-auto md:w-full md:max-w-6xl md:py-5"
        }
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <BrandLogo size="md" className="text-sky-50" />
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LandingNavMenu />
          <Button
            asChild
            variant="ghost"
            className="hidden text-sky-50 hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <Link href="/login" prefetch>
              登入
            </Link>
          </Button>
          <Button
            asChild
            className="hidden bg-accent text-accent-foreground hover:bg-accent/90 sm:inline-flex"
          >
            <Link href="/signup" prefetch>
              免費建立賣場
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90 sm:hidden"
          >
            <Link href="/login" prefetch>
              登入
            </Link>
          </Button>
        </div>
      </header>

      <main id="main-content">
        <LandingHeroBanner trialLine={trialLine} />

        <div className="cv-auto relative z-10 bg-background">
          <LandingWhatsNew />
        </div>

        <div className="cv-auto relative z-10 bg-background">
          <LandingInteractiveDemo />
        </div>

        <div className="cv-auto relative z-10 bg-background">
          <LandingLiveDemo />
        </div>

        <div className="cv-auto relative z-10 bg-background">
          <LandingHowItWorks />
        </div>

        <div className="cv-auto relative z-10 bg-background">
          <LandingPricing />
        </div>

        <div className="cv-auto relative z-10 bg-background">
          <PartnerStoreSection />
        </div>

        <div className="cv-auto relative z-10 bg-background">
          <LandingTrust trialDays={trialDays} />
        </div>

        <div className="cv-auto relative z-10 bg-background">
          <LandingFaq />
        </div>
      </main>

      <div className="relative z-10 bg-background">
        <SiteFooter />
      </div>

      <div className="nav-surface fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2.5 sm:hidden">
        <Button asChild variant="outline" className="h-11 flex-1">
          <Link href="#pricing">選擇方案</Link>
        </Button>
        <Button asChild className="h-11 flex-[1.4]">
          <Link href="/signup" prefetch>
            免費建立賣場
          </Link>
        </Button>
      </div>
    </div>
  );
}
