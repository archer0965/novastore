"use client";

import { useEffect } from "react";

/** Registers /sw.js once on the client so NovaStore meets installability criteria. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Pick up new shells after deploy without waiting for a full tab close.
          void reg.update();
        })
        .catch((err) => {
          console.warn("[pwa] service worker register failed", err);
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
