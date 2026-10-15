import type { MetadataRoute } from "next";
import { ENTRIES } from "@/lib/catalog";
import { siteUrl } from "@/lib/seo";

// Cada página nos dois idiomas, com a outra versão declarada em alternates.
const PATHS = ["", "/components", "/docs/installation", ...ENTRIES.map((e) => `/components/${e.slug}`)];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.flatMap((path) =>
    (["en", "pt"] as const).map((locale) => ({
      url: `${siteUrl}/${locale}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : path === "/components" ? 0.8 : 0.6,
      alternates: { languages: { en: `${siteUrl}/en${path}`, "pt-BR": `${siteUrl}/pt${path}` } },
    })),
  );
}
