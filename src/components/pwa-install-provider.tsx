"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearInstallDismissed,
  isStandaloneDisplay,
  readInstallDismissed,
  writeInstallDismissed,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install";

type PwaInstallContextValue = {
  installed: boolean;
  canPrompt: boolean;
  deferred: BeforeInstallPromptEvent | null;
  dismissed: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  dismiss: () => void;
  markInstalled: () => void;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    setInstalled(isStandaloneDisplay());
    setDismissed(readInstallDismissed());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      clearInstallDismissed();
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (installed) return "accepted" as const;
    if (!deferred) return "unavailable" as const;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === "accepted") {
        setInstalled(true);
        clearInstallDismissed();
      }
      return choice.outcome;
    } catch {
      setDeferred(null);
      return "unavailable" as const;
    }
  }, [deferred, installed]);

  const dismiss = useCallback(() => {
    writeInstallDismissed();
    setDismissed(true);
  }, []);

  const markInstalled = useCallback(() => {
    setInstalled(true);
    setDeferred(null);
  }, []);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      installed,
      canPrompt: Boolean(deferred) && !installed,
      deferred,
      dismissed,
      promptInstall,
      dismiss,
      markInstalled,
    }),
    [installed, deferred, dismissed, promptInstall, dismiss, markInstalled]
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall(): PwaInstallContextValue {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error("usePwaInstall must be used within PwaInstallProvider");
  }
  return ctx;
}

/** Safe for components that may render outside the provider in tests. */
export function usePwaInstallOptional(): PwaInstallContextValue | null {
  return useContext(PwaInstallContext);
}
