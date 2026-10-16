"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Check, Copy } from "@phosphor-icons/react";
import { PedestalBlock } from "./Pedestals";
import { PREVIEWS } from "./previews";
import { STAGE } from "./Thumb";

export type VitrineItem = {
  slug: string;
  name: string;
  stack: string;
  category: string;
  categoryName: string;
  summary: string;
  command: string;
};

type Labels = { eyebrow: string; title: string; open: string; copyInstall: string; copiedInstall: string; prompt: string };

// Quanto de rolagem cada componente ocupa na vitrine fixa (em altura de tela).
const STEP_VH = 70;

// Altura da caixa de cada componente no celular: celulares altos, textos baixos.
const MOBILE_H: Record<string, number> = {
  "title-reveal": 200,
  "rotating-word": 160,
  "before-after-text": 210,
  "question-typer": 220,
  "chat-flow": 380,
  "appointment-reminder": 380,
  "payment-notification": 380,
  "search-ad": 280,
  "map-pin-drop": 230,
  "slot-booking": 260,
  "sales-funnel": 270,
  "roi-balance": 270,
  "page-speed-gauge": 250,
};

/**
 * Vitrine fixa da home. No desktop, um pedestal grande fica parado enquanto a página rola e o
 * componente em cima dele troca um por vez; a lista ao lado acende o atual. No celular, um card por
 * componente, montado só quando aparece na tela.
 */
export function Vitrine({ items, labels }: { items: VitrineItem[]; labels: Labels }) {
  return (
    <>
      <PinnedVitrine items={items} labels={labels} />
      <StackedVitrine items={items} labels={labels} />
    </>
  );
}

function PinnedVitrine({ items, labels }: { items: VitrineItem[]; labels: Labels }) {
  const section = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const n = items.length;

  // Índice ativo a partir do quanto a seção já rolou.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = section.current;
      if (!el || el.offsetParent === null) return;
      const total = el.offsetHeight - window.innerHeight;
      const progress = Math.min(Math.max(-el.getBoundingClientRect().top / Math.max(total, 1), 0), 0.9999);
      setActive(Math.floor(progress * n));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [n]);

  // Mantém o item ativo visível na lista quando ela não cabe na tela (rola só a lista, nunca a página).
  useEffect(() => {
    const box = list.current;
    const el = box?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!box || !el) return;
    const top = el.offsetTop;
    if (top < box.scrollTop) box.scrollTop = top;
    else if (top + el.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top + el.offsetHeight - box.clientHeight;
  }, [active]);

  // O componente ao vivo só monta no desktop (no celular esta seção fica escondida).
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const go = useCallback(
    (i: number) => {
      const el = section.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const top = el.getBoundingClientRect().top + window.scrollY + ((i + 0.5) / n) * total;
      window.scrollTo({ top, behavior: "smooth" });
    },
    [n],
  );

  const item = items[active];
  let lastCategory = "";

  return (
    <section ref={section} className="relative hidden lg:block" style={{ height: `calc(${n * STEP_VH}vh + 100vh)` }}>
      <div className="sticky top-16 mx-auto grid h-[calc(100vh-4rem)] max-w-7xl grid-cols-[340px_minmax(0,1fr)] gap-12 px-6 py-10">
        <div className="flex min-h-0 flex-col">
          <p className="font-mono text-xs tracking-[0.12em] text-led-soft uppercase">
            {labels.eyebrow} · {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </p>
          <h2 className="display-wide mt-2 text-[1.6rem] text-text">{labels.title}</h2>

          <div ref={list} className="relative mt-5 min-h-0 flex-1 overflow-y-auto py-6 pr-2 [mask-image:linear-gradient(to_bottom,transparent,#000_24px,#000_calc(100%-24px),transparent)] [scrollbar-width:none]">
            {items.map((it, i) => {
              const header = it.category !== lastCategory;
              lastCategory = it.category;
              const on = i === active;
              return (
                <div key={it.slug} data-index={i}>
                  {header && (
                    <p className={cn("mb-1 font-mono text-xs tracking-[0.12em] text-muted uppercase", i > 0 && "mt-4")}>{it.categoryName}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md py-1.5 pl-3 text-left text-sm transition-colors",
                      on ? "text-white" : "text-text/70 hover:text-text",
                    )}
                  >
                    <span className={cn("h-4 w-[2px] rounded-full transition-colors", on ? "bg-led" : "bg-edge")} />
                    {it.name}
                  </button>
                  {on && (
                    <div className="vitrine-in mt-2 mb-3 ml-[22px] space-y-3">
                      <p className="text-sm text-muted">{it.summary}</p>
                      <CopyInstall command={it.command} label={labels.copyInstall} done={labels.copiedInstall} />
                      <div className="flex flex-wrap gap-x-5 gap-y-1">
                        <Link href={`/components/${it.slug}`} className="inline-flex items-center gap-1.5 text-sm text-led-soft hover:text-white">
                          {labels.open} <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                        <Link href={`/components/${it.slug}#prompt`} className="inline-flex items-center gap-1.5 text-sm text-text/80 hover:text-white">
                          {labels.prompt} <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Palco: o componente da vez apoiado em cima da coluna grande. */}
        <StageWithColumn item={item} desktop={desktop} />
      </div>
    </section>
  );
}

// Partes fixas da coluna (tampo, LED, capitel e os dois degraus), fora o fuste.
const COLUMN_FIXED = 46;
// Espaço entre o componente e o tampo da coluna.
const COLUMN_GAP = 14;

/**
 * O componente fica apoiado no tampo e a coluna cresce para ocupar o que sobra embaixo: um componente
 * baixo (um título) ganha uma coluna alta, sem o vão preto entre ele e o pedestal.
 */
function StageWithColumn({ item, desktop }: { item: VitrineItem; desktop: boolean }) {
  const col = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [natural, setNaturalState] = useState<{ w: number; h: number } | null>(null);
  const setNatural = useCallback(
    (next: { w: number; h: number }) => setNaturalState((prev) => (prev && prev.w === next.w && prev.h === next.h ? prev : next)),
    [],
  );

  useEffect(() => {
    const el = col.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const minBase = 140;
  const maxBase = size.h * 0.55;
  const room = size.h - COLUMN_FIXED - minBase - COLUMN_GAP;
  const scale = natural ? Math.min(1, (size.w * 0.92) / natural.w, (room * 0.96) / natural.h) : 1;
  const compH = natural ? natural.h * scale : 0;
  const base = Math.round(Math.min(maxBase, Math.max(minBase, size.h - COLUMN_FIXED - compH - COLUMN_GAP)));
  const stageH = Math.max(0, size.h - COLUMN_FIXED - base);

  return (
    <div ref={col} className="relative min-h-0">
      <div className="absolute inset-x-0 top-0" style={{ height: stageH }}>
        {desktop && size.h > 0 && (
          <StageFit key={item.slug} slug={item.slug} align="bottom" gap={COLUMN_GAP} onNatural={setNatural} className="vitrine-in" />
        )}
      </div>
      <div className="absolute bottom-0 left-1/2 w-[min(70%,560px)] -translate-x-1/2">
        <PedestalBlock base={base} name={item.name} stack={item.stack} large />
      </div>
    </div>
  );
}

function StackedVitrine({ items, labels }: { items: VitrineItem[]; labels: Labels }) {
  return (
    <section className="mx-auto max-w-xl px-4 lg:hidden">
      <p className="font-mono text-xs tracking-[0.12em] text-led-soft uppercase">{labels.eyebrow}</p>
      <h2 className="display-wide mt-2 text-[clamp(1.5rem,7vw,2rem)] text-text">{labels.title}</h2>
      <ul className="mt-6 space-y-4">
        {items.map((it) => (
          <li key={it.slug} className="rounded-2xl border border-edge bg-shelf p-3">
            <LazyMount className="relative overflow-hidden rounded-xl bg-[#0c0d10]" height={MOBILE_H[it.slug] ?? 300}>
              <StageFit slug={it.slug} align="center" />
            </LazyMount>
            <div className="px-1.5 pt-3 pb-1">
              <p className="font-mono text-xs tracking-[0.12em] text-muted uppercase">{it.categoryName}</p>
              <p className="mt-0.5 font-semibold text-text">{it.name}</p>
              <p className="mt-1 text-sm text-muted">{it.summary}</p>
              <div className="mt-3 flex flex-wrap gap-x-5">
                <Link href={`/components/${it.slug}`} className="inline-flex items-center gap-1.5 py-1 text-sm text-led-soft">
                  {labels.open} <ArrowRight size={14} aria-hidden="true" />
                </Link>
                <Link href={`/components/${it.slug}#prompt`} className="inline-flex items-center gap-1.5 py-1 text-sm text-text/80">
                  {labels.prompt} <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Botão que copia o comando de instalação inteiro (na coluna estreita da lista o comando não cabe). */
function CopyInstall({ command, label, done }: { command: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Sem permissão de área de transferência: o comando segue na página do componente.
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={command}
      className="inline-flex items-center gap-2 rounded-lg border border-edge bg-shelf px-3 py-2 font-mono text-xs text-text/90 transition-colors hover:border-led/60 hover:text-white"
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {copied ? done : label}
    </button>
  );
}

/** Monta o conteúdo só quando a caixa chega perto da tela. */
function LazyMount({ className, height, children }: { className?: string; height: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ height }}>
      {show ? children : null}
    </div>
  );
}

/** Componente ao vivo escalado para caber na caixa (sem passar do tamanho natural). */
function StageFit({
  slug,
  align,
  gap = 0,
  onNatural,
  className,
}: {
  slug: string;
  align: "bottom" | "center";
  /** Espaço deixado embaixo quando alinhado em baixo. */
  gap?: number;
  /** Avisa o tamanho natural do componente, para quem precisa ajustar o espaço em volta. */
  onNatural?: (size: { w: number; h: number }) => void;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ s: 0, x: 0, y: 0 });
  const Component = PREVIEWS[slug];
  const stage = STAGE[slug] ?? 480;
  const onNaturalRef = useRef(onNatural);
  onNaturalRef.current = onNatural;

  useEffect(() => {
    const b = box.current;
    const i = inner.current;
    if (!b || !i) return;
    const measure = () => {
      const bw = b.clientWidth;
      const bh = b.clientHeight;
      const iw = i.offsetWidth;
      const ih = i.offsetHeight;
      if (!iw || !ih) return;
      onNaturalRef.current?.({ w: iw, h: ih });
      if (!bw || !bh) return;
      const s = Math.min((bw * 0.92) / iw, ((bh - gap) * 0.96) / ih, 1);
      setFit({ s, x: (bw - iw * s) / 2, y: align === "bottom" ? bh - gap - ih * s : (bh - ih * s) / 2 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(b);
    ro.observe(i);
    return () => ro.disconnect();
  }, [align, gap]);

  return (
    <div ref={box} className={cn("absolute inset-0", className)}>
      <div
        ref={inner}
        aria-hidden="true"
        className="absolute top-0 left-0 flex justify-center"
        style={{
          width: stage,
          transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.s})`,
          transformOrigin: "top left",
          opacity: fit.s ? 1 : 0,
        }}
      >
        {Component ? <Component /> : null}
      </div>
    </div>
  );
}
