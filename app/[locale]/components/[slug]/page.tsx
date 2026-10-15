import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CATEGORIES, ENTRIES, bySlug, type Locale } from "@/lib/catalog";
import { routing } from "@/i18n/routing";
import { highlightedSource, installCommand } from "@/lib/code";
import { Sidebar } from "@/components/site/Sidebar";
import { PropsTable } from "@/components/site/PropsTable";
import { CodeTabs } from "@/components/site/CodeTabs";
import { CopyCommand } from "@/components/site/CopyCommand";
import { Preview } from "@/components/site/Preview";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";

type Params = Promise<{ locale: string; slug: string }>;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => ENTRIES.map((entry) => ({ locale, slug: entry.slug })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = bySlug(slug);
  if (!entry) return {};
  return pageMetadata({
    locale: locale as Locale,
    path: `/components/${slug}`,
    title: entry.name,
    description: entry.summary[locale as Locale],
  });
}

export default async function ComponentPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const entry = bySlug(slug);
  if (!entry) notFound();

  const loc = locale as Locale;
  const t = await getTranslations("component");
  const tc = await getTranslations("components");
  const code = await highlightedSource(entry.slug);
  const category = CATEGORIES.find((c) => c.id === entry.category)?.name[loc] ?? "";

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)_160px]">
      <Sidebar current={entry.slug} locale={loc} label={tc("all")} />

      <article className="@container min-w-0 space-y-16">
        <header>
          <Link href="/components" className="mb-6 inline-block py-1 text-sm text-muted transition-colors hover:text-text md:hidden">
            ← {tc("all")}
          </Link>
          <p className="font-mono text-xs text-led-soft">
            {entry.code} · {category}
          </p>
          <h1 className="display-wide mt-2 text-[clamp(1.75rem,9cqi,3rem)] text-text">{entry.name}</h1>
          <p className="mt-3 max-w-2xl text-muted">{entry.summary[loc]}</p>
        </header>

        <section id="preview" className="scroll-mt-24">
          <CodeTabs
            preview={<Preview slug={entry.slug} replayLabel={t("replay")} />}
            codeHtml={code}
            labels={{ preview: t("preview"), code: t("code") }}
          />
        </section>

        <section id="install" className="scroll-mt-24 space-y-3">
          <h2 className="display-wide text-xl text-text">{t("install")}</h2>
          <CopyCommand command={installCommand(entry.slug)} label={{ copy: t("copy"), copied: t("copied") }} />
          <p className="text-sm text-muted">{t("installNote")}</p>
        </section>

        <section id="props" className="scroll-mt-24 space-y-3">
          <h2 className="display-wide text-xl text-text">{t("props")}</h2>
          <PropsTable
            props={entry.props}
            locale={loc}
            labels={{
              name: t("name"),
              type: t("type"),
              default: t("default"),
              description: t("description"),
            }}
          />
        </section>

        <section id="dependencies" className="scroll-mt-24 space-y-3">
          <h2 className="display-wide text-xl text-text">{t("dependencies")}</h2>
          <ul className="flex flex-wrap gap-2">
            {entry.dependencies.map((dep) => (
              <li key={dep} className="rounded-md border border-edge bg-shelf px-2.5 py-1 font-mono text-xs text-text">
                {dep}
              </li>
            ))}
          </ul>
        </section>
      </article>

      <aside className="hidden xl:block">
        <nav aria-label={t("onThisPage")} className="sticky top-24 space-y-2 text-sm">
          <p className="font-mono text-xs tracking-[0.12em] text-muted uppercase">{t("onThisPage")}</p>
          {(["preview", "install", "props", "dependencies"] as const).map((id) => (
            <a key={id} href={`#${id}`} className="block text-muted transition-colors hover:text-text">
              {t(id)}
            </a>
          ))}
        </nav>
      </aside>
    </div>
  );
}
