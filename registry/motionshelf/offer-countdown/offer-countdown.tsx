"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type OfferCountdownProps = {
  /** When the offer ends (ISO date or timestamp in ms). Use the real deadline. */
  endsAt?: string | number;
  /** Without endsAt (demo only): seconds left when the component mounts. */
  demoSeconds?: number;
  /** Small label at the top. */
  title?: string;
  /** Line above the clock. */
  subtitle?: string;
  /** Labels under the three groups of the clock. */
  labels?: [string, string, string];
  /** Units actually left. Use the real number. */
  stock?: number;
  /** Units at the start of the offer. */
  total?: number;
  /** Stock line; {n} is replaced by the number left. */
  stockLabel?: string;
  /** Text shown when the time is over. */
  endedLabel?: string;
  /** Color of the dot and the stock bar. */
  accent?: string;
  className?: string;
};

const pad = (n: number) => String(Math.min(n, 99)).padStart(2, "0");
const digitsOf = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return (pad(Math.floor(s / 3600)) + pad(Math.floor((s % 3600) / 60)) + pad(s % 60)).split("");
};

export default function OfferCountdown({
  endsAt,
  demoSeconds = 2 * 3600 + 13 * 60 + 45,
  title = "Launch offer",
  subtitle = "Ends in",
  labels = ["Hours", "Minutes", "Seconds"],
  stock = 7,
  total = 40,
  stockLabel = "Only {n} left at this price",
  endedLabel = "This offer has ended",
  accent = "#1f5bff",
  className = "",
}: OfferCountdownProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const q = gsap.utils.selector(root);
      const tiles = q("[data-tile]") as HTMLElement[];
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // O prazo é calculado só no navegador: hora no render do servidor quebra a hidratação.
      const deadline = endsAt !== undefined ? new Date(endsAt).getTime() : Date.now() + demoSeconds * 1000;
      const parts = (tile: HTMLElement) => ({
        up: tile.querySelector("[data-up] span") as HTMLElement,
        down: tile.querySelector("[data-down] span") as HTMLElement,
        flapUp: tile.querySelector("[data-flap-up]") as HTMLElement,
        flapDown: tile.querySelector("[data-flap-down]") as HTMLElement,
      });
      const show = (tile: HTMLElement, d: string) => {
        const p = parts(tile);
        p.up.textContent = p.down.textContent = d;
        (p.flapUp.firstElementChild as HTMLElement).textContent = d;
        (p.flapDown.firstElementChild as HTMLElement).textContent = d;
        gsap.set([p.flapUp, p.flapDown], { rotationX: 0 });
      };

      // Virada de placa: a metade de cima do número velho cai, a de baixo do novo desce atrás dela.
      const flip = contextSafe!((tile: HTMLElement, from: string, to: string) => {
        const p = parts(tile);
        gsap.killTweensOf([p.flapUp, p.flapDown]);
        p.up.textContent = to;
        p.down.textContent = from;
        (p.flapUp.firstElementChild as HTMLElement).textContent = from;
        (p.flapDown.firstElementChild as HTMLElement).textContent = to;
        gsap
          .timeline({ onComplete: () => show(tile, to) })
          .set(p.flapUp, { rotationX: 0 })
          .set(p.flapDown, { rotationX: 90 })
          .to(p.flapUp, { rotationX: -90, duration: 0.22, ease: "power2.in" })
          .to(p.flapDown, { rotationX: 0, duration: 0.26, ease: "power2.out" });
      });

      let shown = digitsOf(deadline - Date.now());
      shown.forEach((d, i) => show(tiles[i], d));
      const ended = () => {
        gsap.to(q("[data-sub]"), { autoAlpha: 0, duration: 0.2 });
        gsap.to(q("[data-ended]"), { autoAlpha: 1, duration: 0.3 });
        gsap.to(q("[data-stock]"), { opacity: 0.4, duration: 0.3 });
      };
      gsap.set(q("[data-ended]"), { autoAlpha: 0 });
      if (deadline <= Date.now()) ended();

      const timer = window.setInterval(() => {
        const next = digitsOf(deadline - Date.now());
        next.forEach((d, i) => {
          if (d === shown[i]) return;
          if (reduced) show(tiles[i], d);
          else flip(tiles[i], shown[i], d);
        });
        shown = next;
        if (deadline <= Date.now()) {
          window.clearInterval(timer);
          ended();
        }
      }, 250);

      // Entrada e o brilho que passa pela barra de estoque de tempos em tempos.
      const ratio = total > 0 ? Math.min(Math.max(stock / total, 0), 1) : 0;
      const intro = gsap.timeline();
      intro
        .set(q("[data-bar]"), { scaleX: 0 })
        .set(tiles, { y: 12, autoAlpha: 0 })
        .to(tiles, { y: 0, autoAlpha: 1, duration: 0.4, ease: "power3.out", stagger: 0.05 }, 0.1)
        .to(q("[data-bar]"), { scaleX: ratio, duration: 0.9, ease: "power3.out" }, 0.5);
      // O brilho tem 1/4 da barra: sai de antes da borda esquerda (-120%) e vai até depois da direita
      // (420%), então nunca fica parado à vista durante a pausa. Começa fora já no 1º quadro.
      gsap.set(q("[data-shine]"), { xPercent: -120 });
      const shine = gsap.timeline({ repeat: -1, repeatDelay: 2.6, delay: 1.6 });
      shine
        .set(q("[data-shine]"), { xPercent: -120 })
        .to(q("[data-shine]"), { xPercent: 420, duration: 1.2, ease: "power2.inOut" })
        .to(q("[data-dot]"), { scale: 1.8, autoAlpha: 0, duration: 0.9, ease: "power1.out" }, 0);
      if (reduced) {
        intro.progress(1).pause();
        shine.pause(0);
      }

      return () => window.clearInterval(timer);
    },
    { scope: root, dependencies: [endsAt, demoSeconds, stock, total] },
  );

  const left = stockLabel.replace("{n}", String(stock));
  const ratio = total > 0 ? Math.min(Math.max(stock / total, 0), 1) : 0;

  return (
    <div ref={root} className={`@container w-[480px] max-w-full rounded-2xl border border-white/10 bg-[#111318] p-5 text-white min-[480px]:p-6 ${className}`}>
      <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-white/60 uppercase">
        <span className="relative grid h-2 w-2 place-items-center">
          <span data-dot className="absolute inset-0 rounded-full" style={{ backgroundColor: accent }} />
          <span className="absolute inset-0 rounded-full" style={{ backgroundColor: accent }} />
        </span>
        {title}
      </p>
      <div className="mt-3 grid text-[15px] text-white/85">
        <p data-sub className="[grid-area:1/1]">
          {subtitle}
        </p>
        <p data-ended className="invisible font-semibold text-white opacity-0 [grid-area:1/1]">
          {endedLabel}
        </p>
      </div>

      <div className="mt-3 flex items-start gap-1.5 [--tf:26px] [--th:48px] [--tw:34px] @[420px]:gap-2 @[420px]:[--tf:34px] @[420px]:[--th:60px] @[420px]:[--tw:44px]">
        {[0, 1, 2].map((g) => (
          <div key={g} className="flex items-start gap-1.5 @[420px]:gap-2">
            {g > 0 ? (
              <span aria-hidden="true" className="pt-[calc(var(--th)/2-10px)] text-[22px] leading-none font-bold text-white/30 @[420px]:text-[26px]">
                :
              </span>
            ) : null}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex gap-1">
                {[0, 1].map((k) => (
                  <Tile key={k} />
                ))}
              </div>
              <span className="text-[10.5px] tracking-[0.12em] text-white/55 uppercase">{labels[g]}</span>
            </div>
          </div>
        ))}
      </div>

      <div data-stock className="mt-5">
        <p className="text-[13px] text-white/80">{left}</p>
        <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={stock} aria-label={left}>
          <div data-bar className="absolute inset-y-0 left-0 w-full origin-left rounded-full" style={{ backgroundColor: accent, transform: `scaleX(${ratio})` }} />
          <div data-shine aria-hidden="true" className="absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/45 to-transparent" />
        </div>
      </div>
    </div>
  );
}

/** Uma placa do relógio: metades paradas e as duas abas que viram. */
function Tile() {
  const half = "absolute inset-x-0 h-1/2 overflow-hidden bg-[#1d2029] backface-hidden";
  const digit = "block h-(--th) text-center text-(length:--tf) leading-(--th) font-bold tabular-nums";
  return (
    <span data-tile className="relative block h-(--th) w-(--tw) rounded-md [perspective:320px]">
      <span data-up className={`${half} top-0 rounded-t-md`}>
        <span className={digit}>0</span>
      </span>
      <span data-down className={`${half} bottom-0 rounded-b-md`}>
        <span className={`${digit} -mt-[calc(var(--th)/2)]`}>0</span>
      </span>
      <span data-flap-up className={`${half} top-0 origin-bottom rounded-t-md`}>
        <span className={digit}>0</span>
      </span>
      <span data-flap-down className={`${half} bottom-0 origin-top rounded-b-md`}>
        <span className={`${digit} -mt-[calc(var(--th)/2)]`}>0</span>
      </span>
      {/* a linha da dobra */}
      <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-black/50" />
    </span>
  );
}
