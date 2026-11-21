import type { MetadataRoute } from "next";
import { PRODUCTION_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const paths = [
    "",
    "/login",
    "/signup",
    "/terms",
    "/privacy",
    "/legal",
    "/contact",
    "/track",
  ];

  return paths.map((path) => ({
    url: `${PRODUCTION_URL}${path || "/"}`,
    lastModified,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));
}
