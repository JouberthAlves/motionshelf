"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const INK = "#171717";

export type TitleRevealProps = {
  /** One string per line. Words are separated by spaces. */
  lines?: string[];
  /** The word that gets the highlight marker. */
  highlight?: string;
  /** Line under the title. */
  subtitle?: string;
  /** Color of the highlight marker. */
  accent?: string;
  /** Replay forever with a pause between runs. */
  loop?: boolean;
  className?: string;
};

export default function TitleReveal({
  lines = ["Animations that", "close the sale."],
  highlight = "close",
  subtitle = "Each word rises in turn. The highlight is drawn last.",
  accent = "#1f5bff",
  loop = true,
  className = "",
}: TitleRevealProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 1.6 });
      tl.set(q("[data-word]"), { yPercent: 110 })
        .set(q("[data-mark]"), { scaleX: 0 })
        .set(q("[data-hl]"), { color: INK })
        .set(q("[data-sub]"), { autoAlpha: 0, y: 8 })
        .to(q("[data-word]"), { yPercent: 0, duration: 0.6, ease: "power3.out", stagger: 0.09 }, 0.2)
        .to(q("[data-mark]"), { scaleX: 1, duration: 0.5, ease: "power2.inOut" }, 1.0)
        .to(q("[data-hl]"), { color: "#ffffff", duration: 0.2 }, 1.25)
        .to(q("[data-sub]"), { autoAlpha: 1, y: 0, duration: 0.4 }, 1.4)
        .to({}, { duration: 2 });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1).pause();
    },
    { scope: root, dependencies: [loop, lines.join("|"), highlight] },
  );

  return (
    <div ref={root} className={`w-full max-w-xl px-6 py-8 text-[${INK}] ${className}`} style={{ color: INK }}>
      {lines.map((line, row) => (
        <div
          key={row}
          className="overflow-hidden pr-[0.15em] pb-1 text-[clamp(2rem,6vw,3.25rem)] leading-[1.05] font-bold tracking-tight"
        >
          {line.split(" ").map((word, i) => {
            const isHighlight = word.replace(/[.,!?]/g, "") === highlight;
            return (
              <span key={i}>
                <span data-word className="inline-block">
                  {isHighlight ? (
                    <span data-hl className="relative isolate inline-block">
                      <i
                        data-mark
                        aria-hidden="true"
                        className="absolute -inset-x-[0.12em] inset-y-[0.04em] -z-10 origin-left"
                        style={{ backgroundColor: accent }}
                      />
                      {word}
                    </span>
                  ) : (
                    word
                  )}
                </span>{" "}
              </span>
            );
          })}
        </div>
      ))}
      <p data-sub className="mt-4 text-[15px] text-neutral-600">
        {subtitle}
      </p>
    </div>
  );
}
