import { spawnSync } from "node:child_process";
import withSerwistInit from "@serwist/next";

const gitRevision = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf-8",
}).stdout?.trim();
const revision = gitRevision || crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Keep our PwaRegister so install UX stays in one place.
  register: false,
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [
    { url: "/~offline", revision },
    { url: "/manifest.json", revision },
    { url: "/brand-mark.png", revision },
    { url: "/pwa-icon.png", revision },
    { url: "/pwa-icon-192.png", revision },
    { url: "/pwa-icon-512.png", revision },
    { url: "/pwa-icon-maskable-512.png", revision },
    { url: "/pwa-apple-touch-icon.png", revision },
    { url: "/favicon.ico", revision },
    { url: "/hero-bg.jpg", revision },
    { url: "/hero-bg-mobile.jpg", revision },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "sonner"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/swe-worker-:hash.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
      {
        source:
          "/:file(favicon.ico|favicon-16.png|favicon-32.png|apple-touch-icon.png|icon.png|icon-192.png|icon-512.png|icon-512-maskable.png|brand-mark.png|pwa-icon.png|pwa-icon-192.png|pwa-icon-512.png|pwa-icon-maskable-512.png|pwa-apple-touch-icon.png|hero-bg.jpg|hero-bg.webp|hero-bg-mobile.jpg|hero-bg-mobile.webp|hero-banner.png|hero-banner-desktop.jpg|hero-banner-desktop.webp|hero-banner-mobile.jpg|hero-banner-mobile.webp|og.jpg|og-image.jpg)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=600",
          },
        ],
      },
      {
        source: "/(terms|privacy|contact)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/~offline",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
