import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CATEGORIES, ENTRIES, inCategory, type Locale } from "@/lib/catalog";
import { ComponentGallery } from "@/components/site/ComponentGallery";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "components" });
  return pageMetadata({ locale: locale as Locale, path: "/components", title: t("title"), description: t("intro") });
}

export default async function ComponentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const t = await getTranslations("components");

  const items = ENTRIES.map((entry) => ({
    slug: entry.slug,
    name: entry.name,
    code: entry.code,
    category: entry.category,
    categoryName: CATEGORIES.find((c) => c.id === entry.category)?.name[loc] ?? "",
    summary: entry.summary[loc],
  }));
  const categories = CATEGORIES.map((c) => ({ id: c.id, name: c.name[loc], count: inCategory(c.id).length })).filter((c) => c.count);

  return (
    <ComponentGallery
      items={items}
      categories={categories}
      labels={{
        title: t("title"),
        intro: t("intro"),
        all: t("all"),
        filter: t("filter"),
        searchLabel: t("searchLabel"),
        category: t("category"),
        getStarted: t("getStarted"),
        introduction: t("introduction"),
        installation: t("installation"),
        categories: t("categories"),
        empty: t("empty"),
        count: t("count", { count: "{count}" }),
      }}
    />
  );
}
