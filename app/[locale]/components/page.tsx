import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/catalog";
import { Shelves } from "@/components/site/Shelf";
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

  return (
    <div className="@container mx-auto max-w-7xl px-4 pt-16 pb-24 sm:px-6">
      <h1 className="display-wide text-[clamp(2rem,9cqi,3.75rem)] text-text">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-muted">{t("intro")}</p>
      <div className="mt-12">
        <Shelves locale={loc} />
      </div>
    </div>
  );
}
