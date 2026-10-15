import type { Metadata } from "next";
import { Archivo, Hanken_Grotesk, Martian_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { CATEGORIES, ENTRIES, type Locale } from "@/lib/catalog";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CommandMenu, type SearchItem } from "@/components/site/CommandMenu";
import "../globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });
const martian = Martian_Mono({ subsets: ["latin"], variable: "--font-martian" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("title"), template: "%s · Motionshelf" },
    description: t("description"),
    alternates: { languages: { en: "/en", pt: "/pt" } },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const loc = locale as Locale;
  const items: SearchItem[] = ENTRIES.map((entry) => ({
    slug: entry.slug,
    name: entry.name,
    group: CATEGORIES.find((c) => c.id === entry.category)?.name[loc] ?? "",
    code: entry.code,
    summary: entry.summary[loc],
  }));

  return (
    <html lang={locale === "pt" ? "pt-BR" : "en"} className={`${archivo.variable} ${hanken.variable} ${martian.variable}`}>
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
          <CommandMenu items={items} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
