"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const INK = "#1a1916";
const PAPER = "#efe7dd";
const BONE = "#ece6d8";

export type ChatFlowProps = {
  /** Business name in the chat header. */
  brand?: string;
  /** Headline of the landing block. */
  title?: string;
  /** Choices in the first row. */
  options?: string[];
  /** Choices in the second row. */
  slots?: string[];
  /** Which choice the cursor picks: [option index, slot index]. */
  picked?: [number, number];
  /** Label of the button that opens the chat. */
  button?: string;
  /** Message the visitor sends. */
  message?: string;
  /** Reply that comes back. */
  reply?: string;
  /** Time shown on the bubbles. */
  time?: string;
  /** Color of the button. */
  accent?: string;
  /** Replay forever with a pause between runs. */
  loop?: boolean;
  className?: string;
};

export default function ChatFlow({
  brand = "Acme",
  title = "Book a demo.",
  options = ["Starter", "Pro", "Team"],
  slots = ["Tue 10am", "Wed 2pm", "Thu 4pm"],
  picked = [1, 1],
  button = "Chat with us",
  message = "Hi! I'd like to book a demo for Wednesday at 2pm.",
  reply = "Confirmed! See you Wednesday at 2pm.",
  time = "10:42",
  accent = "#1f5bff",
  loop = true,
  className = "",
}: ChatFlowProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const screen = q("[data-screen]")[0] as HTMLElement;
      const landing = q("[data-lp]")[0];
      const chat = q("[data-chat]")[0];
      const chips = q("[data-opt]") as HTMLElement[];
      const slotChips = q("[data-slot]") as HTMLElement[];
      const cta = q("[data-btn]")[0] as HTMLElement;
      const cursor = q("[data-cursor]")[0];
      const typedEl = q("[data-typed]")[0] as HTMLElement;
      const statusEl = q("[data-status]")[0] as HTMLElement;
      const out = q("[data-out]")[0];
      const typing = q("[data-typing]")[0];
      const dots = q("[data-dot]");
      const replyEl = q("[data-reply]")[0];
      const blue = q("[data-blue]")[0];
      const counter = { n: 0 };

      // Centro do alvo, medido na tela do celular (o cursor tem 22px). k desfaz a escala de quem
      // mostra o componente reduzido: o retângulo medido vem escalado, o left/top do cursor não.
      const aim = (el: HTMLElement) => {
        const a = screen.getBoundingClientRect();
        const b = el.getBoundingClientRect();
        const k = a.width ? screen.offsetWidth / a.width : 1;
        return { x: (b.left - a.left + b.width / 2) * k - 11, y: (b.top - a.top + b.height / 2) * k - 11 };
      };
      const write = () => {
        typedEl.textContent = message.slice(0, Math.round(counter.n));
      };

      const tl = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 1.4 });
      tl.set(chat, { autoAlpha: 0, x: 40 })
        .set(landing, { autoAlpha: 1 })
        .set([out, typing, replyEl], { autoAlpha: 0, y: 10, display: "none" })
        .set(blue, { opacity: 0 })
        .set([...chips, ...slotChips], { backgroundColor: "rgba(0,0,0,0)", color: INK })
        .set(cursor, { left: 150, top: 430, autoAlpha: 1 })
        .set(counter, { n: 0 })
        .add(() => {
          typedEl.textContent = "";
          statusEl.textContent = "online";
        }, 0)
        .to(cursor, { left: () => aim(chips[picked[0]]).x, top: () => aim(chips[picked[0]]).y, duration: 0.6, ease: "power2.inOut" }, 0.4)
        .to(cursor, { scale: 0.75, duration: 0.1, yoyo: true, repeat: 1 }, 1.0)
        .to(chips[picked[0]], { backgroundColor: INK, color: BONE, duration: 0.12 }, 1.05)
        .to(cursor, { left: () => aim(slotChips[picked[1]]).x, top: () => aim(slotChips[picked[1]]).y, duration: 0.5, ease: "power2.inOut" }, 1.3)
        .to(cursor, { scale: 0.75, duration: 0.1, yoyo: true, repeat: 1 }, 1.8)
        .to(slotChips[picked[1]], { backgroundColor: INK, color: BONE, duration: 0.12 }, 1.85)
        .to(cursor, { left: () => aim(cta).x, top: () => aim(cta).y, duration: 0.5, ease: "power2.inOut" }, 2.1)
        .to(cta, { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1 }, 2.6)
        .to(cursor, { autoAlpha: 0, duration: 0.2 }, 2.8)
        .to(chat, { autoAlpha: 1, x: 0, duration: 0.4, ease: "power2.out" }, 2.85)
        .set(out, { display: "block" }, 3.2)
        .to(out, { autoAlpha: 1, y: 0, duration: 0.3 }, 3.2)
        .to(counter, { n: message.length, duration: 1.4, ease: "none", onUpdate: write }, 3.2)
        .to(blue, { opacity: 1, duration: 0.2 }, 5.0)
        .add(() => {
          statusEl.textContent = "typing...";
        }, 5.2)
        .set(typing, { display: "flex" }, 5.2)
        .to(typing, { autoAlpha: 1, y: 0, duration: 0.25 }, 5.2)
        .to(dots, { y: -4, duration: 0.25, stagger: 0.12, yoyo: true, repeat: 3 }, 5.3)
        .to(typing, { autoAlpha: 0, duration: 0.15 }, 6.6)
        .set(typing, { display: "none" }, 6.75)
        .set(replyEl, { display: "block" }, 6.75)
        .add(() => {
          statusEl.textContent = "online";
        }, 6.6)
        .to(replyEl, { autoAlpha: 1, y: 0, duration: 0.35, ease: "back.out(1.6)" }, 6.75)
        .to({}, { duration: 1.6 });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1).pause();
    },
    { scope: root, dependencies: [loop, message, picked.join(",")] },
  );

  return (
    <div
      ref={root}
      className={`relative h-[520px] w-[290px] shrink-0 overflow-hidden rounded-[34px] bg-neutral-950 p-[9px] shadow-2xl ${className}`}
    >
      <div data-screen className="relative h-full w-full overflow-hidden rounded-[26px]" style={{ background: PAPER, color: INK }}>
        <div data-lp className="absolute inset-0 px-[22px] pt-10">
          <p className="mb-3 text-[22px] leading-tight font-bold">{title}</p>
          <p className="mb-3 text-[13px] text-neutral-700">Pick a plan and a time:</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {options.map((option) => (
              <span
                key={option}
                data-opt
                className="rounded-sm border-[1.5px] px-2.5 py-1 text-xs"
                style={{ borderColor: INK }}
              >
                {option}
              </span>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {slots.map((slot) => (
              <span
                key={slot}
                data-slot
                className="rounded-sm border-[1.5px] px-2.5 py-1 text-xs"
                style={{ borderColor: INK }}
              >
                {slot}
              </span>
            ))}
          </div>
          <span
            data-btn
            className="inline-block rounded-sm px-4 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            {button}
          </span>
        </div>

        <div data-chat className="absolute inset-0" style={{ background: PAPER }}>
          <div className="flex h-[54px] items-center gap-2.5 px-3 text-white" style={{ backgroundColor: "#1f5c55" }}>
            <div
              className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold"
              style={{ background: PAPER, color: INK }}
            >
              {brand.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <b className="block text-[13.5px]">{brand}</b>
              <small data-status className="text-[11px] opacity-85">
                online
              </small>
            </div>
          </div>

          <div className="absolute inset-x-2 bottom-[60px] flex flex-col gap-1">
            <div
              data-out
              className="relative max-w-[82%] self-end rounded-lg bg-[#d7f7c9] px-2 pt-1.5 pb-3.5 text-[13px] leading-snug text-[#111b16]"
            >
              <span data-typed className="whitespace-pre-line" />
              <span className="absolute right-1.5 bottom-0.5 flex items-center gap-0.5 text-[10px] text-[#56645c]">
                <span>{time}</span>
                <span className="relative inline-block w-4 text-[11px]">
                  <span>✓✓</span>
                  <span data-blue className="absolute inset-0 text-[#2f8fd8]">
                    ✓✓
                  </span>
                </span>
              </span>
            </div>
            <div data-typing className="hidden gap-1 self-start rounded-lg bg-white px-3 py-2.5">
              <span data-dot className="h-1.5 w-1.5 rounded-full bg-[#9aa69f]" />
              <span data-dot className="h-1.5 w-1.5 rounded-full bg-[#9aa69f]" />
              <span data-dot className="h-1.5 w-1.5 rounded-full bg-[#9aa69f]" />
            </div>
            <div
              data-reply
              className="relative max-w-[82%] self-start rounded-lg bg-white px-2 pt-1.5 pb-3.5 text-[13px] leading-snug text-[#111b16]"
            >
              {reply}
              <span className="absolute right-1.5 bottom-0.5 text-[10px] text-[#56645c]">{time}</span>
            </div>
          </div>

          <div className="absolute inset-x-2 bottom-2 flex h-[42px] items-center rounded-3xl bg-white px-3.5 text-[13px] text-[#69736d]">
            Message
          </div>
        </div>

        <div
          data-cursor
          aria-hidden="true"
          className="absolute z-10 h-[22px] w-[22px] rounded-full border-2 bg-[#1a1916]/25"
          style={{ borderColor: INK }}
        />
      </div>
    </div>
  );
}
