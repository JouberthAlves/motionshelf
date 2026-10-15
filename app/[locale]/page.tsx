import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { Link } from "@/i18n/navigation";
import { TerminalBackground } from "@/components/site/TerminalBackground";

export default function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("hero");

  return (
    <section className="relative isolate overflow-hidden">
      <TerminalBackground />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pb-24 pt-24 text-center sm:px-6 sm:pt-32">
        <h1 className="display-wide max-w-4xl text-balance text-[clamp(2.4rem,7vw,5.4rem)] text-text">{t("title")}</h1>
        <p className="mt-6 max-w-xl text-pretty text-base text-muted sm:text-lg">{t("subtitle")}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/components"
            className="rounded-md bg-led px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-led-soft"
          >
            {t("browse")}
          </Link>
          <Link
            href="/docs/installation"
            className="rounded-md border border-led/70 px-6 py-3 text-sm font-semibold text-text transition-colors hover:border-led-soft hover:bg-led/10"
          >
            {t("install")}
          </Link>
        </div>
      </div>
    </section>
  );
}
