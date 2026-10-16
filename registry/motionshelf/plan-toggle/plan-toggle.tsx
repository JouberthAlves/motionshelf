"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type Plan = {
  /** Plan name. */
  name: string;
  /** Price per month on the monthly plan (whole number). */
  monthly: number;
  /** Price per month on the yearly plan (whole number). */
  yearly: number;
  /** Short list of what the plan includes. */
  features: string[];
};

export type PlanToggleProps = {
  /** Plans, in order. Three fit best. */
  plans?: Plan[];
  /** Index of the highlighted plan. */
  featured?: number;
  /** Badge on the highlighted plan. */
  featuredLabel?: string;
  /** Currency symbol before the price. */
  currency?: string;
  /** Text after the price. */
  period?: string;
  /** Labels of the two sides of the switch. */
  labels?: [string, string];
  /** Badge next to the yearly label. */
  discount?: string;
  /** Line under the price on each side of the switch. */
  billing?: [string, string];
  /** Color of the switch, the badge and the highlighted plan. */
  accent?: string;
  /** Replay forever with a pause between runs. */
  loop?: boolean;
  className?: string;
};

const DEFAULT_PLANS: Plan[] = [
  { name: "Starter", monthly: 29, yearly: 23, features: ["1 page", "Contact form", "Email support"] },
  { name: "Growth", monthly: 59, yearly: 47, features: ["5 pages", "WhatsApp button", "Monthly report"] },
  { name: "Pro", monthly: 99, yearly: 79, features: ["Unlimited pages", "Online booking", "Priority support"] },
];

// Coluna de um dígito: 0 a 9 e uma posição vazia (para preços com menos dígitos).
const COLUMN = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ""];
const slotsOf = (n: number, width: number) => {
  const s = String(n);
  return Array.from({ length: width }, (_, i) => {
    const ch = s[i - (width - s.length)];
    return ch === undefined ? 10 : Number(ch);
  });
};

export default function PlanToggle({
  plans = DEFAULT_PLANS,
  featured = 1,
  featuredLabel = "Popular",
  currency = "$",
  period = "/mo",
  labels = ["Monthly", "Yearly"],
  discount = "-20%",
  billing = ["billed monthly", "billed yearly"],
  accent = "#1f5bff",
  loop = true,
  className = "",
}: PlanToggleProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const cols = q("[data-col]") as HTMLElement[];
      const to = (side: "m" | "y") => (i: number) => -(Number(cols[i].dataset[side]) * 100) / COLUMN.length;
      const flip = (tl: gsap.core.Timeline, side: "m" | "y", at: number) => {
        const yearly = side === "y";
        tl.to(q("[data-thumb]"), { xPercent: yearly ? 100 : 0, duration: 0.45, ease: "power3.inOut" }, at)
          .to(q("[data-label='m']"), { color: yearly ? "#525252" : "#ffffff", duration: 0.3 }, at + 0.1)
          .to(q("[data-label='y']"), { color: yearly ? "#ffffff" : "#525252", duration: 0.3 }, at + 0.1)
          .to(cols, { yPercent: to(side), duration: 0.7, ease: "power3.inOut", stagger: 0.04 }, at + 0.1)
          .to(q("[data-bill='m']"), { autoAlpha: yearly ? 0 : 1, duration: 0.3 }, at + 0.25)
          .to(q("[data-bill='y']"), { autoAlpha: yearly ? 1 : 0, duration: 0.3 }, at + 0.25)
          .to(q("[data-badge]"), yearly ? { scale: 1, autoAlpha: 1, duration: 0.4, ease: "back.out(2.4)" } : { scale: 0.6, autoAlpha: 0, duration: 0.25 }, at + (yearly ? 0.35 : 0));
      };

      // Vai para o anual e volta para o mensal: começa e termina no mesmo quadro, o loop não pula.
      const tl = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 1.2 });
      tl.set(q("[data-thumb]"), { xPercent: 0 })
        .set(q("[data-label='m']"), { color: "#ffffff" })
        .set(q("[data-label='y']"), { color: "#525252" })
        .set(cols, { yPercent: to("m") })
        .set(q("[data-bill='m']"), { autoAlpha: 1 })
        .set(q("[data-bill='y']"), { autoAlpha: 0 })
        .set(q("[data-badge]"), { scale: 0.6, autoAlpha: 0 })
        .to(q("[data-thumb]"), { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1 }, 0.9);
      flip(tl, "y", 1.0);
      flip(tl, "m", 4.2);

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1).pause();
    },
    { scope: root, dependencies: [loop, plans.map((p) => `${p.monthly}-${p.yearly}`).join("|")] },
  );

  return (
    <div ref={root} className={`@container w-[520px] max-w-full rounded-2xl bg-neutral-100 p-3 text-neutral-900 min-[480px]:p-5 ${className}`}>
      <div className="flex items-center justify-center gap-2.5">
        <div className="relative grid grid-cols-2 rounded-full bg-neutral-200 p-1 text-[13px] font-semibold">
          <span
            data-thumb
            aria-hidden="true"
            className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full"
            style={{ backgroundColor: accent }}
          />
          <span data-label="m" className="relative px-4 py-1.5 text-center">
            {labels[0]}
          </span>
          <span data-label="y" className="relative px-4 py-1.5 text-center">
            {labels[1]}
          </span>
        </div>
        <span
          data-badge
          className="rounded-full px-2 py-0.5 text-[11.5px] font-bold"
          style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 14%, white)` }}
        >
          {discount}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1.5 @[460px]:gap-2.5">
        {plans.map((plan, i) => {
          const width = Math.max(String(plan.monthly).length, String(plan.yearly).length);
          const m = slotsOf(plan.monthly, width);
          const y = slotsOf(plan.yearly, width);
          const hot = i === featured;
          return (
            <div
              key={plan.name}
              className="relative flex flex-col rounded-xl border-[1.5px] bg-white p-2.5 @[460px]:p-3.5"
              style={{ borderColor: hot ? accent : "#e5e5e5", boxShadow: hot ? `0 10px 30px -12px ${accent}` : undefined }}
            >
              {hot ? (
                <span
                  className="absolute -top-2.5 left-2.5 rounded-full @[460px]:left-3.5 px-2 py-0.5 text-[10.5px] font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {featuredLabel}
                </span>
              ) : null}
              <p className="text-[13px] font-semibold text-neutral-600">{plan.name}</p>
              <p className="mt-1.5 flex items-baseline gap-0.5" aria-label={`${currency}${plan.monthly}${period}`}>
                <span className="text-[13px] font-semibold @[460px]:text-[16px]">{currency}</span>
                <span aria-hidden="true" className="flex h-[1.15em] items-start overflow-hidden text-[22px] leading-[1.15] @[460px]:text-[30px] font-bold tabular-nums tracking-tight">
                  {m.map((d, k) => (
                    <span key={k} data-col data-m={d} data-y={y[k]} className="flex flex-col">
                      {COLUMN.map((c, j) => (
                        <span key={j} className="block h-[1.15em] text-center">
                          {c || " "}
                        </span>
                      ))}
                    </span>
                  ))}
                </span>
                <span className="text-[10.5px] text-neutral-500 @[460px]:text-[12px]">{period}</span>
              </p>
              <p className="grid text-[10px] text-neutral-500 @[460px]:text-[11px]">
                <span data-bill="m" className="[grid-area:1/1]">
                  {billing[0]}
                </span>
                <span data-bill="y" className="[grid-area:1/1]">
                  {billing[1]}
                </span>
              </p>
              <ul className="mt-3 space-y-1.5 text-[11px] text-neutral-700 @[460px]:text-[12px]">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <svg viewBox="0 0 24 24" className="mt-[1px] hidden h-3.5 w-3.5 shrink-0 @[460px]:block" fill="none" stroke={accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
