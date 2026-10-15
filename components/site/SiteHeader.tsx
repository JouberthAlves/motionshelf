import { useTranslations } from "next-intl";
import { GithubLogo } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";
import { LocaleSwitch } from "./LocaleSwitch";
import { SearchButton } from "./SearchButton";

export const GITHUB_URL = "https://github.com/JouberthAlves/motionshelf";

export function SiteHeader() {
  const t = useTranslations("nav");
  return (
    <header className="sticky top-0 z-40 border-b border-edge/70 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Motionshelf" className="shrink-0">
          <Logo />
        </Link>
        <nav className="ml-auto hidden items-center gap-6 text-sm text-muted md:flex">
          <Link href="/components" className="transition-colors hover:text-text">
            {t("components")}
          </Link>
          <Link href="/docs/installation" className="transition-colors hover:text-text">
            {t("docs")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4 md:ml-0">
          <SearchButton label={t("search")} />
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label={t("github")} className="text-muted transition-colors hover:text-text">
            <GithubLogo size={20} weight="regular" />
          </a>
          <LocaleSwitch />
        </div>
      </div>
    </header>
  );
}
