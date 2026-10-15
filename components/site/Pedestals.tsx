"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Device } from "./devices/Device";
import { BOX, type DeviceKind } from "./devices/screens";

// Vitrine do mock escolhido. No desktop: três pedestais de alturas diferentes, com os topos quase
// alinhados (a base mais alta fica sob o item mais baixo, e o do meio fica um pouco acima dos outros).
// No celular: os três em cards compactos com a etiqueta embaixo, os dois celulares lado a lado e o
// mapa na largura toda. Um só conjunto de componentes ao vivo serve aos dois layouts.
// Cada componente aparece dentro de um aparelho (celular ou notebook em 3D, com moldura CSS de reserva).
// scale: escala máxima do aparelho (a do desktop). base: altura da frente do pedestal.
const SHOWCASE: { slug: string; name: string; code: string; device: DeviceKind; side: -1 | 0 | 1; scale: number; base: number; wide: boolean }[] = [
  { slug: "chat-flow", name: "Chat Flow", code: "MSG-01", device: "phone", side: -1, scale: 0.55, base: 120, wide: false },
  { slug: "map-pin-drop", name: "Map Pin Drop", code: "MAP-01", device: "laptop", side: 0, scale: 0.6, base: 190, wide: true },
  { slug: "payment-notification", name: "Payment Notification", code: "PAY-01", device: "phone", side: 1, scale: 0.55, base: 130, wide: false },
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
            <FitScale width={box.w} height={box.h} max={item.scale}>
              <Device kind={item.device} slug={item.slug} side={item.side} />
            </FitScale>

            <Pedestal href={href} name={item.name} code={item.code} width={box.w * item.scale * (item.device === "phone" ? 0.9 : 0.95)} base={item.base} />

            {/* Etiqueta do card no celular; o link cobre o card inteiro. */}
            <Link href={href} className="mt-3 flex flex-col gap-0.5 after:absolute after:inset-0 after:rounded-xl lg:hidden">
              <span className="font-mono text-xs text-muted">
                {item.code}
                {/* No card estreito do celular cabe só o código. */}
                <span className={item.wide ? "" : "hidden sm:inline"}> · React · GSAP</span>
              </span>
              <span className="text-sm font-semibold text-text">{item.name}</span>
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

/**
 * Pedestal com luz vinda de cima: tampo em perspectiva com a borda da frente acesa em LED, faixa de
 * sombra logo abaixo do tampo, frente azul-marinho que escurece até sumir no preto e filetes de luz
 * nas quinas. A etiqueta de spec fica na frente, como a placa de um produto. Só no desktop.
 */
function Pedestal({ href, name, code, width, base }: { href: string; name: string; code: string; width: number; base: number }) {
  return (
    <Link
      href={href}
      aria-label={`${name}, ${code}`}
      className="group relative hidden max-w-full lg:block"
      style={{ width: Math.max(width, 256) }}
    >
      <PedestalBlock base={base}>
        <p className="pt-6 text-center font-mono text-[13px] tracking-wide text-[#c3cbe6]/85 transition-colors group-hover:text-text">
          {code} · React · GSAP
        </p>
      </PedestalBlock>
    </Link>
  );
}

/** O corpo do pedestal (tampo aceso e frente que some no preto), sem link: serve à vitrine fixa também. */
export function PedestalBlock({ base, children }: { base: number | string; children?: ReactNode }) {
  return (
    <div style={{ "--base": typeof base === "number" ? `${base}px` : base } as CSSProperties}>
      {/* Tampo: trapézio (o fundo é mais estreito que a frente) e a borda da frente acesa. */}
      <div
        className="h-4 bg-gradient-to-b from-[#171d35] to-[#2f3a66]"
        style={{ clipPath: "polygon(3% 0, 97% 0, 100% 100%, 0 100%)" }}
      />
      <div className="h-[2px] bg-led shadow-[0_0_14px_2px_rgb(31_91_255/0.55)] transition-colors group-hover:bg-led-soft" />

      {/* Frente: um pouco mais estreita que o tampo, que avança sobre ela. */}
      <div
        className="relative mx-[2%] h-[var(--base)] overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 0%, rgb(70 100 220 / 0.2), transparent 70%), linear-gradient(to bottom, #151a2c 0%, #0c0f1a 55%, #000 100%)",
        }}
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-black/60 to-transparent" />
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-led-soft/40 via-white/5 to-transparent" />
        <span aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-led-soft/40 via-white/5 to-transparent" />
        {children}
      </div>
    </div>
  );
}
