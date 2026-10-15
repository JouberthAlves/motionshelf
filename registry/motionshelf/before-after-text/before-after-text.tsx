"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type BeforeAfterRow = { before: string; after: string };

export type BeforeAfterTextProps = {
  /** Heading above the rows. */
  title?: string;
  /** Each row: the old way and the new way. */
  rows?: BeforeAfterRow[];
  /** Color of the new way. */
  accent?: string;
  /** Replay forever with a pause between runs. */
  loop?: boolean;
  className?: string;
};

export default function BeforeAfterText({
  title = "Before and after",
  rows = [
    { before: "Tracking leads in spreadsheets", after: "Every lead in one pipeline" },
    { before: "Forgotten follow-ups", after: "Reminders sent on time" },
    { before: "Guessing the calendar", after: "Live availability" },
  ],
  accent = "#1f5bff",
  loop = true,
  className = "",
}: BeforeAfterTextProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 1.4 });
      tl.set(q("[data-strike]"), { scaleX: 0 })
        .set(q("[data-new]"), { autoAlpha: 0, y: 18 })
        .fromTo(q("[data-title]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0)
        .fromTo(q("[data-old]"), { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.15 }, 0.1);

      q("[data-row]").forEach((row: Element, i: number) => {
        const at = 1.2 + i * 0.9;
        tl.to(row.querySelector("[data-strike]"), { scaleX: 1, duration: 0.35, ease: "power2.inOut" }, at)
          .to(row.querySelector("[data-old]"), { autoAlpha: 0, y: -16, duration: 0.3 }, at + 0.45)
          .to(row.querySelector("[data-new]"), { autoAlpha: 1, y: 0, duration: 0.4, ease: "back.out(1.6)" }, at + 0.55);
      });
      tl.to({}, { duration: 1.8 });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1).pause();
    },
    { scope: root, dependencies: [loop, rows.map((r) => r.before + r.after).join("|")] },
  );

  return (
    <div ref={root} className={`w-full max-w-xl ${className}`}>
      <p data-title className="mb-4 text-xs font-semibold tracking-[0.14em] text-current/60 uppercase">
        {title}
      </p>
      <div className="flex flex-col gap-2.5">
        {rows.map((row, i) => (
          <div key={i} data-row className="relative h-11">
            <span data-old className="absolute top-0 left-0 text-base leading-[44px] whitespace-nowrap text-current/60">
              {row.before}
              <i
                data-strike
                aria-hidden="true"
                className="absolute top-1/2 -inset-x-0.5 h-0.5 origin-left bg-red-600/70"
              />
            </span>
            <span
              data-new
              className="absolute top-0 left-0 flex items-center text-base leading-[44px] font-semibold whitespace-nowrap"
              style={{ color: accent }}
            >
              <b className="mr-2.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
              {row.after}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
