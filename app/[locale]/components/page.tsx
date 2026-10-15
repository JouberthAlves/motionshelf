import { getTranslations, setRequestLocale } from "next-intl/server";
import { CATEGORIES, type Locale, inCategory } from "@/lib/catalog";
import { Shelf } from "@/components/site/Shelf";

export default async function ComponentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const t = await getTranslations("components");

  return (
    <div className="mx-auto max-w-7xl px-4 pt-16 pb-24 sm:px-6">
      <h1 className="display-wide text-5xl text-text sm:text-6xl">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-muted">{t("intro")}</p>
      <div className="mt-12">
        {CATEGORIES.map((category) => (
          <Shelf key={category.id} title={category.name[loc]} entries={inCategory(category.id)} locale={loc} />
        ))}
      </div>
    </div>
  );
}
