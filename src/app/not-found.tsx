import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <BrandLogo size="md" />
      <h1 className="mt-8 font-display text-3xl font-semibold">找不到頁面</h1>
      <p className="mt-3 text-muted-foreground">
        連結可能已失效，或網址打錯了。回首頁繼續使用NovaStore。
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">回首頁</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">登入後台</Link>
        </Button>
      </div>
    </div>
  );
}
