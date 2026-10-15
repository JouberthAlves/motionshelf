"use client";

import { PREVIEWS } from "./previews";

// Três pedestais de alturas diferentes, cada um com um componente ao vivo e a etiqueta de spec.
// width: largura natural do componente, para o pedestal ter caixa definida antes da escala.
const SHOWCASE = [
  { slug: "pix-notification", code: "PAY-01", scale: 0.6, width: 290 },
  { slug: "chat-flow", code: "MSG-01", scale: 0.6, width: 290 },
  { slug: "map-pin-drop", code: "MAP-01", scale: 0.56, width: 520 },
];

export function Pedestals() {
  return (
    <div className="grid items-end gap-10 pt-6 md:grid-cols-3">
      {SHOWCASE.map((item) => {
        const Component = PREVIEWS[item.slug];
        return (
          <div key={item.slug} className="flex flex-col items-center">
            <div className="flex h-[330px] items-end justify-center">
              <div style={{ width: item.width, transform: `scale(${item.scale})`, transformOrigin: "bottom center" }}>
                {Component ? <Component /> : null}
              </div>
            </div>
            <div className="relative h-14 w-[78%] rounded-t-md border border-b-0 border-edge bg-shelf-2">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-led" />
            </div>
            <p className="mt-3 font-mono text-[11px] text-muted">{item.code} · React · GSAP</p>
          </div>
        );
      })}
    </div>
  );
}
