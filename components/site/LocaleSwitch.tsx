"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function LocaleSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <nav aria-label={t("language")} className="flex items-center font-mono text-xs">
      {(["en", "pt"] as const).map((code, i) => (
        <span key={code} className="flex items-center">
          {i > 0 && <span className="text-text/50">/</span>}
          <Link
            href={pathname}
            locale={code}
            aria-current={code === locale ? "true" : undefined}
            className={cn("px-1.5 py-2 uppercase transition-colors hover:text-text", code === locale ? "text-led-soft" : "text-text/80")}
          >
            {code}
          </Link>
        </span>
      ))}
    </nav>
  );
}
