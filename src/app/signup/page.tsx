import { redirect } from "next/navigation";
import { hubAuthRedirect } from "@/lib/hub-auth";
import { sanitizeNextPath } from "@/lib/safe-next";

export const metadata = { title: "免費註冊" };

/** Unified NovaOS signup — always via paycheck.com.de */
export default function SignupPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  redirect(hubAuthRedirect("signup", sanitizeNextPath(searchParams.next)));
}
