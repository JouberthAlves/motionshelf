"use client";

import { useRef } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, MotionPathPlugin);

export type OrderTrackerProps = {
  /** Order name or number in the header. */
  order?: string;
  /** The four stages, in order. */
  steps?: [string, string, string, string];
  /** Time shown next to each stage. */
  times?: [string, string, string, string];
  /** Minutes left when the courier leaves; counts down to zero. */
  eta?: number;
  /** Text before the minutes. */
  etaLabel?: string;
  /** Word after the minutes. */
  minutesLabel?: string;
  /** Text that replaces the countdown at the end. */
  deliveredLabel?: string;
  /** Color of the route, the checks and the courier. */
  accent?: string;
  /** Replay forever with a pause between runs. */
  loop?: boolean;
  className?: string;
};

const ROUTE = "M24 92 C 70 92, 72 40, 120 44 S 180 96, 226 70 S 290 24, 316 34";
const CONFETTI = [
  { x: -70, y: -46, r: 140 },
  { x: -42, y: -64, r: -90 },
  { x: -14, y: -58, r: 200 },
  { x: 18, y: -66, r: -160 },
  { x: 46, y: -54, r: 110 },
  { x: 74, y: -40, r: -220 },
  { x: -88, y: -18, r: 80 },
  { x: 92, y: -14, r: -60 },
];

export default function OrderTracker({
  order = "Order #2481",
  steps = ["Order placed", "Preparing", "On the way", "Delivered"],
  times = ["14:02", "14:05", "14:18", "14:30"],
  eta = 12,
  etaLabel = "Arrives in",
  minutesLabel = "min",
  deliveredLabel = "Delivered",
  accent = "#1f5bff",
  loop = true,
  className = "",
}: OrderTrackerProps) {
  const root = useRef<HTMLDivElement>(null);
  const minutes = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const left = { v: eta };
      const write = () => {
        if (minutes.current) minutes.current.textContent = String(Math.ceil(left.v));
      };
      const route = q("[data-route]")[0] as unknown as SVGPathElement;
      const length = route.getTotalLength();
      const dots = q("[data-step-dot]");
      const checks = q("[data-step-check]");
      const labels = q("[data-step-label]");
      const done = (i: number, at: number) =>
        tl
          .to(dots[i], { scale: 1, duration: 0.35, ease: "back.out(2.4)" }, at)
          .to(checks[i], { strokeDashoffset: 0, duration: 0.3, ease: "power2.out" }, at + 0.15)
          .to(labels[i], { opacity: 1, duration: 0.3 }, at);

      const tl = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 1.6 });
      tl.set(dots, { scale: 0 })
        .set(checks, { strokeDashoffset: 20 })
        .set(labels, { opacity: 0.55 })
        .set(q("[data-line]"), { scaleY: 0 })
        .set(route, { strokeDasharray: length, strokeDashoffset: length })
        .set(q("[data-courier]"), { motionPath: { path: route, align: route, alignOrigin: [0.5, 0.5], start: 0, end: 0 } })
        .set(q("[data-eta]"), { autoAlpha: 1, y: 0 })
        .set(q("[data-delivered]"), { autoAlpha: 0, y: 8 })
        .set(q("[data-confetti]"), { x: 0, y: 0, rotation: 0, autoAlpha: 0 })
        .set(left, { v: eta })
        .add(write, 0);

      done(0, 0.3);
      tl.to(q("[data-line]"), { scaleY: 1 / 3, duration: 0.5, ease: "power2.inOut" }, 0.8);
      done(1, 1.3);
      tl.to(q("[data-line]"), { scaleY: 2 / 3, duration: 0.5, ease: "power2.inOut" }, 1.8);
      done(2, 2.3);
      // A moto anda pela rota e a rota se desenha atrás dela; o tempo restante conta até zero.
      tl.to(q("[data-courier]"), { motionPath: { path: route, align: route, alignOrigin: [0.5, 0.5] }, duration: 3, ease: "power1.inOut" }, 2.5)
        .to(route, { strokeDashoffset: 0, duration: 3, ease: "power1.inOut" }, 2.5)
        .to(left, { v: 0, duration: 3, ease: "power1.inOut", onUpdate: write }, 2.5)
        .to(q("[data-line]"), { scaleY: 1, duration: 0.5, ease: "power2.inOut" }, 5.4);
      done(3, 5.9);
      tl.to(q("[data-eta]"), { autoAlpha: 0, y: -8, duration: 0.25 }, 5.9)
        .to(q("[data-delivered]"), { autoAlpha: 1, y: 0, duration: 0.35, ease: "back.out(1.8)" }, 6.0)
        .to(q("[data-confetti]"), { autoAlpha: 1, duration: 0.01 }, 6.0)
        .to(q("[data-confetti]"), { x: (i) => CONFETTI[i].x, y: (i) => CONFETTI[i].y, rotation: (i) => CONFETTI[i].r, duration: 0.7, ease: "power3.out" }, 6.0)
        .to(q("[data-confetti]"), { y: (i) => CONFETTI[i].y + 26, autoAlpha: 0, duration: 0.6, ease: "power1.in" }, 6.7)
        .to({}, { duration: 1.2 });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1).pause();
    },
    { scope: root, dependencies: [eta, loop] },
  );

  return (
    <div ref={root} className={`w-[380px] max-w-full overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-xl ${className}`}>
      <div className="relative h-[124px] overflow-hidden bg-[#eef1f5]">
        <svg viewBox="0 0 340 124" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {/* quarteirões */}
          <g fill="#e1e6ee">
            <rect x="8" y="8" width="60" height="40" rx="4" />
            <rect x="84" y="70" width="70" height="46" rx="4" />
            <rect x="150" y="6" width="66" height="34" rx="4" />
            <rect x="244" y="82" width="86" height="34" rx="4" />
            <rect x="262" y="4" width="70" height="20" rx="4" />
          </g>
          <path d={ROUTE} fill="none" stroke="#d3dae5" strokeWidth={7} strokeLinecap="round" />
          <path data-route d={ROUTE} fill="none" stroke={accent} strokeWidth={4} strokeLinecap="round" />
          <circle cx="24" cy="92" r="6" fill="#ffffff" stroke="#1a1d24" strokeWidth={2.5} />
          <g transform="translate(316 34)">
            <path d="M0 -14 C 7 -14 10 -9 10 -5 C 10 2 0 12 0 12 C 0 12 -10 2 -10 -5 C -10 -9 -7 -14 0 -14 Z" fill="#1a1d24" />
            <circle cy="-5" r="3.5" fill="#ffffff" />
          </g>
          <g data-courier>
            <circle r="11" fill={accent} opacity={0.18} />
            <circle r="7" fill={accent} stroke="#ffffff" strokeWidth={2.5} />
            <path d="M-2.5 -3 L 3 0 L -2.5 3 Z" fill="#ffffff" />
          </g>
        </svg>
      </div>

      <div className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13px] font-semibold text-neutral-500">{order}</p>
          <div className="relative grid text-right">
            <p data-eta className="text-[13px] text-neutral-600 [grid-area:1/1]">
              {etaLabel}{" "}
              <span ref={minutes} className="font-bold text-neutral-900 tabular-nums">
                {eta}
              </span>{" "}
              {minutesLabel}
            </p>
            <p data-delivered className="text-[13px] font-bold [grid-area:1/1]" style={{ color: accent }}>
              {deliveredLabel}
            </p>
            <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-6">
              {CONFETTI.map((_, i) => (
                <i
                  key={i}
                  data-confetti
                  className="absolute block h-[7px] w-[4px] rounded-[1px]"
                  style={{ backgroundColor: i % 3 === 0 ? "#f5b400" : i % 3 === 1 ? accent : "#22c55e" }}
                />
              ))}
            </span>
          </div>
        </div>

        <ol className="relative mt-4 space-y-3.5">
          <span aria-hidden="true" className="absolute top-2.5 bottom-2.5 left-[10px] w-[2px] bg-neutral-200" />
          <span
            data-line
            aria-hidden="true"
            className="absolute top-2.5 bottom-2.5 left-[10px] w-[2px] origin-top"
            style={{ backgroundColor: accent }}
          />
          {steps.map((step, i) => (
            <li key={step} className="relative flex items-center gap-3">
              <span className="relative grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 border-neutral-200 bg-white">
                <span data-step-dot className="absolute inset-[-2px] rounded-full" style={{ backgroundColor: accent }} />
                <svg viewBox="0 0 24 24" className="relative h-3 w-3" fill="none" stroke="#ffffff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path data-step-check d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray={20} strokeDashoffset={20} />
                </svg>
              </span>
              <span data-step-label className="flex flex-1 justify-between text-[13.5px]">
                <span className="font-semibold">{step}</span>
                <span className="text-neutral-500 tabular-nums">{times[i]}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
