"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function LocaleSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <nav aria-label={t("language")} className="flex items-center gap-1 font-mono text-[11px]">
      {(["en", "pt"] as const).map((code, i) => (
        <span key={code} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted">/</span>}
          <Link
            href={pathname}
            locale={code}
            aria-current={code === locale ? "true" : undefined}
            className={cn("uppercase transition-colors hover:text-text", code === locale ? "text-led-soft" : "text-muted")}
          >
            {code}
          </Link>
        </span>
      ))}
    </nav>
  );
}
