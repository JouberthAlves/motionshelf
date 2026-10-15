"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type SlotBookingProps = {
  /** Day heading. */
  day?: string;
  /** Time slots, in order. */
  slots?: string[];
  /** Indexes of the slots that are already taken. */
  busy?: number[];
  /** Index of the slot the pointer picks. */
  picked?: number;
  /** Label shown in the confirmation bar. */
  toast?: string;
  /** Color of the picked slot and the confirmation label. */
  accent?: string;
  /** Replay forever with a pause between runs. */
  loop?: boolean;
  className?: string;
};

export default function SlotBooking({
  day = "Saturday",
  slots = ["9:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"],
  busy = [0, 2, 3, 6, 8, 9],
  picked = 4,
  toast = "Booked",
  accent = "#1f5bff",
  loop = true,
  className = "",
}: SlotBookingProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current as HTMLElement;
      const q = gsap.utils.selector(root);
      const pick = q("[data-slot='pick']")[0] as HTMLElement;
      const fill = q("[data-fill]")[0];
      const pointer = q("[data-pointer]")[0];
      const bar = q("[data-toast]")[0];

      // Centro do horário escolhido, em relação à caixa do componente. k desfaz a escala de quem
      // mostra o componente reduzido: o retângulo medido vem escalado, o left/top do cursor não.
      const aim = () => {
        const a = el.getBoundingClientRect();
        const b = pick.getBoundingClientRect();
        const k = a.width ? el.offsetWidth / a.width : 1;
        return { x: (b.left - a.left + b.width / 2) * k - 10, y: (b.top - a.top + b.height / 2) * k - 10 };
      };

      const tl = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 1.4 });
      tl.set(fill, { scaleY: 0 })
        .set(bar, { autoAlpha: 0, y: 10 })
        .set(pointer, { left: 40, top: el.clientHeight * 0.72, autoAlpha: 1, scale: 1 })
        .to(pointer, { left: () => aim().x, top: () => aim().y, duration: 0.8, ease: "power2.inOut" }, 0.3)
        .to(pointer, { scale: 0.7, duration: 0.1, yoyo: true, repeat: 1 }, 1.15)
        .to(fill, { scaleY: 1, duration: 0.4, ease: "power2.out" }, 1.2)
        .to(pointer, { autoAlpha: 0, duration: 0.3 }, 1.5)
        .to(bar, { autoAlpha: 1, y: 0, duration: 0.35, ease: "back.out(1.6)" }, 1.6)
        .to({}, { duration: 1.8 });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1).pause();
    },
    { scope: root, dependencies: [loop, slots.join("|"), picked] },
  );

  return (
    <div
      ref={root}
      className={`relative w-full max-w-[520px] overflow-hidden rounded-xl bg-[#efe7dd] p-[26px] pb-[92px] text-[#1a1916] ${className}`}
    >
      <p className="text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase">{day}</p>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {slots.map((slot, i) => {
          const isBusy = busy.includes(i);
          const isPicked = i === picked;
          return (
            <div
              key={slot}
              data-slot={isPicked ? "pick" : undefined}
              className={`relative flex h-[52px] items-end overflow-hidden rounded-sm border-[1.5px] border-[#1a1916] p-1.5 text-xs font-semibold ${
                isBusy ? "bg-[#1a1916] text-[#ece6d8]" : "bg-transparent"
              }`}
            >
              {isPicked ? (
                <i data-fill aria-hidden="true" className="absolute inset-0 origin-bottom" style={{ backgroundColor: accent }} />
              ) : null}
              <span className="relative">{slot}</span>
            </div>
          );
        })}
      </div>

      <div
        data-pointer
        aria-hidden="true"
        className="absolute h-5 w-5 rounded-full border-2 border-[#1a1916] bg-[#1a1916]/20"
      />

      <div
        data-toast
        className="absolute inset-x-[26px] bottom-[18px] flex justify-between rounded-sm bg-[#1a1916] px-3 py-2.5 text-[13px] text-[#ece6d8]"
      >
        <span>
          {day} · {slots[picked]}
        </span>
        <b className="font-semibold" style={{ color: accent }}>
          {toast}
        </b>
      </div>
    </div>
  );
}
