"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Device } from "./devices/Device";
import { BOX, type DeviceKind } from "./devices/screens";

// Vitrine do mock escolhido. No desktop: três colunas de museu de alturas diferentes, com os topos quase
// alinhados (a base mais alta fica sob o item mais baixo, e a do meio fica um pouco acima das outras).
// No celular: os três em cards compactos com a etiqueta embaixo, os dois celulares lado a lado e o
// mapa na largura toda. Um só conjunto de componentes ao vivo serve aos dois layouts.
// Cada componente aparece dentro de um aparelho (celular ou notebook em 3D, com moldura CSS de reserva).
// scale: escala máxima do aparelho (a do desktop). base: altura do fuste da coluna.
// plinth: largura da coluna em relação à caixa do aparelho. sink: quanto a caixa desce sobre o tampo da
// coluna, para o notebook assentar (a caixa dele tem margem embaixo para o giro com o mouse).
const SHOWCASE: {
  slug: string;
  name: string;
  stack: string;
  device: DeviceKind;
  side: -1 | 0 | 1;
  scale: number;
  base: number;
  plinth: number;
  sink: number;
  wide: boolean;
}[] = [
  { slug: "chat-flow", name: "Chat Flow", stack: "React · GSAP", device: "phone", side: -1, scale: 0.55, base: 132, plinth: 0.9, sink: 0, wide: false },
  { slug: "map-pin-drop", name: "Map Pin Drop", stack: "React · GSAP", device: "laptop", side: 0, scale: 0.65, base: 162, plinth: 0.8, sink: 12, wide: true },
  { slug: "payment-notification", name: "Payment Notification", stack: "React · GSAP", device: "phone", side: 1, scale: 0.55, base: 142, plinth: 0.9, sink: 0, wide: false },
];

export function Pedestals() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:items-end lg:gap-8">
      {SHOWCASE.map((item) => {
        const box = BOX[item.device];
        const href = `/components/${item.slug}`;
        return (
          <div
            key={item.slug}
            className={`relative flex flex-col rounded-xl border border-edge bg-shelf p-3 lg:items-center lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 ${
              item.wide ? "order-last col-span-2 lg:order-none lg:col-span-1" : ""
            }`}
          >
            <div className="relative z-10 w-full lg:mb-[calc(var(--sink)*-1px)]" style={{ "--sink": item.sink } as CSSProperties}>
              <FitScale width={box.w} height={box.h} max={item.scale}>
                <Device kind={item.device} slug={item.slug} side={item.side} />
              </FitScale>
            </div>

            <Link
              href={href}
              aria-label={item.name}
              className="group relative hidden max-w-full lg:block"
              style={{ width: Math.max(box.w * item.scale * item.plinth, 256) }}
            >
              <PedestalBlock base={item.base} name={item.name} stack={item.stack} interactive />
            </Link>

            {/* Etiqueta do card no celular; o link cobre o card inteiro. */}
            <Link href={href} className="mt-3 flex flex-col gap-0.5 after:absolute after:inset-0 after:rounded-xl lg:hidden">
              <span className="text-sm font-semibold text-text">{item.name}</span>
              <span className="font-mono text-xs text-muted">{item.stack}</span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

/** Escala o componente para caber na largura disponível, sem passar da escala máxima. */
function FitScale({ width, height, max, children }: { width: number; height: number; max: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(max);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(Math.min(max, entry.contentRect.width / width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, max]);

  return (
    <div ref={ref} className="w-full overflow-hidden">
      <div className="relative mx-auto" style={{ width: width * scale, height: height * scale }}>
        <div className="absolute top-0 left-0" style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Metal escuro escovado: faixas finas verticais sobre um degradê, para o fuste e os degraus.
const BRUSHED =
  "repeating-linear-gradient(90deg, rgb(255 255 255 / 0.018) 0 1px, transparent 1px 3px), linear-gradient(90deg, #0d111d 0%, #1a2033 22%, #232a40 50%, #1a2033 78%, #0d111d 100%)";

/**
 * Coluna de museu: tampo em perspectiva com a borda da frente acesa em LED, fuste de metal escuro com
 * luz vinda de cima, placa de metal com o nome e a stack (presa por quatro parafusos), base em dois
 * degraus e sombra no chão. Serve aos pedestais do hero e à coluna grande da vitrine.
 */
export function PedestalBlock({
  base,
  name,
  stack,
  interactive = false,
  large = false,
  children,
}: {
  base: number | string;
  name?: string;
  stack?: string;
  interactive?: boolean;
  /** Placa maior, para a coluna alta da vitrine. */
  large?: boolean;
  children?: ReactNode;
}) {
  // Classe escrita por inteiro: o Tailwind só gera o que encontra literalmente no código.
  const hover = interactive ? "group-hover:text-white" : "";
  return (
    <div className="relative" style={{ "--base": typeof base === "number" ? `${base}px` : base } as CSSProperties}>
      {/* Tampo: trapézio (o fundo é mais estreito que a frente) e a borda da frente acesa. */}
      <div
        className="h-[14px] bg-gradient-to-b from-[#1b2240] to-[#343f6e]"
        style={{ clipPath: "polygon(3% 0, 97% 0, 100% 100%, 0 100%)" }}
      />
      <div
        className={`h-[2px] bg-led shadow-[0_0_14px_2px_rgb(31_91_255/0.55)] transition-[background-color,box-shadow] duration-500 ease-out-expo motion-reduce:transition-none ${
          interactive ? "group-hover:bg-led-soft group-hover:shadow-[0_0_22px_4px_rgb(91_134_255/0.7)]" : ""
        }`}
      />
      {/* Capitel: a laje logo abaixo do tampo, um pouco mais estreita, com sombra embaixo. */}
      <div className="mx-[1.5%] h-[10px] border-x border-[#2c3552]" style={{ background: "linear-gradient(to bottom, #20273d, #121726)" }} />
      <div className="mx-[1.5%] h-[6px] bg-gradient-to-b from-black/70 to-transparent" />

      {/* Fuste: mais estreito que o capitel, com luz vinda de cima e quinas com filete de luz. */}
      <div className="relative mx-[7%] -mt-[6px] h-[var(--base)] overflow-hidden" style={{ background: BRUSHED }}>
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-2/3"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgb(91 134 255 / 0.16), transparent 72%)" }}
        />
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-led-soft/45 via-white/8 to-white/4" />
        <span aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-led-soft/45 via-white/8 to-white/4" />
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-black/50 to-transparent" />

        {name ? (
          <div className="absolute inset-x-0 top-[22%] flex justify-center px-3">
            {/* Placa de metal com o nome, presa por quatro parafusos. */}
            <div
              className={`relative max-w-full rounded-[3px] border border-[#4a5574] text-center ${large ? "px-8 py-4" : "px-5 py-2.5"} shadow-[0_1px_0_rgb(255_255_255/0.08)_inset,0_6px_14px_rgb(0_0_0/0.55)]`}
              style={{ background: "linear-gradient(180deg, #3a4360 0%, #262d44 55%, #1d2336 100%)" }}
            >
              {[
                "top-1 left-1",
                "top-1 right-1",
                "bottom-1 left-1",
                "bottom-1 right-1",
              ].map((spot) => (
                <span key={spot} aria-hidden="true" className={`absolute ${spot} h-[3px] w-[3px] rounded-full bg-[#7d88a8] shadow-[0_0_0_0.5px_#151a28]`} />
              ))}
              <p className={`truncate font-semibold ${large ? "text-lg" : "text-[13px]"} tracking-wide text-[#e6ebff] transition-colors duration-500 ${hover}`}>{name}</p>
              {stack ? <p className={`mt-0.5 font-mono tracking-[0.08em] text-[#a3adc8] ${large ? "text-xs" : "text-[10px]"}`}>{stack}</p> : null}
            </div>
          </div>
        ) : null}
        {children}
      </div>

      {/* Base em dois degraus, mais larga que o fuste. */}
      <div className="mx-[3%] h-[9px] border-t border-white/10" style={{ background: BRUSHED }} />
      <div className="h-[11px] border-t border-white/10" style={{ background: "linear-gradient(90deg, #0b0e18, #171c2d 50%, #0b0e18)" }} />
      {/* Sombra no chão. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-5 left-1/2 h-6 w-[115%] -translate-x-1/2"
        style={{ background: "radial-gradient(ellipse 50% 50% at 50% 30%, rgb(31 91 255 / 0.14), rgb(0 0 0 / 0.6) 45%, transparent 75%)" }}
      />
    </div>
  );
}
