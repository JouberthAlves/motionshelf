"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type AppointmentReminderProps = {
  /** Business name in the chat header. */
  business?: string;
  /** Customer first name. */
  name?: string;
  /** When the appointment is, e.g. "tomorrow". */
  day?: string;
  /** Time of the appointment. */
  time?: string;
  /** Color of the header and the button. */
  accent?: string;
  /** Replay forever with a pause between runs. */
  loop?: boolean;
  className?: string;
};

export default function AppointmentReminder({
  business = "Acme",
  name = "Sam",
  day = "tomorrow",
  time = "9:30 AM",
  accent = "#1f5bff",
  loop = true,
  className = "",
}: AppointmentReminderProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const screen = q("[data-screen]")[0] as HTMLElement;
      const confirm = q("[data-confirm]")[0] as HTMLElement;
      const cursor = q("[data-cursor]")[0];
      const m1 = q("[data-m1]")[0];
      const acts = q("[data-acts]")[0];
      const m2 = q("[data-m2]")[0];
      const m3 = q("[data-m3]")[0];

      // Centro do botão Confirmar, medido na tela (o cursor tem 22px). k desfaz a escala de quem
      // mostra o componente reduzido: o retângulo medido vem escalado, o left/top do cursor não.
      const aim = () => {
        const a = screen.getBoundingClientRect();
        const b = confirm.getBoundingClientRect();
        const k = a.width ? screen.offsetWidth / a.width : 1;
        return { x: (b.left - a.left + b.width / 2) * k - 11, y: (b.top - a.top + b.height / 2) * k - 11 };
      };

      const tl = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 1.4 });
      tl.set([m1, acts, m2, m3], { autoAlpha: 0, y: 12 })
        .set([m2, m3], { display: "none" })
        .set(acts, { clearProps: "height" })
        .set(cursor, { autoAlpha: 0, left: 180, top: 470 })
        .set(confirm, { backgroundColor: "#ffffff" })
        .to(m1, { autoAlpha: 1, y: 0, duration: 0.4, ease: "back.out(1.5)" }, 0.4)
        .to(acts, { autoAlpha: 1, y: 0, duration: 0.35 }, 0.8)
        .to(cursor, { autoAlpha: 1, duration: 0.2 }, 1.7)
        .to(cursor, { left: () => aim().x, top: () => aim().y, duration: 0.6, ease: "power2.inOut" }, 1.7)
        .to(cursor, { scale: 0.75, duration: 0.1, yoyo: true, repeat: 1 }, 2.35)
        .to(confirm, { backgroundColor: "#e3eefa", duration: 0.15 }, 2.4)
        .to(cursor, { autoAlpha: 0, duration: 0.25 }, 2.7)
        .to(acts, { autoAlpha: 0, height: 0, duration: 0.3 }, 2.8)
        .set(m2, { display: "block" }, 2.8)
        .to(m2, { autoAlpha: 1, y: 0, duration: 0.3 }, 2.8)
        .set(m3, { display: "block" }, 3.6)
        .to(m3, { autoAlpha: 1, y: 0, duration: 0.4, ease: "back.out(1.5)" }, 3.6)
        .to({}, { duration: 1.6 });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1).pause();
    },
    { scope: root, dependencies: [loop, name, day, time] },
  );

  const initials = business
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      ref={root}
      className={`relative h-[520px] w-[290px] shrink-0 overflow-hidden rounded-[34px] bg-neutral-950 p-[9px] shadow-2xl ${className}`}
    >
      <div data-screen className="relative h-full w-full overflow-hidden rounded-[26px] bg-[#efe7dd] text-[#111b16]">
        <div className="flex h-[54px] items-center gap-2.5 px-3 text-white" style={{ backgroundColor: accent }}>
          <div
            className="grid h-8 w-8 place-items-center rounded-full bg-white text-[13px] font-bold"
            style={{ color: accent }}
          >
            {initials}
          </div>
          <div>
            <b className="block text-[13.5px]">{business}</b>
            <small className="text-[11px] opacity-85">business account</small>
          </div>
        </div>

        <div className="absolute inset-x-2 bottom-[60px] flex flex-col gap-1">
          <div
            data-m1
            className="relative max-w-[84%] self-start rounded-lg bg-white px-2 pt-1.5 pb-3.5 text-[13px] leading-snug"
          >
            Hi {name}! Reminder: your appointment is {day} at {time}.
            <span className="absolute right-1.5 bottom-0.5 text-[10px] text-[#56645c]">9:00</span>
          </div>
          <div data-acts className="flex w-[84%] flex-col gap-1 self-start overflow-hidden">
            <span
              data-confirm
              className="rounded-lg bg-white py-2 text-center text-[13px] font-semibold shadow-sm"
              style={{ color: accent }}
            >
              Confirm
            </span>
            <span
              className="rounded-lg bg-white py-2 text-center text-[13px] font-semibold shadow-sm"
              style={{ color: accent }}
            >
              Reschedule
            </span>
          </div>
          <div
            data-m2
            className="relative max-w-[84%] self-end rounded-lg bg-[#d7f7c9] px-2 pt-1.5 pb-3.5 text-[13px]"
          >
            Confirm
            <span className="absolute right-1.5 bottom-0.5 text-[10px] text-[#56645c]">9:04 ✓✓</span>
          </div>
          <div
            data-m3
            className="relative max-w-[84%] self-start rounded-lg bg-white px-2 pt-1.5 pb-3.5 text-[13px] leading-snug"
          >
            Confirmed! See you {day} at {time}. Please arrive 10 minutes early.
            <span className="absolute right-1.5 bottom-0.5 text-[10px] text-[#56645c]">9:04</span>
          </div>
        </div>

        <div className="absolute inset-x-2 bottom-2 flex h-[42px] items-center rounded-3xl bg-white px-3.5 text-[13px] text-[#69736d]">
          Message
        </div>

        <div
          data-cursor
          aria-hidden="true"
          className="absolute z-10 h-[22px] w-[22px] rounded-full border-2 border-[#1a1916] bg-[#1a1916]/25"
        />
      </div>
    </div>
  );
}
