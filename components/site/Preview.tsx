"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { PREVIEWS } from "./previews";
import { cn } from "@/lib/utils";

/** Palco do componente: monta de novo a cada Replay para a animação recomeçar do zero. */
export function Preview({ slug, replayLabel, className }: { slug: string; replayLabel: string; className?: string }) {
  const [run, setRun] = useState(0);
  const Component = PREVIEWS[slug];
  return (
    // No celular o conteúdo começa abaixo do Replay, para o botão não cobrir o componente.
    <div
      className={cn(
        "relative flex min-h-[560px] items-center justify-center overflow-hidden rounded-xl border border-edge bg-shelf px-4 pt-14 pb-6 sm:p-6",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setRun((n) => n + 1)}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-md border border-edge bg-ink/70 px-2.5 py-1.5 font-mono text-xs text-muted transition-colors hover:text-text"
      >
        <ArrowCounterClockwise size={14} />
        {replayLabel}
      </button>
      <FitWidth>{Component ? <Component key={run} /> : null}</FitWidth>
    </div>
  );
}

/** Encolhe o componente só quando ele é mais largo que o palco (ex.: o celular de 290px numa tela de 360px). */
function FitWidth({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ s: number; h?: number }>({ s: 1 });

  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const child = i.firstElementChild as HTMLElement | null;
      if (!child) return;
      const need = child.offsetWidth;
      const avail = o.clientWidth;
      const s = need > avail ? avail / need : 1;
      setFit({ s, h: s < 1 ? child.offsetHeight * s : undefined });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="flex w-full justify-center" style={{ height: fit.h }}>
      <div
        ref={inner}
        className="flex w-full justify-center"
        style={fit.s < 1 ? { transform: `scale(${fit.s})`, transformOrigin: "top center" } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
