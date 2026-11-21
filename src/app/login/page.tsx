import { AuthForm } from "@/components/auth/auth-form";
import { sanitizeNextPath } from "@/lib/safe-next";

export const metadata = { title: "登入" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return (
    <AuthForm mode="login" nextPath={sanitizeNextPath(searchParams.next)} />
  );
}
