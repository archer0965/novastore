import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateProductForm } from "@/components/store/create-product-form";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "開團／上架",
};

export default async function StoreCreatePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("bank_code, bank_account, shop_slug")
    .eq("id", user.id)
    .maybeSingle();

  const missingBank = !profile?.bank_code?.trim() || !profile?.bank_account?.trim();

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            開團／上架
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            微商/代購或團購雙模式，建立後立刻取得買家下單連結。
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/store/stats">開店統計</Link>
        </Button>
      </div>
      {missingBank ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          尚未設定匯款銀行帳號。買家頁不會顯示匯款資訊，建議先至{" "}
          <Link href="/dashboard/settings" className="font-medium underline-offset-2 hover:underline">
            個人設定
          </Link>{" "}
          補齊後再分享連結。
        </div>
      ) : null}
      <CreateProductForm />
    </div>
  );
}
