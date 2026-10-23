"use client";

import { useEffect, useRef, useState } from "react";
import { PREVIEWS } from "./previews";

// Largura natural de cada componente na miniatura (os de largura fluida ganham um palco fixo).
export const STAGE: Record<string, number> = {
  "title-reveal": 440,
  // Largo o bastante para "Build your next landing page" caber numa linha só.
  "rotating-word": 700,
  "before-after-text": 380,
  "chat-flow": 290,
  "question-typer": 480,
  "appointment-reminder": 290,
  "payment-notification": 290,
  "search-ad": 480,
  "add-to-cart": 480,
  "plan-toggle": 520,
  "offer-countdown": 480,
  "review-card": 380,
  "map-pin-drop": 520,
  "order-tracker": 380,
  "slot-booking": 520,
  "sales-funnel": 600,
  "roi-balance": 600,
  "page-speed-gauge": 600,
  "drone-button": 520,
  "claw-button": 520,
  "rocket-button": 520,
  "ufo-button": 520,
  "magnet-button": 520,
  "letters-button": 520,
};

/**
 * Miniatura ao vivo: o componente só monta quando o card chega perto da tela e é escalado para caber
 * inteiro na caixa, centralizado.
 */
export function Thumb({ slug }: { slug: string }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [fit, setFit] = useState({ s: 0, x: 0, y: 0 });
  const Component = PREVIEWS[slug];
  const stage = STAGE[slug] ?? 480;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
      const s = Math.min((bw * 0.86) / iw, (bh * 0.86) / ih, 1);
      setFit({ s, x: (bw - iw * s) / 2, y: (bh - ih * s) / 2 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(b);
    ro.observe(i);
    return () => ro.disconnect();
  }, [show]);

  return (
    <div ref={box} className="relative h-44 overflow-hidden rounded-xl bg-[#0c0d10] sm:h-52">
      <div
        ref={inner}
        aria-hidden="true"
        className="absolute top-0 left-0 flex justify-center transition-opacity duration-300"
        style={{
          width: stage,
          transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.s})`,
          transformOrigin: "top left",
          opacity: fit.s ? 1 : 0,
        }}
      >
        {show && Component ? <Component /> : <div className="h-[200px] w-full" />}
      </div>
    </div>
  );
}
