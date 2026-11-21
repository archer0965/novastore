import { Suspense } from "react";
import { AuthReceiveClient } from "./receive-client";

export default function AuthReceivePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">正在完成登入…</p>
        </main>
      }
    >
      <AuthReceiveClient />
    </Suspense>
  );
}
