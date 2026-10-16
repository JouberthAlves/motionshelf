import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CopyCommand } from "@/components/site/CopyCommand";
import type { Locale } from "@/lib/catalog";
import { SKILLS } from "@/lib/prompts";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "agents" });
  return pageMetadata({ locale: locale as Locale, path: "/docs/agents", title: t("metaTitle"), description: t("metaDescription") });
}

export default async function AgentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("agents");
  const c = await getTranslations("component");
  const labels = { copy: c("copy"), copied: c("copied") };

  const skills = [
    { key: "gsap", name: t("gsapName"), forWhat: t("gsapFor"), text: t("gsapText"), repo: SKILLS.gsap.repo, license: "MIT" },
    { key: "anatomy", name: t("anatomyName"), forWhat: t("anatomyFor"), text: t("anatomyText"), repo: SKILLS.anatomy.repo, license: "MIT" },
    { key: "hf", name: t("hfName"), forWhat: t("hfFor"), text: t("hfText"), repo: SKILLS.hyperframes.repo, license: "Apache-2.0" },
  ];

  return (
    <div className="@container mx-auto max-w-3xl px-4 pt-16 pb-24 sm:px-6">
      <p className="font-mono text-xs text-led-soft">Docs</p>
      <h1 className="display-wide mt-2 text-[clamp(1.75rem,9cqi,3rem)] text-text">{t("title")}</h1>
      <p className="mt-4 text-muted">{t("intro")}</p>

      <h2 className="display-wide mt-12 text-xl text-text">{t("whatTitle")}</h2>
      <p className="mt-3 text-muted">{t("whatText")}</p>

      <h2 className="display-wide mt-12 text-xl text-text">{t("usedTitle")}</h2>
      <div className="mt-4 space-y-3">
        {skills.map((s) => (
          <div key={s.key} className="rounded-xl border border-edge bg-shelf p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-text">{s.name}</h3>
              <span className="font-mono text-xs text-muted">{s.license}</span>
            </div>
            <p className="mt-1 text-sm text-led-soft">{s.forWhat}</p>
            <p className="mt-2 text-sm text-muted">{s.text}</p>
            <a href={s.repo} target="_blank" rel="noreferrer" className="mt-3 inline-block break-all font-mono text-xs text-muted transition-colors hover:text-text">
              {t("repo")}: {s.repo.replace("https://", "")}
            </a>
          </div>
        ))}
      </div>

      <h2 className="display-wide mt-12 text-xl text-text">{t("claudeTitle")}</h2>
      <p className="mt-3 text-muted">{t("claudeText")}</p>
      <div className="mt-3 space-y-2">
        <CopyCommand command={SKILLS.gsap.claude} label={labels} />
        <CopyCommand command={SKILLS.anatomy.claude} label={labels} />
        {SKILLS.hyperframes.claude.map((cmd) => (
          <CopyCommand key={cmd} command={cmd} label={labels} />
        ))}
      </div>

      <h2 className="display-wide mt-12 text-xl text-text">{t("otherTitle")}</h2>
      <p className="mt-3 text-muted">{t("otherText")}</p>
      <div className="mt-3 space-y-2">
        <CopyCommand command={SKILLS.gsap.other} label={labels} />
        <CopyCommand command={SKILLS.anatomy.other} label={labels} />
        <CopyCommand command={SKILLS.hyperframes.other} label={labels} />
      </div>

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
