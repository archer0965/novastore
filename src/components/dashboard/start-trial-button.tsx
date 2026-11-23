"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  FREE_TRIAL,
  SIGNUP_EARLY_BIRD,
  formatSignupEarlyBirdDiscountPhrase,
} from "@/types/database";

export function StartTrialButton({
  earlyBirdOpen,
  earlyBirdRemaining,
  className,
}: {
  earlyBirdOpen: boolean;
  earlyBirdRemaining: number;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onStart() {
    setLoading(true);
    try {
      const res = await fetch("/api/trial/start", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "開通失敗");
      }
      toast.success(data.message || "試用已開通");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "開通失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className={
        className ||
        "space-y-3 rounded-2xl border border-amber-300/70 bg-amber-50/90 p-5 shadow-sm"
      }
    >
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="min-w-0 space-y-1">
          <h2 className="font-display text-lg font-semibold text-amber-950">
            {FREE_TRIAL.startButtonLabel}
          </h2>
          <p className="text-sm text-amber-950/80">
            註冊不會自動開始試用。點下方按鈕後，本站立即開通全功能並倒數{" "}
            {FREE_TRIAL.durationDays} 天。
          </p>
          <p className="text-sm text-amber-900/80">
            {earlyBirdOpen
              ? `${SIGNUP_EARLY_BIRD.label}尚餘 ${earlyBirdRemaining}/${SIGNUP_EARLY_BIRD.maxUsers} 名：開始試用即鎖定終身${formatSignupEarlyBirdDiscountPhrase()}。`
              : `早鳥名額已滿；仍可開始 ${FREE_TRIAL.durationDays} 天全功能試用，續約依標準方案。`}
          </p>
        </div>
      </div>
      <Button
        type="button"
        className="h-11 gap-1.5 bg-amber-800 text-amber-50 hover:bg-amber-900"
        disabled={loading}
        onClick={() => void onStart()}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {FREE_TRIAL.startButtonLabel}
      </Button>
    </section>
  );
}
