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
      const slot = q("[data-slot]")[0] as HTMLElement;
      const n = words.length;
      // Largura fixa: o espaço tem a largura da palavra mais longa (em em, para seguir o tamanho da
      // fonte), assim a frase não muda de linha quando a palavra troca.
      const size = parseFloat(getComputedStyle(slot).fontSize) || 16;
      const widest = Math.max(...(q("[data-word]") as HTMLElement[]).map((el) => el.offsetWidth));
      slot.style.width = `${widest / size}em`;
      const tl = gsap.timeline({ repeat: loop ? -1 : 0 });
      tl.set(track, { yPercent: 0, filter: "blur(0px)" });
      for (let i = 1; i <= n; i++) {
        const at = i * 1.3;
        tl.to(track, { yPercent: -(100 / (n + 1)) * i, duration: 0.55, ease: "expo.inOut" }, at);
        // Desfoque de movimento só no meio da troca.
        tl.to(track, { filter: "blur(3px)", duration: 0.22, ease: "power2.in" }, at + 0.05);
        tl.to(track, { filter: "blur(0px)", duration: 0.28, ease: "power2.out" }, at + 0.27);
      }
      tl.set(track, { yPercent: 0 }, n * 1.3 + 0.5).to({}, { duration: 1.2 });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1).pause();
    },
    { scope: root, dependencies: [loop, words.join("|")] },
  );

  return (
    <div
      ref={root}
      className={`text-[clamp(1.75rem,5vw,2.75rem)] leading-[1.15] font-bold tracking-tight ${className}`}
    >
      <p>
        {prefix}{" "}
        <span data-slot className="inline-block h-[1.15em] overflow-hidden align-bottom" style={{ color: accent }}>
          <span data-track className="block">
            {[...words, words[0]].map((word, i) => (
              <span key={i} data-word className="block h-[1.15em] w-max leading-[1.15em] whitespace-nowrap">
                {word}
              </span>
            ))}
          </span>
        </span>
        {/* Linha própria: com o espaço de largura fixa, a sobra fica no fim da linha e não vira um vão no meio da frase. */}
        <span className="block">{suffix}</span>
      </p>
    </div>
  );
}
