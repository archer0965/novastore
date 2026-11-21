import { AuthSessionKeeper } from "@/components/auth-session-keeper";
import { DashboardNav } from "@/components/dashboard/nav";
import { SiteFooter } from "@/components/site-footer";
import { ensureAdminProfile, isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = isAdminEmail(user?.email);
  if (isAdmin && user) {
    await ensureAdminProfile(user.id);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AuthSessionKeeper />
      <DashboardNav isAdmin={isAdmin} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 md:py-8 md:pb-8"
      >
        {children}
      </main>
      {/* Hide heavy footer on mobile — bottom tab bar already occupies space */}
      <div className="hidden sm:block">
        <SiteFooter />
      </div>
    </div>
  );
}
