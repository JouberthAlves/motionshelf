"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { hasGpu } from "@/lib/gpu";

// Fica guardado na sessão: quem fechou o aviso não vê de novo até abrir outra aba.
const KEY = "motionshelf-notice-seen";
// Tempo até o botão aparecer, para a pessoa ler antes de poder fechar.
const BUTTON_DELAY = 2000;

type Kind = "mobile" | "gpu";

/**
 * Aviso de tela cheia na home para quem não vê os modelos 3D: celular (a vitrine usa só a moldura CSS) e
 * computador sem GPU de verdade. Escurece a página, mostra o texto e, depois de 2 s, o botão aparece.
 * Quem tem movimento reduzido fica de fora: não é desempenho, e o 3D também não aparece para essa pessoa.
 */
export function PerformanceNotice() {
  const t = useTranslations("notice");
  const [kind, setKind] = useState<Kind | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      // Sem sessionStorage (navegador bloqueado): o aviso aparece de novo a cada visita.
    }
    const mobile = window.matchMedia("(max-width: 1023px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (mobile) setKind("mobile");
    else if (!reduced && !hasGpu()) setKind("gpu");
  }, []);

  useEffect(() => {
    if (!kind) return;
    document.body.style.overflow = "hidden";
    const id = window.setTimeout(() => setReady(true), BUTTON_DELAY);
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = "";
    };
  }, [kind]);

  if (!kind) return null;

  const close = () => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      // Sem sessionStorage, o aviso só some nesta página.
    }
    setKind(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="performance-notice-text"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-6"
    >
      <div className="max-w-lg text-center">
        <p id="performance-notice-text" className="text-lg leading-relaxed text-text">
          {kind === "mobile" ? t("mobile") : t("gpu")}
        </p>
        <button
          type="button"
          onClick={close}
          disabled={!ready}
          autoFocus={ready}
          className={`mt-8 rounded-md bg-led px-6 py-3 text-sm font-semibold text-white transition-opacity duration-700 hover:bg-led-soft ${
            ready ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {t("button")}
        </button>
      </div>
    </div>
  );
}
