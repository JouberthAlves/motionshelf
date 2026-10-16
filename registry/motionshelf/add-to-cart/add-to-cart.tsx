"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type AddToCartProps = {
  /** Store name in the top bar. */
  store?: string;
  /** Product name. */
  product?: string;
  /** Short line under the product name. */
  detail?: string;
  /** Product price. */
  price?: number;
  /** Items already in the cart before the click. */
  items?: number;
  /** Cart total before the click. */
  total?: number;
  /** ISO 4217 currency code. */
  currency?: string;
  /** Locale used to format the prices. */
  locale?: string;
  /** Button text before the click. */
  cta?: string;
  /** Button text after the click. */
  added?: string;
  /** Color of the button, the badge and the product tile. */
  accent?: string;
  /** Replay forever with a pause between runs. */
  loop?: boolean;
  className?: string;
};

export default function AddToCart({
  store = "Studio Shop",
  product = "Stoneware Mug",
  detail = "Handmade · 350 ml",
  price = 24,
  items = 2,
  total = 58,
  currency = "USD",
  locale = "en-US",
  cta = "Add to cart",
  added = "Added",
  accent = "#1f5bff",
  loop = true,
  className = "",
}: AddToCartProps) {
  const root = useRef<HTMLDivElement>(null);
  const totalText = useRef<HTMLSpanElement>(null);
  const money = new Intl.NumberFormat(locale, { style: "currency", currency });

  useGSAP(
    () => {
      const el = root.current as HTMLElement;
      const q = gsap.utils.selector(root);
      const button = q("[data-button]")[0] as HTMLElement;
      const tile = q("[data-tile]")[0] as HTMLElement;
      const cart = q("[data-cart]")[0] as HTMLElement;
      const flyer = q("[data-flyer]")[0] as HTMLElement;
      const sum = { v: total };
      const write = () => {
        if (totalText.current) totalText.current.textContent = money.format(sum.v);
      };

      // Posições medidas em relação à caixa do componente. k desfaz a escala de quem mostra o
      // componente reduzido: o retângulo medido vem escalado, o left/top não.
      const box = (node: HTMLElement) => {
        const a = el.getBoundingClientRect();
        const b = node.getBoundingClientRect();
        const k = a.width ? el.offsetWidth / a.width : 1;
        return { x: (b.left - a.left) * k, y: (b.top - a.top) * k, w: b.width * k, h: b.height * k };
      };
      const aim = () => {
        const b = box(button);
        return { x: b.x + b.w / 2 - 10, y: b.y + b.h / 2 - 10 };
      };
      const start = () => {
        const t = box(tile);
        return { x: t.x + t.w / 2 - 22, y: t.y + t.h / 2 - 22 };
      };
      const end = () => {
        const c = box(cart);
        return { x: c.x + c.w / 2 - 22, y: c.y + c.h / 2 - 22 };
      };

      const tl = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 1.4 });
      tl.set(q("[data-pointer]"), { left: () => el.clientWidth * 0.18, top: () => el.clientHeight * 0.9, autoAlpha: 1, scale: 1 })
        .set(q("[data-cta]"), { autoAlpha: 1, y: 0 })
        .set(q("[data-added]"), { autoAlpha: 0, y: 10 })
        .set(flyer, { left: () => start().x, top: () => start().y, x: 0, y: 0, scale: 1, autoAlpha: 0 })
        .set(q("[data-count]"), { textContent: String(items), scale: 1 })
        .set(sum, { v: total })
        .add(write, 0)
        .to(q("[data-pointer]"), { left: () => aim().x, top: () => aim().y, duration: 0.8, ease: "power2.inOut" }, 0.4)
        .to(q("[data-pointer]"), { scale: 0.7, duration: 0.1, yoyo: true, repeat: 1 }, 1.25)
        .to(button, { scale: 0.96, duration: 0.1, yoyo: true, repeat: 1 }, 1.25)
        .to(q("[data-cta]"), { autoAlpha: 0, y: -10, duration: 0.2 }, 1.4)
        .to(q("[data-added]"), { autoAlpha: 1, y: 0, duration: 0.3, ease: "back.out(2)" }, 1.5)
        .to(q("[data-pointer]"), { autoAlpha: 0, duration: 0.3 }, 1.6)
        // A miniatura sai do produto e faz um arco até o carrinho: x quase reto, y sobe e desce.
        .set(flyer, { autoAlpha: 1 }, 1.45)
        .to(flyer, { x: () => end().x - start().x, duration: 0.75, ease: "power1.in" }, 1.45)
        .to(flyer, { y: () => end().y - start().y, duration: 0.75, ease: "back.in(2.2)" }, 1.45)
        .to(flyer, { scale: 0.35, duration: 0.75, ease: "power2.in" }, 1.45)
        .set(flyer, { autoAlpha: 0 }, 2.2)
        .to(cart, { y: 3, rotation: -8, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.out" }, 2.2)
        .set(q("[data-count]"), { textContent: String(items + 1) }, 2.25)
        .fromTo(q("[data-count]"), { scale: 1.6 }, { scale: 1, duration: 0.45, ease: "back.out(3)", immediateRender: false }, 2.25)
        .to(sum, { v: total + price, duration: 0.6, ease: "power2.out", onUpdate: write }, 2.25)
        .to({}, { duration: 1.6 });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1).pause();
    },
    { scope: root, dependencies: [price, items, total, currency, locale, loop] },
  );

  return (
    <div ref={root} className={`relative w-[480px] max-w-full overflow-hidden rounded-2xl bg-neutral-100 text-neutral-900 ${className}`}>
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-3">
        <span className="text-[14px] font-bold tracking-tight">{store}</span>
        <div className="flex items-center gap-3">
          <span ref={totalText} className="text-[13px] font-semibold text-neutral-600 tabular-nums">
            {money.format(total)}
          </span>
          <span data-cart className="relative grid h-9 w-9 place-items-center rounded-full bg-neutral-100">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#171717" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 7h14l-1.5 9.5a2 2 0 0 1-2 1.5H8.5a2 2 0 0 1-2-1.5z" />
              <path d="M9 10V6a3 3 0 0 1 6 0v4" />
            </svg>
            <span
              data-count
              className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10.5px] font-bold text-white tabular-nums"
              style={{ backgroundColor: accent }}
            >
              {items}
            </span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-5 p-5">
        <div
          data-tile
          className="grid h-[132px] w-[132px] shrink-0 place-items-center rounded-xl"
          style={{ background: `linear-gradient(145deg, color-mix(in srgb, ${accent} 22%, white), color-mix(in srgb, ${accent} 8%, white))` }}
        >
          <Mug color={accent} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold">{product}</p>
          <p className="mt-0.5 text-[12.5px] text-neutral-500">{detail}</p>
          <p className="mt-2 text-[20px] font-bold tabular-nums">{money.format(price)}</p>
          <button
            data-button
            type="button"
            tabIndex={-1}
            className="relative mt-3 grid h-10 w-full place-items-center overflow-hidden rounded-lg text-[13.5px] font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            <span data-cta className="[grid-area:1/1]">
              {cta}
            </span>
            <span data-added className="flex items-center gap-1.5 [grid-area:1/1]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              {added}
            </span>
          </button>
        </div>
      </div>

      <span
        data-flyer
        aria-hidden="true"
        className="absolute grid h-11 w-11 place-items-center rounded-lg shadow-lg"
        style={{ background: `color-mix(in srgb, ${accent} 18%, white)` }}
      >
        <span className="block scale-[0.36]">
          <Mug color={accent} />
        </span>
      </span>

      <div data-pointer aria-hidden="true" className="absolute h-5 w-5 rounded-full border-2 border-neutral-900 bg-neutral-900/20" />
    </div>
  );
}

/** Caneca genérica desenhada em SVG (troque pela foto do produto). */
function Mug({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 80 80" className="h-[78px] w-[78px]" aria-hidden="true">
      <ellipse cx="38" cy="66" rx="24" ry="5" fill="#000" opacity={0.08} />
      <path d="M58 30h4a9 9 0 0 1 0 18h-4" fill="none" stroke={color} strokeWidth={5} />
      <path d="M16 22h44v30a14 14 0 0 1-14 14H30a14 14 0 0 1-14-14z" fill={color} />
      <ellipse cx="38" cy="22" rx="22" ry="5" fill="#ffffff" opacity={0.35} />
    </svg>
  );
}
