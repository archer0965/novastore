import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export const dynamic = "force-static";
export const revalidate = false;

/** Offline fallback shell shown by Serwist when navigation fails. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0B132B] px-6 text-center text-sky-50">
      <BrandLogo size="lg" className="text-sky-50 [&_svg]:text-sky-300" />
      <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">
        目前離線
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-sky-100/75">
        NovaStore 無法連上網路。請檢查連線後再試；已快取的靜態資源仍可先載入。
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-sky-400 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-300"
      >
        重新載入
      </Link>
    </main>
  );
}
