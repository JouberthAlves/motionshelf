"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type MapPinDropProps = {
  /** Name shown on the address card. */
  title?: string;
  /** Address shown under the name. */
  address?: string;
  /** Button label on the card. */
  action?: string;
  /** Color of the pin, the ring and the button. */
  accent?: string;
  /** Replay forever with a pause between runs. */
  loop?: boolean;
  className?: string;
};

// Quarteirões e ruas em porcentagem, só para dar cara de mapa. Não é um mapa real.
const BLOCKS = [
  { l: 6, t: 8, w: 26, h: 30 },
  { l: 38, t: 6, w: 22, h: 26 },
  { l: 66, t: 10, w: 28, h: 22 },
  { l: 8, t: 46, w: 20, h: 20 },
  { l: 62, t: 40, w: 30, h: 24 },
];
const ROADS = ["left-0 right-0 top-[36%] h-2.5", "top-0 bottom-0 left-[33%] w-[9px]", "top-0 bottom-0 left-[61%] w-[9px] -skew-x-8"];

export default function MapPinDrop({
  title = "Headquarters",
  address = "123 Example Street",
  action = "Open in maps",
  accent = "#1f5bff",
  loop = true,
  className = "",
}: MapPinDropProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const pin = q("[data-pin]")[0];
      const shadow = q("[data-shadow]")[0];
      const ring = q("[data-ring]")[0];
      const card = q("[data-card]")[0];
      const btn = q("[data-btn]")[0];

      const tl = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 1.4 });
      tl.set(pin, { y: -160, autoAlpha: 1 })
        .set(shadow, { scale: 0.2, autoAlpha: 0 })
        .set(ring, { scale: 0.3, autoAlpha: 0 })
        .set(card, { y: 90, autoAlpha: 0 })
        .to(pin, { y: 0, duration: 0.55, ease: "bounce.out" }, 0.4)
        .to(shadow, { scale: 1, autoAlpha: 1, duration: 0.55, ease: "bounce.out" }, 0.4)
        .fromTo(ring, { scale: 0.3, autoAlpha: 0.9 }, { scale: 1.8, autoAlpha: 0, duration: 1.1, ease: "power2.out", repeat: 1 }, 0.95)
        .to(card, { y: 0, autoAlpha: 1, duration: 0.5, ease: "back.out(1.4)" }, 1.4)
        .to(btn, { scale: 0.94, duration: 0.12, yoyo: true, repeat: 1 }, 2.6)
        .to({}, { duration: 1.4 });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1).pause();
    },
    { scope: root, dependencies: [loop] },
  );

  return (
    <div
      ref={root}
      className={`relative h-[290px] w-full max-w-[520px] overflow-hidden rounded-xl bg-[#dfe7e3] ${className}`}
    >
      {BLOCKS.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-[3px] bg-[#eef3f0]"
          style={{ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%` }}
        />
      ))}
      {ROADS.map((road, i) => (
        <div key={i} className={`absolute bg-white ${road}`} />
      ))}
      <div className="absolute -inset-x-5 -bottom-8 h-[90px] -rotate-6 bg-[#bcd3d6]" />

      {/* O ponto de pouso fica em top 44%. O posicionamento mora nos invólucros: o GSAP anima só o
          elemento de dentro, porque o transform dele substitui o translate do próprio elemento. */}
      <div className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div data-ring className="h-20 w-20 rounded-full border-2" style={{ borderColor: accent }} />
      </div>
      <div className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div data-shadow className="h-[7px] w-[22px] rounded-full bg-black/25" />
      </div>
      <div className="absolute top-[calc(44%+2px)] left-1/2 -translate-x-1/2 -translate-y-full">
        <div data-pin className="h-[52px] w-10">
          <svg viewBox="0 0 40 52" className="block h-[52px] w-10" aria-hidden="true">
            <path d="M20 51C20 51 3 31 3 19a17 17 0 0 1 34 0c0 12-17 32-17 32z" fill={accent} />
            <circle cx="20" cy="19" r="6.5" fill="#ffffff" />
          </svg>
        </div>
      </div>

      <div
        data-card
        className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-lg bg-white p-3 text-neutral-900 shadow-lg"
      >
        <div className="min-w-0">
          <b className="block text-sm">{title}</b>
          <small className="block truncate text-xs text-neutral-600">{address}</small>
        </div>
        <span
          data-btn
          className="shrink-0 rounded px-2.5 py-2 text-xs font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {action}
        </span>
      </div>
    </div>
  );
}
