"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({
  mode,
  nextPath = "/dashboard",
  signupHint,
}: {
  mode: "login" | "signup";
  nextPath?: string;
  /** Shown under signup subtitle (e.g. early-bird trial). */
  signupHint?: string | null;
}) {
  const router = useRouter();
  const safeNext = sanitizeNextPath(nextPath);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const otherAuthHref =
    mode === "login"
      ? `/signup?next=${encodeURIComponent(safeNext)}`
      : `/login?next=${encodeURIComponent(safeNext)}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { shop_name: shopName },
            emailRedirectTo: `${(process.env.NEXT_PUBLIC_BASE_URL || window.location.origin).replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(safeNext)}`,
          },
        });
        if (error) throw error;

        if (data.session) {
          toast.success("註冊成功");
          router.push(safeNext);
          router.refresh();
        } else {
          toast.success("請至信箱完成驗證後再登入");
          router.push(`/login?next=${encodeURIComponent(safeNext)}`);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("登入成功");
        router.push(safeNext);
        router.refresh();
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "操作失敗";
      const map: Record<string, string> = {
        "Invalid login credentials": "Email 或密碼錯誤",
        "Email not confirmed": "Email 尚未驗證，請先至信箱點擊驗證連結",
        "User already registered": "此 Email 已註冊，請直接登入",
        "Password should be at least 6 characters": "密碼至少需要 6 碼",
        "Unable to validate email address: invalid format": "Email 格式不正確",
      };
      toast.error(map[raw] || raw);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <BrandLogo className="mb-8 justify-center" />
        <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm">
          <h1 className="font-display text-2xl font-semibold">
            {mode === "login" ? "登入 NovaStore" : "免費建立賣場"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "進入賣家控制台管理賣場、訂單與匯款核對"
              : "3 分鐘建立 IG 專屬獨立賣場，粉絲自己下單結帳"}
          </p>
          {mode === "signup" && signupHint ? (
            <p className="mt-3 rounded-md border border-accent/35 bg-accent/10 px-3 py-2 text-sm font-medium text-accent-foreground">
              {signupHint}
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="shop_name">店名</Label>
                <Input
                  id="shop_name"
                  className="h-12"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="你的品牌或工作室名稱"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email（登入／續費通知）</Label>
              <Input
                id="email"
                type="email"
                className="h-12"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              {mode === "signup" ? (
                <p className="text-xs text-muted-foreground">
                  此 Email 同時用於登入，以及訂閱成功、到期續費提醒通知。
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                className="h-12"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 碼"
              />
            </div>
            {mode === "signup" ? (
              <p className="text-xs text-muted-foreground">
                註冊即表示您同意我們的{" "}
                <Link href="/terms" className="text-primary underline-offset-2 hover:underline">
                  服務條款
                </Link>{" "}
                與{" "}
                <Link href="/privacy" className="text-primary underline-offset-2 hover:underline">
                  隱私權政策
                </Link>
                。
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-12 w-full gap-2 text-base"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "login" ? "登入" : "建立帳號"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                還沒有帳號？{" "}
                <Link href={otherAuthHref} className="font-medium text-primary">
                  免費註冊
                </Link>
              </>
            ) : (
              <>
                已有帳號？{" "}
                <Link href={otherAuthHref} className="font-medium text-primary">
                  登入
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
