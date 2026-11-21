import { redirect } from "next/navigation";
import { hubAuthRedirect } from "@/lib/hub-auth";
import { sanitizeNextPath } from "@/lib/safe-next";

export const metadata = { title: "登入" };

/** Unified NovaOS login — always via paycheck.com.de */
export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  redirect(hubAuthRedirect("login", sanitizeNextPath(searchParams.next)));
}
