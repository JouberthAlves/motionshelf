"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type RotatingWordProps = {
  /** Text before the word that changes. */
  prefix?: string;
  /** Words that take turns in the slot. */
  words?: string[];
  /** Text after the word that changes. */
  suffix?: string;
  /** Color of the changing word. */
  accent?: string;
  /** Replay forever. */
  loop?: boolean;
  className?: string;
};

export default function RotatingWord({
  prefix = "Build your next",
  words = ["landing page", "dashboard", "checkout", "onboarding"],
  suffix = "in minutes.",
  accent = "#1f5bff",
  loop = true,
  className = "",
}: RotatingWordProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const track = q("[data-track]")[0];
      const n = words.length;
      const tl = gsap.timeline({ repeat: loop ? -1 : 0 });
      tl.set(track, { yPercent: 0 });
      for (let i = 1; i <= n; i++) {
        tl.to(track, { yPercent: -(100 / (n + 1)) * i, duration: 0.45, ease: "power3.inOut" }, i * 1.3);
      }
      tl.set(track, { yPercent: 0 }, n * 1.3 + 0.5).to({}, { duration: 1.2 });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1).pause();
    },
    { scope: root, dependencies: [loop, words.join("|")] },
  );

  return (
    <div
      ref={root}
      className={`text-[clamp(1.75rem,5vw,2.75rem)] leading-[1.15] font-bold tracking-tight text-neutral-900 ${className}`}
    >
      <p>
        {prefix}{" "}
        <span className="inline-block h-[1.15em] overflow-hidden align-bottom" style={{ color: accent }}>
          <span data-track className="block">
            {[...words, words[0]].map((word, i) => (
              <span key={i} className="block h-[1.15em] leading-[1.15em] whitespace-nowrap">
                {word}
              </span>
            ))}
          </span>
        </span>{" "}
        {suffix}
      </p>
    </div>
  );
}
