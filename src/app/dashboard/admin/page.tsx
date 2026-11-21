import { redirect } from "next/navigation";
import { AdminEarlyBirdPanel } from "@/components/dashboard/admin-early-bird";
import { AdminStatsPanel } from "@/components/dashboard/admin-stats";
import { ensureAdminProfile, isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "管理者後台",
};

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/dashboard");

  await ensureAdminProfile(user.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          管理者後台
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          登入身分：{user.email} · 已開通全功能無限額度
        </p>
        <p className="mt-2 text-sm">
          <a href="#partners" className="font-medium text-primary hover:underline">
            特約店家管理
          </a>
          <span className="text-muted-foreground">
            {" "}
            — 手動加入 Email、查看店家詳情與聯絡資料
          </span>
        </p>
      </div>
      <AdminEarlyBirdPanel />
      <AdminStatsPanel />
    </div>
  );
}
