import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { installCommand } from "@/lib/code";
import { CopyCommand } from "@/components/site/CopyCommand";
import type { Locale } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

const USAGE = `import PaymentNotification from "@/components/motionshelf/payment-notification";

export default function Page() {
  return <PaymentNotification amount={150} sender="Alex M." />;
}`;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "docs" });
  return pageMetadata({ locale: locale as Locale, path: "/docs/installation", title: t("installTitle"), description: t("intro") });
}

export default async function InstallationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("docs");
  const c = await getTranslations("component");
  const labels = { copy: c("copy"), copied: c("copied") };

  return (
    <div className="@container mx-auto max-w-3xl px-4 pt-16 pb-24 sm:px-6">
      <p className="font-mono text-xs text-led-soft">Docs</p>
      <h1 className="display-wide mt-2 text-[clamp(1.75rem,9cqi,3rem)] text-text">{t("installTitle")}</h1>
      <p className="mt-4 text-muted">{t("intro")}</p>

      <h2 className="display-wide mt-12 text-xl text-text">{t("requirementsTitle")}</h2>
      <ul className="mt-3 list-inside list-disc space-y-1 text-muted">
        <li>{t("req1")}</li>
        <li>{t("req2")}</li>
        <li>{t("req3")}</li>
      </ul>

      <h2 className="display-wide mt-12 text-xl text-text">{t("depsTitle")}</h2>
      <p className="mt-3 text-muted">{t("depsText")}</p>
      <div className="mt-3">
        <CopyCommand command="pnpm add gsap @gsap/react" label={labels} />
      </div>

      <h2 className="display-wide mt-12 text-xl text-text">{t("addTitle")}</h2>
      <p className="mt-3 text-muted">{t("addText")}</p>
      <div className="mt-3">
        <CopyCommand command={installCommand("payment-notification")} label={labels} />
      </div>

      <h2 className="display-wide mt-12 text-xl text-text">{t("useTitle")}</h2>
      <p className="mt-3 text-muted">{t("useText")}</p>
      <pre className="mt-3 overflow-x-auto rounded-xl border border-edge bg-shelf p-4 font-mono text-[12.5px] leading-relaxed text-text">
        {USAGE}
      </pre>

      <h2 className="display-wide mt-12 text-xl text-text">{t("licenseTitle")}</h2>
      <p className="mt-3 text-muted">{t("licenseText")}</p>

      <p className="mt-10">
        <Link href="/components" className="text-led-soft transition-colors hover:text-text">
          {t("browseLink")}
        </Link>
      </p>
    </div>
  );
}
