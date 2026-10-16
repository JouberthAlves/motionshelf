"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { hasGpu } from "@/lib/gpu";

// Fica guardado na sessão: quem fechou a faixa não vê de novo até abrir outra aba.
const KEY = "motionshelf-notice-seen";

type Kind = "mobile" | "motion" | "gpu";

/**
 * Faixa discreta na base da home para quem não vê os modelos 3D: celular (a vitrine usa só a moldura CSS),
 * movimento reduzido ligado (as animações ficam no último quadro) e computador sem GPU de verdade. Não
 * cobre a página nem trava a rolagem; quem quiser fecha o "×".
 */
export function PerformanceNotice() {
  const t = useTranslations("notice");
  const [kind, setKind] = useState<Kind | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      // Sem sessionStorage (navegador bloqueado): a faixa aparece de novo a cada visita.
    }
    const mobile = window.matchMedia("(max-width: 1023px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (mobile) setKind("mobile");
    else if (reduced) setKind("motion");
    else if (!hasGpu()) setKind("gpu");
  }, []);

  if (!kind) return null;

  const close = () => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      // Sem sessionStorage, a faixa só some nesta página.
    }
    setKind(null);
  };

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-4 border-t border-edge bg-shelf/95 px-4 py-3 backdrop-blur-sm"
    >
      <p className="max-w-3xl text-center text-[13px] leading-snug text-text/85">
        {kind === "mobile" ? t("mobile") : kind === "motion" ? t("motion") : t("gpu")}
      </p>
      <button
        type="button"
        onClick={close}
        aria-label={t("dismiss")}
        className="shrink-0 rounded-md px-2.5 py-1 text-lg leading-none text-muted transition-colors hover:text-text"
      >
        ×
      </button>
    </div>
  );
}
