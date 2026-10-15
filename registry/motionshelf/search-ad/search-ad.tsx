"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type SearchAdProps = {
  /** Text typed into the search box. */
  query?: string;
  /** Domain shown on the sponsored result. */
  adDomain?: string;
  /** Title of the sponsored result. */
  adTitle?: string;
  /** Description of the sponsored result. */
  adText?: string;
  /** Domain of the organic result. */
  organicDomain?: string;
  /** Title of the organic result. */
  organicTitle?: string;
  /** Description of the organic result. */
  organicText?: string;
  /** Button shown under the results. */
  cta?: string;
  /** Color of the highlight and the button. */
  accent?: string;
  /** Replay forever with a pause between runs. */
  loop?: boolean;
  className?: string;
};

export default function SearchAd({
  query = "running shoes",
  adDomain = "example.com",
  adTitle = "Brand · Running shoes on sale",
  adText = "Free shipping over $50. Easy returns.",
  organicDomain = "reviews.example",
  organicTitle = "The best running shoes of the year",
  organicText = "We compared the top picks by comfort and price.",
  cta = "Visit store",
  accent = "#1f5bff",
  loop = true,
  className = "",
}: SearchAdProps) {
  const root = useRef<HTMLDivElement>(null);
  const typed = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const counter = { n: 0 };
      const write = () => {
        if (typed.current) typed.current.textContent = query.slice(0, Math.round(counter.n));
      };
      const tl = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 1.4 });
      tl.set(q("[data-result]"), { autoAlpha: 0, y: 12 })
        .set(q("[data-cta]"), { autoAlpha: 0, y: 8 })
        .set(counter, { n: 0 })
        .add(() => {
          if (typed.current) typed.current.textContent = "";
        }, 0)
        .to(q("[data-caret]"), { opacity: 0, duration: 0.3, repeat: 3, yoyo: true }, 0)
        .to(counter, { n: query.length, duration: 1.3, ease: "none", onUpdate: write }, 0.4)
        .to(q("[data-result]"), { autoAlpha: (i: number) => (i ? 0.55 : 1), y: 0, duration: 0.4, stagger: 0.15 }, 2.0)
        .fromTo(q("[data-ad]"), { scale: 1 }, { scale: 1.03, duration: 0.25, yoyo: true, repeat: 1 }, 2.7)
        .to(q("[data-cta]"), { autoAlpha: 1, y: 0, duration: 0.35 }, 3.2)
        .to({}, { duration: 1.6 });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1).pause();
    },
    { scope: root, dependencies: [query, loop] },
  );

  return (
    <div
      ref={root}
      className={`w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-xl ${className}`}
    >
      <div className="flex h-11 items-center gap-2 rounded-full border border-neutral-300 px-4 text-[15px]">
        <span ref={typed} className="min-w-0 flex-1 truncate" />
        <span data-caret className="inline-block h-5 w-px shrink-0 bg-neutral-900" />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div
          data-result
          data-ad
          className="rounded-lg bg-white p-3 outline-2 -outline-offset-2 outline-solid"
          style={{ outlineColor: accent }}
        >
          <div className="text-[11px] text-neutral-500">
            <b className="font-bold text-neutral-900">Sponsored</b> · {adDomain}
          </div>
          <div className="mt-0.5 text-[15px] font-medium" style={{ color: accent }}>
            {adTitle}
          </div>
          <p className="text-[12px] text-neutral-600">{adText}</p>
        </div>

        <div data-result className="rounded-lg bg-neutral-50 p-3">
          <div className="text-[11px] text-neutral-500">{organicDomain}</div>
          <div className="mt-0.5 text-[15px] font-medium text-blue-800">{organicTitle}</div>
          <p className="text-[12px] text-neutral-600">{organicText}</p>
        </div>
      </div>

      <span
        data-cta
        className="mt-4 inline-block rounded-md px-3 py-2 text-xs font-semibold text-white"
        style={{ backgroundColor: accent }}
      >
        {cta}
      </span>
    </div>
  );
}
