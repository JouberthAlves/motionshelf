import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CATEGORIES, ENTRIES, type Locale } from "@/lib/catalog";
import { installCommand } from "@/lib/code";
import { TerminalBackground } from "@/components/site/TerminalBackground";
import { Pedestals } from "@/components/site/Pedestals";
import { Vitrine } from "@/components/site/Vitrine";
import { CopyCommand } from "@/components/site/CopyCommand";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const meta = pageMetadata({ locale: locale as Locale, path: "", description: t("description") });
  return { ...meta, openGraph: { ...meta.openGraph, title: t("title") } };
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const hero = await getTranslations("hero");
  const home = await getTranslations("home");
  const component = await getTranslations("component");

  return (
    <>
      <section className="relative isolate -mt-16 overflow-hidden pt-16">
        <TerminalBackground />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pt-20 pb-14 text-center sm:px-6 sm:pt-28">
          <h1 className="display-wide max-w-5xl text-[clamp(2.4rem,6.4vw,5rem)] text-balance text-text">
            {hero("title")}
          </h1>
          <p className="mt-6 max-w-xl text-base text-pretty text-text/80 sm:text-lg">{hero("subtitle")}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/components"
              className="rounded-md bg-led px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-led-soft"
            >
              {hero("browse")}
            </Link>
            <Link
              href="/docs/installation"
              className="rounded-md border border-led/70 bg-ink/80 px-6 py-3 text-sm font-semibold text-text transition-colors hover:border-led-soft hover:bg-led/10"
            >
              {hero("install")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <Pedestals />
      </section>

      <div className="py-24">
        <Vitrine
          items={ENTRIES.map((entry) => ({
            slug: entry.slug,
            name: entry.name,
            code: entry.code,
            category: entry.category,
            categoryName: CATEGORIES.find((c) => c.id === entry.category)?.name[loc] ?? "",
            summary: entry.summary[loc],
            command: installCommand(entry.slug),
          }))}
          labels={{
            eyebrow: home("showcaseEyebrow"),
            title: home("showcaseTitle"),
            open: home("open"),
            copyInstall: home("copyInstall"),
            copiedInstall: home("copiedInstall"),
            prompt: home("prompt"),
          }}
        />
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="rounded-2xl border border-edge bg-shelf p-6 sm:p-10">
          <h2 className="display-wide text-2xl text-text sm:text-3xl">{home.rich("installTitle", { shine: (chunks) => <span className="shiny-text">{chunks}</span> })}</h2>
          <p className="mt-3 max-w-2xl text-muted">{home("installText")}</p>
          <div className="mt-6">
            <CopyCommand
              command={installCommand("payment-notification")}
              label={{ copy: component("copy"), copied: component("copied") }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
