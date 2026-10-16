import type { MetadataRoute } from "next";
import { ENTRIES } from "@/lib/catalog";
import { siteUrl } from "@/lib/seo";

// Cada página do site (só em inglês, sem prefixo de idioma).
const PATHS = ["", "/components", "/docs/installation", "/docs/agents", ...ENTRIES.map((e) => `/components/${e.slug}`)];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({
    url: `${siteUrl}${path || "/"}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : path === "/components" ? 0.8 : 0.6,
  }));
}
