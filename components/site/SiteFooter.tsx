import { useTranslations } from "next-intl";
import { Logo } from "./Logo";
import { FooterWordmark } from "./FooterWordmark";

export function SiteFooter() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-edge/70 bg-ink">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-muted sm:px-6 md:flex-row md:items-center md:justify-between">
        <Logo />
        <div className="flex max-w-xl flex-col gap-1 md:text-right">
          <p>{t("license")}</p>
          <p>
            {t("credits")}{" "}
            <a href="https://reactbits.dev" target="_blank" rel="noreferrer" className="underline decoration-edge underline-offset-4 hover:text-text">
              reactbits.dev
            </a>
          </p>
          <p>{t("made")}</p>
        </div>
      </div>
      <FooterWordmark />
    </footer>
  );
}
