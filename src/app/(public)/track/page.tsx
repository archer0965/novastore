import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderTrackPanel } from "@/components/store/order-track-panel";

export const metadata: Metadata = {
  title: "買家查單",
  description: "免登入以訂單編號或買家姓名查詢 NovaStore 訂單對帳與出貨狀態。",
};

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-border/80 bg-card/80 px-4 py-10 text-center text-sm text-muted-foreground">
          載入查單頁面…
        </div>
      }
    >
      <OrderTrackPanel />
    </Suspense>
  );
}
