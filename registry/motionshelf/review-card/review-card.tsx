"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type Review = {
  /** Who wrote it. */
  name: string;
  /** The review text. */
  text: string;
  /** When it was written, e.g. "2 days ago". */
  when?: string;
};

export type ReviewCardProps = {
  /** Average rating, from 0 to 5. */
  rating?: number;
  /** Total number of reviews. */
  count?: number;
  /** Reviews shown one after another. */
  reviews?: Review[];
  /** Heading above the rating. */
  title?: string;
  /** Word after the review count. */
  countLabel?: string;
  /** Locale used to format the numbers. */
  locale?: string;
  /** Color of the stars. */
  starColor?: string;
  /** Replay forever with a pause between runs. */
  loop?: boolean;
  className?: string;
};

const STAR = "M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z";

const DEFAULT_REVIEWS: Review[] = [
  { name: "Marina S.", when: "2 days ago", text: "Booked on a Sunday night and got a reply in minutes. The team was on time and left everything spotless." },
  { name: "Rafael T.", when: "1 week ago", text: "Clear prices, no surprises at the end. I have already sent two friends here." },
  { name: "Julia P.", when: "3 weeks ago", text: "Friendly from the first message to the last. Best service I have had in years." },
];

export default function ReviewCard({
  rating = 4.9,
  count = 312,
  reviews = DEFAULT_REVIEWS,
  title = "Customer reviews",
  countLabel = "reviews",
  locale = "en-US",
  starColor = "#f5b400",
  loop = true,
  className = "",
}: ReviewCardProps) {
  const root = useRef<HTMLDivElement>(null);
  const ratingText = useRef<HTMLSpanElement>(null);
  const countText = useRef<HTMLSpanElement>(null);
  const score = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const whole = new Intl.NumberFormat(locale);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const num = { r: 0, c: 0 };
      const write = () => {
        if (ratingText.current) ratingText.current.textContent = score.format(num.r);
        if (countText.current) countText.current.textContent = whole.format(Math.round(num.c));
      };
      const blocks = q("[data-review]");
      const hold = 3.4;

      const tl = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 1.4 });
      tl.set(q("[data-card]"), { y: 14, autoAlpha: 0 })
        .set(q("[data-star]"), { scale: 0 })
        .set(q("[data-star-fill]"), { scaleX: 0 })
        .set(blocks, { autoAlpha: 0, y: 0 })
        .set(q("[data-word]"), { autoAlpha: 0, y: 8, filter: "blur(4px)" })
        .set(num, { r: 0, c: 0 })
        .add(write, 0)
        .to(q("[data-card]"), { y: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out" }, 0.2)
        .to(q("[data-star]"), { scale: 1, duration: 0.35, ease: "back.out(2.6)", stagger: 0.09 }, 0.5)
        .to(q("[data-star-fill]"), { scaleX: 1, duration: 0.3, ease: "power2.out", stagger: 0.09 }, 0.62)
        .to(num, { r: rating, c: count, duration: 1.2, ease: "power2.out", onUpdate: write }, 0.5);

      blocks.forEach((block, i) => {
        const at = 1.5 + i * hold;
        tl.set(block, { autoAlpha: 1 }, at).to(
          block.querySelectorAll("[data-word]"),
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.35, ease: "power2.out", stagger: 0.035 },
          at,
        );
        // A última fica na tela: é o quadro final (e o que aparece com movimento reduzido).
        if (i < blocks.length - 1) tl.to(block, { autoAlpha: 0, y: -6, duration: 0.3, ease: "power2.in" }, at + hold - 0.35);
      });
      tl.to({}, { duration: 1.6 });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1).pause();
    },
    { scope: root, dependencies: [rating, count, locale, loop, reviews.map((r) => r.text).join("|")] },
  );

  return (
    <div ref={root} className={`w-[380px] max-w-full ${className}`}>
      <div data-card className="rounded-2xl bg-white p-5 text-neutral-900 shadow-xl">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-neutral-500 uppercase">{title}</p>
        <div className="mt-2 flex items-center gap-3">
          <span ref={ratingText} className="text-[38px] leading-none font-bold tabular-nums tracking-tight">
            {score.format(0)}
          </span>
          <div>
            <div className="flex gap-0.5" aria-label={`${score.format(rating)} / 5`}>
              {[0, 1, 2, 3, 4].map((i) => {
                const fill = Math.min(Math.max(rating - i, 0), 1);
                return (
                  <span key={i} data-star className="relative block h-[18px] w-[18px]">
                    <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full" aria-hidden="true">
                      <path d={STAR} fill="#e5e5e5" />
                    </svg>
                    <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                      <span data-star-fill className="block h-full w-[18px] origin-left">
                        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
                          <path d={STAR} fill={starColor} />
                        </svg>
                      </span>
                    </span>
                  </span>
                );
              })}
            </div>
            <p className="mt-1 text-[12.5px] text-neutral-500">
              <span ref={countText} className="tabular-nums">
                {whole.format(0)}
              </span>{" "}
              {countLabel}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-neutral-200 pt-4">
          {/* Todas no mesmo lugar da grade: a altura é a da maior, nada pula quando uma troca pela outra. */}
          <div className="grid">
            {reviews.map((review, i) => (
              <figure key={i} data-review className="[grid-area:1/1]">
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-200 text-[12px] font-semibold text-neutral-600"
                  >
                    {review.name.slice(0, 1)}
                  </span>
                  <figcaption className="min-w-0">
                    <div className="text-[13px] font-semibold">{review.name}</div>
                    {review.when ? <div className="text-[11.5px] text-neutral-500">{review.when}</div> : null}
                  </figcaption>
                </div>
                <blockquote className="mt-2.5 text-[14px] leading-[1.5] text-neutral-700">
                  {review.text.split(" ").map((word, j) => (
                    <span key={j} data-word className="inline-block whitespace-pre">
                      {word}{" "}
                    </span>
                  ))}
                </blockquote>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
