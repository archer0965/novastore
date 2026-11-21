import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const BRAND_ASSETS = new Set([
  "/manifest.json",
  "/brand-mark.png",
  "/pwa-icon.png",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
  "/pwa-icon-maskable-512.png",
  "/pwa-apple-touch-icon.png",
  "/icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
  "/favicon-16.png",
  "/favicon-32.png",
  "/hero-bg.jpg",
  "/hero-bg-mobile.jpg",
  "/hero-bg.webp",
  "/hero-bg-mobile.webp",
  "/hero-banner-desktop.jpg",
  "/hero-banner-mobile.jpg",
  "/hero-banner-desktop.webp",
  "/hero-banner-mobile.webp",
]);

/**
 * NovaStore runtime cache:
 * - Brand icons / manifest: Cache-First (instant chrome on reopen)
 * - Auth / API / dashboard: Network-Only (never serve stale session HTML)
 * - Everything else: Serwist Next.js defaults (SWR / Cache-First / Network-First)
 */
const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && BRAND_ASSETS.has(url.pathname),
    handler: new CacheFirst({
      cacheName: "novastore-brand",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin &&
      (url.pathname.startsWith("/api/") ||
        url.pathname.startsWith("/auth/") ||
        url.pathname.startsWith("/dashboard")),
    handler: new NetworkOnly(),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
