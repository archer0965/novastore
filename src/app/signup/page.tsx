import { AuthForm } from "@/components/auth/auth-form";
import { SignupEarlyBirdTopBanner } from "@/components/signup-early-bird-top-banner";
import { sanitizeNextPath } from "@/lib/safe-next";
import { getSignupEarlyBirdStatus } from "@/lib/signup-early-bird";
import { SIGNUP_EARLY_BIRD } from "@/types/database";

export const metadata = { title: "免費註冊" };
export const revalidate = 60;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const early = await getSignupEarlyBirdStatus();
  const signupHint = early.open
    ? `${SIGNUP_EARLY_BIRD.description}（目前 ${early.used}/${early.max}）・不是一般 7 天試用`
    : null;

  return (
    <div className="min-h-screen">
      {early.open ? (
        <SignupEarlyBirdTopBanner
          used={early.used}
          max={early.max}
          trialDays={early.trialDays}
          remaining={early.remaining}
        />
      ) : null}
      <AuthForm
        mode="signup"
        nextPath={sanitizeNextPath(searchParams.next)}
        signupHint={signupHint}
      />
    </div>
  );
}
