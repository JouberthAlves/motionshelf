"use client";

import type { CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import { PREVIEWS } from "./previews";

// Vitrine do mock escolhido: três pedestais de alturas diferentes, com os topos quase alinhados
// (a base mais alta fica sob o item mais baixo, e o do meio fica um pouco acima dos outros).
// width/height: tamanho natural do componente; a caixa usa o tamanho já escalado, para não estourar a tela.
// base: altura da frente do pedestal no desktop (no celular a base é única e mais curta).
const SHOWCASE = [
  { slug: "chat-flow", name: "Chat Flow", code: "MSG-01", scale: 0.6, width: 290, height: 520, base: 120 },
  { slug: "map-pin-drop", name: "Map Pin Drop", code: "MAP-01", scale: 0.68, width: 520, height: 290, base: 255 },
  { slug: "pix-notification", name: "Pix Notification", code: "PAY-01", scale: 0.6, width: 290, height: 520, base: 130 },
];

export function Pedestals() {
  return (
    <div className="grid items-end gap-12 lg:grid-cols-3 lg:gap-8">
      {SHOWCASE.map((item, i) => {
        const Component = PREVIEWS[item.slug];
        const w = item.width * item.scale;
        return (
          <div key={item.slug} className={`flex-col items-center ${i === 2 ? "flex" : "hidden lg:flex"}`}>
            <div className="relative max-w-full" style={{ width: w, height: item.height * item.scale }}>
              <div
                className="absolute bottom-0 left-0"
                style={{ width: item.width, transform: `scale(${item.scale})`, transformOrigin: "bottom left" }}
              >
                {Component ? <Component /> : null}
              </div>
            </div>
            <Pedestal href={`/components/${item.slug}`} name={item.name} code={item.code} width={w + 56} base={item.base} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Pedestal com luz vinda de cima: tampo em perspectiva com a borda da frente acesa em LED, faixa de
 * sombra logo abaixo do tampo, frente azul-marinho que escurece até sumir no preto e filetes de luz
 * nas quinas. A etiqueta de spec fica na frente, como a placa de um produto.
 */
function Pedestal({ href, name, code, width, base }: { href: string; name: string; code: string; width: number; base: number }) {
  return (
    <Link
      href={href}
      aria-label={`${name}, ${code}`}
      className="group relative block max-w-full"
      style={{ width: Math.max(width, 256), "--base": `${base}px` } as CSSProperties}
    >
      {/* Tampo: trapézio (o fundo é mais estreito que a frente) e a borda da frente acesa. */}
      <div
        className="h-4 bg-gradient-to-b from-[#171d35] to-[#2f3a66]"
        style={{ clipPath: "polygon(3% 0, 97% 0, 100% 100%, 0 100%)" }}
      />
      <div className="h-[2px] bg-led shadow-[0_0_14px_2px_rgb(31_91_255/0.55)] transition-colors group-hover:bg-led-soft" />

      {/* Frente: um pouco mais estreita que o tampo, que avança sobre ela. */}
      <div
        className="relative mx-[2%] h-[72px] overflow-hidden lg:h-[var(--base)]"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 0%, rgb(70 100 220 / 0.2), transparent 70%), linear-gradient(to bottom, #151a2c 0%, #0c0f1a 55%, #000 100%)",
        }}
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-black/60 to-transparent" />
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-led-soft/40 via-white/5 to-transparent" />
        <span aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-led-soft/40 via-white/5 to-transparent" />
        <p className="pt-6 text-center font-mono text-[13px] tracking-wide text-[#c3cbe6]/85 transition-colors group-hover:text-text">
          {code} · React · GSAP
        </p>
      </div>
    </Link>
  );
}
