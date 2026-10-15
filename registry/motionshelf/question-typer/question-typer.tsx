"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type QuestionAnswer = { question: string; answer: string };

export type QuestionTyperProps = {
  /** Each question is typed out, then its answer appears under it. */
  items?: QuestionAnswer[];
  /** Label above the answer. */
  answerLabel?: string;
  /** Accent color of the bar and the answer mark. */
  accent?: string;
  /** Replay forever with a pause between runs. */
  loop?: boolean;
  className?: string;
};

const TYPE = 0.045; // segundos por letra da pergunta
const WRITE = 0.022; // segundos por letra da resposta

export default function QuestionTyper({
  items = [
    { question: "What color is a lime?", answer: "A lime is green." },
    { question: "How many days are in a week?", answer: "A week has seven days." },
    { question: "What is the capital of Brazil?", answer: "The capital of Brazil is Brasília." },
  ],
  answerLabel = "Answer",
  accent = "#1f5bff",
  loop = true,
  className = "",
}: QuestionTyperProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const questionEl = q("[data-question]")[0] as HTMLElement;
      const answerEl = q("[data-answer]")[0] as HTMLElement;
      const answerBox = q("[data-answer-box]")[0];

      // Escreve um texto letra a letra num elemento, dentro da timeline.
      const typeInto = (tl: gsap.core.Timeline, el: HTMLElement, text: string, from: number, to: number, perChar: number, at: number) => {
        const state = { n: from };
        tl.to(
          state,
          {
            n: to,
            duration: Math.max(0.05, Math.abs(to - from) * perChar),
            ease: "none",
            onUpdate: () => {
              el.textContent = text.slice(0, Math.round(state.n));
            },
          },
          at,
        );
      };

      const tl = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 0.4 });
      tl.set(answerBox, { autoAlpha: 0, y: 8, filter: "blur(6px)" }).add(() => {
        questionEl.textContent = "";
        answerEl.textContent = "";
      }, 0);

      let t = 0.3;
      let firstDone = 0;
      items.forEach(({ question, answer }, i) => {
        typeInto(tl, questionEl, question, 0, question.length, TYPE, t);
        t += question.length * TYPE + 0.35;

        // A resposta muda junto com a pergunta: limpa a anterior e escreve a nova.
        tl.add(() => {
          answerEl.textContent = "";
        }, t);
        tl.to(answerBox, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.5, ease: "expo.out" }, t);
        typeInto(tl, answerEl, answer, 0, answer.length, WRITE, t + 0.15);
        t += 0.15 + answer.length * WRITE;
        if (i === 0) firstDone = t;
        t += 1.6;

        // Apaga para a próxima (na última, o loop recomeça do zero).
        tl.to(answerBox, { autoAlpha: 0, y: -8, filter: "blur(6px)", duration: 0.3, ease: "power2.in" }, t);
        typeInto(tl, questionEl, question, question.length, 0, 0.012, t);
        t += Math.max(0.3, question.length * 0.012) + 0.25;
      });

      // Cursor piscando, fora da timeline principal.
      gsap.to(q("[data-caret]"), { opacity: 0, duration: 0.5, repeat: -1, yoyo: true, ease: "steps(1)" });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.pause(firstDone);
    },
    { scope: root, dependencies: [loop, items.map((it) => it.question + it.answer).join("|")] },
  );

  return (
    <div ref={root} className={`w-full max-w-lg rounded-xl bg-[#14161a] p-6 text-[#ece8df] ${className}`}>
      <div className="flex min-h-[46px] items-start gap-2.5 text-[17px] leading-snug">
        <span className="w-[3px] shrink-0 self-stretch rounded-full" style={{ backgroundColor: accent }} />
        <span className="min-w-0">
          <span data-question />
          <span data-caret className="ml-0.5 inline-block h-[18px] w-0.5 align-[-3px] bg-[#ece8df]" />
        </span>
      </div>
      <div data-answer-box className="mt-4 min-h-[56px] rounded-lg bg-white/[0.04] px-3.5 py-3">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-[#a9a294] uppercase">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
          {answerLabel}
        </p>
        <p data-answer className="text-[15px] leading-snug text-[#ece8df]" />
      </div>
    </div>
  );
}
