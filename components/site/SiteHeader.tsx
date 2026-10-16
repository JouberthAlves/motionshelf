import { useTranslations } from "next-intl";
import { GithubLogo } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";
import { LogoAchievement } from "./LogoAchievement";
import { SearchButton } from "./SearchButton";
import { HeaderShell } from "./HeaderShell";

export const GITHUB_URL = "https://github.com/JouberthAlves/motionshelf";

export function SiteHeader() {
  const t = useTranslations("nav");
  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Motionshelf" className="shrink-0">
          <LogoAchievement>
            <Logo />
          </LogoAchievement>
        </Link>
        <nav className="ml-auto hidden items-center gap-6 text-sm text-text/90 md:flex">
          <Link href="/components" className="transition-colors hover:text-white">
            {t("components")}
          </Link>
          <Link href="/docs/installation" className="transition-colors hover:text-white">
            {t("docs")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4 md:ml-0">
          <SearchButton label={t("search")} />
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label={t("github")} className="text-text/90 transition-colors hover:text-white">
            <GithubLogo size={20} weight="regular" />
          </a>
        </div>
      </div>
    </HeaderShell>
  );
}
