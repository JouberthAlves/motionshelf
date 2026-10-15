"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type QuestionTyperProps = {
  /** The questions typed one after another. */
  questions?: string[];
  /** Text shown once the first question is typed. */
  answer?: string;
  /** Button label under the answer. */
  cta?: string;
  /** Accent color of the bar and the button. */
  accent?: string;
  /** Replay forever with a pause between runs. */
  loop?: boolean;
  className?: string;
};

export default function QuestionTyper({
  questions = ["How do I get a refund?", "Can I change my plan later?", "Where is my order?"],
  answer = "These questions have answers. Talk to our team.",
  cta = "Chat with us",
  accent = "#c8a46b",
  loop = true,
  className = "",
}: QuestionTyperProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const el = q("[data-text]")[0] as HTMLElement;
      const answerEl = q("[data-answer]");
      const caret = q("[data-caret]");
      const tl = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 0.6 });
      tl.set(answerEl, { autoAlpha: 0, y: 10 }).add(() => {
        el.textContent = "";
      }, 0);

      let t = 0.3;
      questions.forEach((question, i) => {
        const typed = { n: 0 };
        tl.to(
          typed,
          {
            n: question.length,
            duration: question.length * 0.035,
            ease: "none",
            onUpdate: () => {
              el.textContent = question.slice(0, Math.round(typed.n));
            },
          },
          t,
        );
        t += question.length * 0.035 + 1.1;

        if (i === 0) tl.to(answerEl, { autoAlpha: 1, y: 0, duration: 0.4 }, t - 0.9);

        if (i < questions.length - 1) {
          const erased = { n: question.length };
          tl.to(
            erased,
            {
              n: 0,
              duration: 0.35,
              ease: "none",
              onUpdate: () => {
                el.textContent = question.slice(0, Math.round(erased.n));
              },
            },
            t,
          );
          t += 0.5;
        }
      });

      tl.to(caret, { opacity: 0, duration: 0.3, repeat: Math.round(t / 0.6), yoyo: true, ease: "steps(1)" }, 0);
      tl.to({}, { duration: 1 }, t);

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1).pause();
    },
    { scope: root, dependencies: [loop, questions.join("|")] },
  );

  return (
    <div ref={root} className={`w-full max-w-lg rounded-xl bg-[#14161a] p-6 text-[#ece8df] ${className}`}>
      <div className="flex min-h-[46px] items-start gap-2.5 text-[17px] leading-snug">
        <span className="w-[3px] shrink-0 self-stretch" style={{ backgroundColor: accent }} />
        <span className="min-w-0">
          <span data-text />
          <span data-caret className="ml-0.5 inline-block h-[18px] w-0.5 align-[-3px] bg-[#ece8df]" />
        </span>
      </div>
      <div data-answer className="mt-4 flex flex-col items-start gap-2.5">
        <p className="text-[13px] text-[#b7b0a2]">{answer}</p>
        <span className="rounded-sm border-[1.5px] px-3 py-2 text-[13px]" style={{ borderColor: accent }}>
          {cta}
        </span>
      </div>
    </div>
  );
}
